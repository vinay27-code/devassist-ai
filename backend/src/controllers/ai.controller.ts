import { Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  reviewCode,
  generateDocumentation,
  storeSnippetWithEmbedding,
  chatWithCodebase,
} from '../services/ai.service';

const FREE_PLAN_DAILY_LIMIT = 10;

async function checkAndTrackUsage(userId: string, action: string): Promise<void> {
  // Count today's AI actions
  const usageResult = await query(
    `SELECT COUNT(*) as count FROM ai_usage 
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [userId]
  );
  const count = parseInt(usageResult.rows[0].count);

  // Get user plan
  const userResult = await query('SELECT plan FROM users WHERE id = $1', [userId]);
  const plan = userResult.rows[0]?.plan;

  if (plan === 'free' && count >= FREE_PLAN_DAILY_LIMIT) {
    throw new AppError(429, `Daily AI limit reached (${FREE_PLAN_DAILY_LIMIT} actions). Upgrade to Pro for unlimited access.`);
  }

  await query('INSERT INTO ai_usage (user_id, action) VALUES ($1, $2)', [userId, action]);
}

export const reviewCodeSnippet = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, language = 'javascript', title, project_id } = req.body;
    if (!code) throw new AppError(400, 'Code is required');

    await checkAndTrackUsage(req.user!.userId, 'code_review');

    // Save snippet first
    const snippetResult = await query(
      `INSERT INTO code_snippets (project_id, user_id, title, code, language)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [project_id, req.user?.userId, title || 'Code Review', code, language]
    );
    const snippetId = snippetResult.rows[0].id;

    // Run AI review + store embedding in parallel
    const [review] = await Promise.all([
      reviewCode(code, language),
      storeSnippetWithEmbedding(snippetId, code, title || 'Code Review'),
    ]);

    // Save review result
    await query('UPDATE code_snippets SET ai_review = $1 WHERE id = $2', [review, snippetId]);

    res.json({ success: true, data: { snippetId, review } });
  } catch (err) { next(err); }
};

export const generateDocs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, language = 'javascript', snippet_id } = req.body;
    if (!code) throw new AppError(400, 'Code is required');

    await checkAndTrackUsage(req.user!.userId, 'generate_docs');

    const documentation = await generateDocumentation(code, language);

    if (snippet_id) {
      await query('UPDATE code_snippets SET ai_documentation = $1 WHERE id = $2 AND user_id = $3',
        [documentation, snippet_id, req.user?.userId]);
    }

    res.json({ success: true, data: { documentation } });
  } catch (err) { next(err); }
};

export const chatWithProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { project_id, message } = req.body;
    if (!project_id || !message) throw new AppError(400, 'project_id and message are required');

    await checkAndTrackUsage(req.user!.userId, 'chat');

    // Get conversation history (last 10 messages)
    const historyResult = await query(
      `SELECT role, content FROM ai_conversations
       WHERE project_id = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 10`,
      [project_id, req.user?.userId]
    );
    const history = historyResult.rows.reverse();

    const assistantReply = await chatWithCodebase(project_id, message, history);

    // Save both messages
    await query(
      'INSERT INTO ai_conversations (project_id, user_id, role, content) VALUES ($1, $2, $3, $4), ($1, $2, $5, $6)',
      [project_id, req.user?.userId, 'user', message, 'assistant', assistantReply]
    );

    res.json({ success: true, data: { reply: assistantReply } });
  } catch (err) { next(err); }
};

export const getSnippets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, title, language, code, ai_review, ai_documentation, created_at
       FROM code_snippets WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [req.params.projectId, req.user?.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

export const getChatHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await query(
      `SELECT role, content, created_at FROM ai_conversations
       WHERE project_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
      [req.params.projectId, req.user?.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};
