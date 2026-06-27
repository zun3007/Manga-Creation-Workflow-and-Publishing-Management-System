import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

export interface ITransactionContext {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  insert(sql: string, params?: any[]): Promise<number>;
}

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool!: mysql.Pool;
  private readonly logger = new Logger('DbService');

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.pool = mysql.createPool({
      host: this.config.get<string>('DB_HOST', '127.0.0.1'),
      port: Number(this.config.get<string>('DB_PORT', '3308')),
      user: this.config.get<string>('DB_USER', 'root'),
      password: this.config.get<string>('DB_PASSWORD', 'manga_root'),
      database: this.config.get<string>('DB_NAME'),
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
    });
    this.logger.log('MySQL pool created');
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const [rows] = await this.pool.query(sql, params);
    return rows as T[];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  async insert(sql: string, params: any[] = []): Promise<number> {
    const [result] = await this.pool.query(sql, params);
    return (result as any).insertId as number;
  }

  async transaction<T>(
    fn: (tx: ITransactionContext) => Promise<T>,
  ): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const tx: ITransactionContext = {
        query: async <U = any>(
          sql: string,
          params: any[] = [],
        ): Promise<U[]> => {
          const [rows] = await connection.query(sql, params);
          return rows as U[];
        },
        queryOne: async <U = any>(
          sql: string,
          params: any[] = [],
        ): Promise<U | null> => {
          const rows = await tx.query<U>(sql, params);
          return rows[0] ?? null;
        },
        insert: async (sql: string, params: any[] = []): Promise<number> => {
          const [result] = await connection.query(sql, params);
          return (result as any).insertId as number;
        },
      };
      const result = await fn(tx);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
