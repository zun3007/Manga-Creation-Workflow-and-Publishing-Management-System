import { Module } from '@nestjs/common';
import { StudioNotificationsModule } from '../studio-notifications/studio-notifications.module';
import { StudioAssetsController } from './studio-assets.controller';
import { StudioAssetsService } from './studio-assets.service';

@Module({
  imports: [StudioNotificationsModule],
  controllers: [StudioAssetsController],
  providers: [StudioAssetsService],
})
export class StudioAssetsModule {}