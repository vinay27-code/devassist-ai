import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      throw new AppError(400, 'Email, password, and full name are required');
    }
    if (password.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters');
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) throw new AppError(409, 'Email already registered');

    const password_hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, full_name, role, plan, created_at`,
      [email.toLowerCase(), password_hash, full_name]
    );

    const user = result.rows[0];
    const tokenPayload = { userId: user.id, email: user.email, role: user.role, plan: user.plan };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.status(201).json({
      success: true,
      data: { user, accessToken, refreshToken },
      message: 'Account created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError(400, 'Email and password are required');

    const result = await query(
      'SELECT id, email, password_hash, full_name, role, plan, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user || !user.is_active) throw new AppError(401, 'Invalid credentials');

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new AppError(401, 'Invalid credentials');

    const tokenPayload = { userId: user.id, email: user.email, role: user.role, plan: user.plan };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    const { password_hash, ...safeUser } = user;
    res.json({
      success: true,
      data: { user: safeUser, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new AppError(400, 'Refresh token required');

    const payload = verifyRefreshToken(token);

    const stored = await query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    if (!stored.rows.length) throw new AppError(401, 'Invalid or expired refresh token');

    // Rotate refresh token
    await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);

    const userResult = await query('SELECT role, plan FROM users WHERE id = $1', [payload.userId]);
    const user = userResult.rows[0];

    const newPayload = { userId: payload.userId, email: payload.email, role: user.role, plan: user.plan };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [payload.userId, newRefreshToken, expiresAt]
    );

    res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (token) await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await query(
      'SELECT id, email, full_name, role, plan, avatar_url, created_at FROM users WHERE id = $1',
      [req.user?.userId]
    );
    if (!result.rows.length) throw new AppError(404, 'User not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
