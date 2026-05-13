import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { collectDefaultMetrics, register } from 'prom-client';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import aiRoutes from './routes/ai.routes';
import billingRoutes from './routes/billing.routes';
import userRoutes from './routes/user.routes';

const app = express();

// Prometheus metrics
collectDefaultMetrics();

// Security middleware
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', rateLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/billing', billingRoutes);

// Global error handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`🚀 DevAssist API running on port ${env.PORT}`);
});

export default app;
