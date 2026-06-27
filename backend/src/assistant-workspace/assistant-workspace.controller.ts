import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AssistantWorkspaceService } from './assistant-workspace.service';

@Controller('assistant-workspace')
export class AssistantWorkspaceController {
  constructor(
    private readonly assistantWorkspaceService: AssistantWorkspaceService,
  ) {}

  @Get(':assistantUserId')
  getWorkspace(
    @Param('assistantUserId', ParseIntPipe) assistantUserId: number,
  ) {
    return this.assistantWorkspaceService.getWorkspace(assistantUserId);
  }
}
