import { Router } from 'express';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true });
router.use(authenticate);
router.get('/projects/:projectId/tasks', getTasks);
router.post('/projects/:projectId/tasks', createTask);
router.put('/tasks/:id', updateTask);
router.delete('/tasks/:id', deleteTask);

export default router;
