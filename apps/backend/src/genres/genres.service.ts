import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class GenresService {
  constructor(private readonly db: DbService) {}

  async getAll() {
    return this.db.query(
      `SELECT genre_id AS id, genre_name AS name FROM \`Genre\` ORDER BY genre_name`,
    );
  }
}
