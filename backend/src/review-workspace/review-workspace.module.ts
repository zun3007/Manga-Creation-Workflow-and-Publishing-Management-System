import { Module } from '@nestjs/common';
import { ReviewWorkspaceController } from './review-workspace.controller';
import { ReviewWorkspaceService } from './review-workspace.service';

@Module({
  controllers: [ReviewWorkspaceController],
  providers: [ReviewWorkspaceService],
})
export class ReviewWorkspaceModule {}
