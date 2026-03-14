setImmediate(() => {
  const app = require('./src/app');
  const { config } = require('./src/config');
  const logger = require('./src/utils/logger');

  const startServer = async () => {
    try {
      if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set. Set it in backend/.env (not the .env in project root).');
        process.exit(1);
      }
      const { connectDatabase } = require('./src/db');
      await connectDatabase();
      logger.info('Database connected successfully');

      const server = app.listen(config.port, () => {
        logger.info(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
      });

      const gracefulShutdown = (signal) => {
        logger.info(`${signal} received. Starting graceful shutdown...`);
        server.close((err) => {
          if (err) {
            logger.error('Error during server shutdown:', err);
            process.exit(1);
          }
          logger.info('Server closed. Process terminating...');
          process.exit(0);
        });
        setTimeout(() => {
          logger.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 30000);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    } catch (error) {
      logger.error('Failed to start server:', error);
      console.error('Startup failed:', error.message);
      if (error.message && error.message.includes('connect')) {
        console.error('Check DATABASE_URL in backend/.env and that PostgreSQL is running.');
      }
      process.exit(1);
    }
  };

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  startServer().catch((err) => {
    console.error('Server failed to start:', err.message);
    process.exit(1);
  });
});
