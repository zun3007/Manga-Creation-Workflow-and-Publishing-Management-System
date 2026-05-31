import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
