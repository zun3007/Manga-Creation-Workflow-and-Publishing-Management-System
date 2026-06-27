import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { SubmissionsController } from './submissions.controller';

@Module({
  imports: [TasksModule],
  controllers: [SubmissionsController],
})
export class SubmissionsModule {}
