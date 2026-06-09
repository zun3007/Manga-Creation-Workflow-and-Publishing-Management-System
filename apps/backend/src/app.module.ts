import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { MailModule } from './mail/mail.module';
import { StorageModule } from './s3/storage.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SeedModule } from './seed/seed.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProposalsModule } from './proposals/proposals.module';
import { GenresModule } from './genres/genres.module';
import { SeriesModule } from './series/series.module';
import { ChaptersModule } from './chapters/chapters.module';
import { PagesModule } from './pages/pages.module';
import { RegionsModule } from './regions/regions.module';
import { TasksModule } from './tasks/tasks.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { StudioModule } from './studio/studio.module';
import { AdminModule } from './admin/admin.module';
import { RankingsModule } from './rankings/rankings.module';
import { DecisionsModule } from './decisions/decisions.module';
import { AnnotationsModule } from './annotations/annotations.module';
import { EarningsModule } from './earnings/earnings.module';
import { DisputesModule } from './disputes/disputes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    StorageModule,
    DbModule,
    MailModule,
    AuthModule,
    UsersModule,
    SeedModule,
    DashboardModule,
    UploadsModule,
    NotificationsModule,
    ProposalsModule,
    GenresModule,
    SeriesModule,
    ChaptersModule,
    PagesModule,
    RegionsModule,
    TasksModule,
    SubmissionsModule,
    StudioModule,
    AdminModule,
    RankingsModule,
    DecisionsModule,
    AnnotationsModule,
    EarningsModule,
    DisputesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
