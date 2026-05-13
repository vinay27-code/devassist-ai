import { Router } from 'express';
import { reviewCodeSnippet, generateDocs, chatWithProject, getSnippets, getChatHistory } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';
import { aiRateLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(authenticate);
router.use(aiRateLimiter);
router.post('/review', reviewCodeSnippet);
router.post('/docs', generateDocs);
router.post('/chat', chatWithProject);
router.get('/snippets/:projectId', getSnippets);
router.get('/chat/:projectId/history', getChatHistory);

export default router;
