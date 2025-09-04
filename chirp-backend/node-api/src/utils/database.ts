import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Create a singleton Prisma client instance
class DatabaseService {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new PrismaClient({
        log: [
          {
            emit: 'event',
            level: 'query',
          },
          {
            emit: 'event',
            level: 'error',
          },
          {
            emit: 'event',
            level: 'info',
          },
          {
            emit: 'event',
            level: 'warn',
          },
        ],
      });

      // Log database queries in development
      if (process.env.NODE_ENV === 'development') {
        (DatabaseService.instance as any).$on('query', (e) => {
          logger.debug(`Query: ${e.query}`);
          logger.debug(`Params: ${e.params}`);
          logger.debug(`Duration: ${e.duration}ms`);
        });
      }

      (DatabaseService.instance as any).$on('error', (e) => {
        logger.error('Database error:', e);
      });

      (DatabaseService.instance as any).$on('info', (e) => {
        logger.info('Database info:', e.message);
      });

      (DatabaseService.instance as any).$on('warn', (e) => {
        logger.warn('Database warning:', e.message);
      });
    }

    return DatabaseService.instance;
  }

  static async disconnect(): Promise<void> {
    if (DatabaseService.instance) {
      await DatabaseService.instance.$disconnect();
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      await DatabaseService.getInstance().$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

export const db = DatabaseService.getInstance();
export { DatabaseService };