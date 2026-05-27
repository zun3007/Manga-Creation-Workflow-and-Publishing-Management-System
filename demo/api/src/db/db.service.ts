import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool: mysql.Pool;
  private readonly logger = new Logger('DbService');

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.pool = mysql.createPool({
      host: this.config.get<string>('DB_HOST', '127.0.0.1'),
      port: Number(this.config.get<string>('DB_PORT', '3307')),
      user: this.config.get<string>('DB_USER', 'root'),
      password: this.config.get<string>('DB_PASSWORD', 'inkframe_root'),
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

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
