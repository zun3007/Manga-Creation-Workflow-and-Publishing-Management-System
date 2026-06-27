import { Module } from '@nestjs/common';
import { SeriesProposalsBoardController } from './series-proposale-board.controller';
import { SeriesProposalsController } from './series-proposals.controller';
import { SeriesProposalsService } from './series-proposals.service';

@Module({
  controllers: [
    SeriesProposalsController,
    SeriesProposalsBoardController,
  ],
  providers: [
    SeriesProposalsService,
  ],
})
export class SeriesProposalsModule {}