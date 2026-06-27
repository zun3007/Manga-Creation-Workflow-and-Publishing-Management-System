import { Module } from '@nestjs/common';
import { PublicationWorkspaceModule } from './publication-workspace/publication-workspace.module';
import { ReviewWorkspaceModule } from './review-workspace/review-workspace.module';
import { AssistantWorkspaceModule } from './assistant-workspace/assistant-workspace.module';
import { EarningsModule } from './earnings/earnings.module';
import { DevModule } from './dev/dev.module';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SeriesProposalsModule } from './series-proposals/series-proposals.module';
import { UsersModule } from './users/users.module';
import { ChaptersModule } from './chapters/chapters.module';
import { PagesModule } from './pages/pages.module';
import { RegionsModule } from './regions/regions.module';
import { TasksModule } from './tasks/tasks.module';
import { MailModule } from './mail/mail.module';
import { SeriesModule } from './series/series.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BoardModule } from './board/board.module';
import { StudioAssetsModule } from './studio-assets/studio-assets.module';
import { StudioNotificationsModule } from './studio-notifications/studio-notifications.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ProfileModule } from './profile/profile.module';



@Module({
  imports: [
    PublicationWorkspaceModule,
    ReviewWorkspaceModule,
    AssistantWorkspaceModule,
    EarningsModule,
    DevModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    SeriesProposalsModule,
    ChaptersModule,
    PagesModule,
    RegionsModule,
    TasksModule,
    MailModule,
    SeriesModule,
    DashboardModule,
    BoardModule,
    StudioAssetsModule,
    StudioNotificationsModule,
    SubmissionsModule,
    ProfileModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}