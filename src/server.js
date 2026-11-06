import 'dotenv/config';
import app from './app.js';
import prisma from './config/database.js';
import { logger } from './config/logger.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(
    `Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`,
  );
});

let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    logger.warn(`Received ${signal} again. Forcing immediate shutdown.`);
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  const forceTimeout = setTimeout(() => {
    logger.error('Forceful shutdown executed due to timeout.');
    process.exit(1);
  }, 10000);

  forceTimeout.unref();

  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }

  server.close(async (err) => {
    if (err) {
      logger.error(err, 'Error closing HTTP server');
      process.exit(1);
    }

    logger.info('HTTP server closed.');

    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      clearTimeout(forceTimeout);
      process.exit(0);
    } catch (disconnectErr) {
      logger.error(disconnectErr, 'Error during database disconnect');
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.fatal(err, 'Uncaught Exception terdeteksi');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (err) => {
  logger.fatal(err, 'Unhandled Rejection terdeteksi');
  gracefulShutdown('unhandledRejection');
});
