import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';

@Module({
  imports: [DbModule],
  controllers: [StudioController],
  providers: [StudioService],
})
export class StudioModule {}
