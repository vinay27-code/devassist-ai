import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.put('/profile', async (req: AuthRequest, res, next) => {
  try {
    const { full_name, avatar_url } = req.body;
    const result = await query(
      `UPDATE users SET full_name = COALESCE($1, full_name), avatar_url = COALESCE($2, avatar_url)
       WHERE id = $3 RETURNING id, email, full_name, role, plan, avatar_url`,
      [full_name, avatar_url, req.user?.userId]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

export default router;
