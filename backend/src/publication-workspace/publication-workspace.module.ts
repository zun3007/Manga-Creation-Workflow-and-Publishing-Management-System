import { Module } from '@nestjs/common';
import { PublicationWorkspaceController } from './publication-workspace.controller';
import { PublicationWorkspaceService } from './publication-workspace.service';

@Module({
  controllers: [PublicationWorkspaceController],
  providers: [PublicationWorkspaceService],
})
export class PublicationWorkspaceModule {}
