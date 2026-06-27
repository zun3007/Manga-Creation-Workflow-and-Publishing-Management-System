import { Module } from '@nestjs/common';
import { StudioNotificationsModule } from '../studio-notifications/studio-notifications.module';
import { BoardRankingController } from './board-ranking.controller';
import { BoardRankingService } from './board-ranking.service';

@Module({
  imports: [StudioNotificationsModule],
  controllers: [BoardRankingController],
  providers: [BoardRankingService],
})
export class BoardModule {}
