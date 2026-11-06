import express from 'express';
import { httpLogger } from './config/logger.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(httpLogger);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is healthy',
  });
});

// Routes

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global Exception Handler Middleware
app.use(errorHandler);

export default app;
