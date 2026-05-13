import { Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId } = req.params;
    const result = await query(
      `SELECT t.* FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.project_id = $1 AND p.user_id = $2
       ORDER BY t.status, t.position`,
      [projectId, req.user?.userId]
    );
    // Group by status for Kanban
    const kanban = {
      todo: result.rows.filter(t => t.status === 'todo'),
      in_progress: result.rows.filter(t => t.status === 'in_progress'),
      review: result.rows.filter(t => t.status === 'review'),
      done: result.rows.filter(t => t.status === 'done'),
    };
    res.json({ success: true, data: kanban });
  } catch (err) { next(err); }
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { title, description, priority, due_date, status = 'todo' } = req.body;
    if (!title) throw new AppError(400, 'Task title is required');

    // Get next position in column
    const posResult = await query(
      'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM tasks WHERE project_id = $1 AND status = $2',
      [projectId, status]
    );
    const position = posResult.rows[0].next_pos;

    const result = await query(
      `INSERT INTO tasks (project_id, user_id, title, description, priority, due_date, status, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [projectId, req.user?.userId, title, description, priority || 'medium', due_date, status, position]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, status, priority, position, due_date } = req.body;
    const result = await query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        position = COALESCE($5, position),
        due_date = COALESCE($6, due_date)
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [title, description, status, priority, position, due_date, req.params.id, req.user?.userId]
    );
    if (!result.rows.length) throw new AppError(404, 'Task not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user?.userId]
    );
    if (!result.rows.length) throw new AppError(404, 'Task not found');
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
};
