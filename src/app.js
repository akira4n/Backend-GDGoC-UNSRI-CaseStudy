import express from 'express';
import { httpLogger } from './config/logger.js';
import { errorHandler } from './middlewares/error.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import userRoutes from './modules/users/user.routes.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(httpLogger);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is healthy.',
  });
});

// API v1 Routes
const v1Router = express.Router();
v1Router.use('/auth', authRoutes);
v1Router.use('/audit-logs', auditRoutes);
v1Router.use('/users', userRoutes);

app.use('/api/v1', v1Router);

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
});

// Global Exception Handler Middleware
app.use(errorHandler);

export default app;
