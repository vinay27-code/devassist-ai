import { Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

export const getProjects = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await query(
      `SELECT p.*, COUNT(t.id)::int as task_count
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.user?.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

export const getProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user?.userId]
    );
    if (!result.rows.length) throw new AppError(404, 'Project not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

export const createProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name) throw new AppError(400, 'Project name is required');

    const result = await query(
      `INSERT INTO projects (user_id, name, description) 
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user?.userId, name, description]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

export const updateProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, status } = req.body;
    const result = await query(
      `UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description),
       status = COALESCE($3, status) WHERE id = $4 AND user_id = $5 RETURNING *`,
      [name, description, status, req.params.id, req.user?.userId]
    );
    if (!result.rows.length) throw new AppError(404, 'Project not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

export const deleteProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user?.userId]
    );
    if (!result.rows.length) throw new AppError(404, 'Project not found');
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
};
