import { Module } from '@nestjs/common';
import { StudioNotificationsModule } from '../studio-notifications/studio-notifications.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [StudioNotificationsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
