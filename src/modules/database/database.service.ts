import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  /**
   * We inject the PostgreSQL connection pool that was created
   * and registered in the DatabaseModule under the 'POSTGRES_CONNECTION' token.
   *
   * Why: This follows NestJS's Dependency Injection pattern —
   * we don't manually create or manage connections here,
   * so the service stays testable and decoupled.
   */
  constructor(@Inject('POSTGRES_CONNECTION') private readonly pool: Pool) {}

  /**
   * Tests the database connection when the module initializes.
   *
   * Why: Ensures the database is reachable on startup and provides
   *      immediate feedback about connection issues.
   */
  async onModuleInit() {
    try {
      await this.pool.query('SELECT 1');
      this.logger.log('✅ Database connection established successfully');
    } catch (error) {
      this.logger.error('❌ Database connection failed', error.message);
      throw error; // This will prevent the app from starting
    }
  }

  /**
   * A universal query method wrapping pool.query().
   *
   * Why: Keeps all raw SQL execution consistent in one place.
   *      Other modules call this service instead of using 'pg' directly.
   *      This allows you to later add Prisma, logging, caching,
   *      or query tracing without touching other parts of your app.
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    this.logger.debug(`Running query: ${text}`);

    try {
      const result: QueryResult = await this.pool.query(text, params);
      return result.rows;
    } catch (error) {
      this.logger.error(`Database query failed: ${error.message}`);
      throw error; // Why: Bubble up errors so calling services can handle them properly
    }
  }

  /**
   * Gracefully closes the connection pool when the NestJS app shuts down.
   *
   * Why: Prevents memory leaks and dangling DB connections,
   *      especially in long-running or serverless environments.
   */
  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Database connection pool closed.');
  }

  /**
   * Optional: A simple method to check database connectivity.
   *
   * Why: Useful for health checks or readiness probes in production (e.g. Kubernetes).
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error.stack);
      return false;
    }
  }
}
