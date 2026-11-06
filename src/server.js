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

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');

      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forceful shutdown executed due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.fatal('Uncaught Exception terdeteksi:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (err) => {
  logger.fatal('Unhandled Rejection terdeteksi:', err);
  gracefulShutdown('unhandledRejection');
});
