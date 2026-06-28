import { Module } from '@nestjs/common';
import { PublicationScheduleController } from './publication-schedule.controller';
import { PublicationScheduleService } from './publication-schedule.service';

@Module({
  controllers: [PublicationScheduleController],
  providers: [PublicationScheduleService],
})
export class PublicationScheduleModule {}
