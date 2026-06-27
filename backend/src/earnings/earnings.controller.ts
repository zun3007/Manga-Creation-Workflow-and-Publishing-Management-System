import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { EarningsService } from './earnings.service';

@Controller('earnings')
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get('assistant/:assistantUserId')
  findAssistantEarnings(
    @Param('assistantUserId', ParseIntPipe) assistantUserId: number,
  ) {
    return this.earningsService.findAssistantEarnings(assistantUserId);
  }

  @Get('assistant/:assistantUserId/summary')
  getAssistantSummary(
    @Param('assistantUserId', ParseIntPipe) assistantUserId: number,
  ) {
    return this.earningsService.getAssistantSummary(assistantUserId);
  }
}
