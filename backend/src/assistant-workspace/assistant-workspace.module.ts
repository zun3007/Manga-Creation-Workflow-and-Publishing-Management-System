import { Module } from '@nestjs/common';
import { AssistantWorkspaceController } from './assistant-workspace.controller';
import { AssistantWorkspaceService } from './assistant-workspace.service';

@Module({
  controllers: [AssistantWorkspaceController],
  providers: [AssistantWorkspaceService],
})
export class AssistantWorkspaceModule {}
