import { Module } from '@nestjs/common';
import { StudioNotificationsController } from './studio-notifications.controller';
import { StudioNotificationsService } from './studio-notifications.service';

@Module({
  controllers: [StudioNotificationsController],
  providers: [StudioNotificationsService],
  exports: [StudioNotificationsService],
})
export class StudioNotificationsModule {}
