import { Injectable } from '@nestjs/common';
import { UserRole } from '../generated/prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

type DashboardCard = {
  label: string;
  value: string;
  note: string;
  icon: string;
};

type DashboardAction = {
  label: string;
  description: string;
  path: string;
  icon: string;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(user: AuthenticatedUser) {
    switch (user.role) {
      case UserRole.MANGAKA:
        return this.getMangakaOverview(user.sub);

      case UserRole.ASSISTANT:
        return this.getAssistantOverview(user.sub);

      case UserRole.EDITORIAL_BOARD:
        return this.getBoardOverview();

      case UserRole.ADMIN:
        return this.getAdminOverview();

      default:
        return this.getDefaultOverview(user.role);
    }
  }

  private async getMangakaOverview(userId: number) {
    const [proposalCount, seriesCount, taskCount, regionCount] =
      await Promise.all([
        this.prisma.seriesProposal.count({
          where: {
            mangakaUserId: userId,
          },
        }),

        this.prisma.series.count({
          where: {
            mangakaUserId: userId,
          },
        }),

        this.prisma.task.count({
          where: {
            assignorUserId: userId,
          },
        }),

        this.prisma.region.count({
          where: {
            page: {
              chapter: {
                series: {
                  mangakaUserId: userId,
                },
              },
            },
          },
        }),
      ]);

    const cards: DashboardCard[] = [
      {
        label: 'Proposals',
        value: this.formatNumber(proposalCount),
        note: 'Manga ideas created by you',
        icon: '📝',
      },
      {
        label: 'Active Series',
        value: this.formatNumber(seriesCount),
        note: 'Series currently in production',
        icon: '📚',
      },
      {
        label: 'Page Regions',
        value: this.formatNumber(regionCount),
        note: 'Marked areas prepared for assistants',
        icon: '🖼️',
      },
      {
        label: 'Tasks Created',
        value: this.formatNumber(taskCount),
        note: 'Assistant assignments created by you',
        icon: '✅',
      },
    ];

    const actions: DashboardAction[] = [
      {
        label: 'Create Proposal',
        description: 'Submit a new manga idea for board review.',
        path: '/mangaka/proposals',
        icon: '📝',
      },
      {
        label: 'Manage Series',
        description: 'Open approved series and manage chapters.',
        path: '/mangaka/series',
        icon: '📚',
      },
      {
        label: 'Page Workspace',
        description: 'Draw, save versions and mark page regions.',
        path: '/mangaka/pages',
        icon: '🎨',
      },
    ];

    return {
      role: UserRole.MANGAKA,
      title: 'Studio Overview',
      subtitle:
        'Manage proposals, series, chapters, page regions and assistant tasks in one professional workflow.',
      cards,
      actions,
      progress: [
        {
          label: 'Proposal planning',
          value: 72,
        },
        {
          label: 'Series production',
          value: 58,
        },
        {
          label: 'Assistant task flow',
          value: 41,
        },
      ],
      flow: this.getProductionFlow(),
    };
  }

  private async getAssistantOverview(userId: number) {
    const assignedTaskCount = await this.prisma.task.count({
      where: {
        assigneeUserId: userId,
      },
    });

    const cards: DashboardCard[] = [
      {
        label: 'Assigned Tasks',
        value: this.formatNumber(assignedTaskCount),
        note: 'Tasks assigned to you',
        icon: '✅',
      },
      {
        label: 'In Progress',
        value: '—',
        note: 'Accepted work in progress',
        icon: '✍️',
      },
      {
        label: 'Submitted',
        value: '—',
        note: 'Waiting for editor review',
        icon: '📮',
      },
      {
        label: 'Earnings',
        value: '—',
        note: 'Estimated assistant earnings',
        icon: '💰',
      },
    ];

    const actions: DashboardAction[] = [
      {
        label: 'View Tasks',
        description: 'Open your assigned assistant tasks.',
        path: '/assistant/tasks',
        icon: '✅',
      },
    ];

    return {
      role: UserRole.ASSISTANT,
      title: 'Assistant Workspace',
      subtitle:
        'Track assigned tasks, open drawing workspace and submit completed page work.',
      cards,
      actions,
      progress: [
        {
          label: 'Accepted tasks',
          value: 35,
        },
        {
          label: 'Submitted work',
          value: 55,
        },
        {
          label: 'Reviewed submissions',
          value: 20,
        },
      ],
      flow: this.getProductionFlow(),
    };
  }

  private async getBoardOverview() {
    const proposalCount = await this.prisma.seriesProposal.count();

    const cards: DashboardCard[] = [
      {
        label: 'Total Proposals',
        value: this.formatNumber(proposalCount),
        note: 'All submitted manga proposals',
        icon: '🏛️',
      },
      {
        label: 'Pending Review',
        value: '—',
        note: 'Need board decision',
        icon: '🕒',
      },
      {
        label: 'Approved',
        value: '—',
        note: 'Approved proposals',
        icon: '🌱',
      },
      {
        label: 'Rejected',
        value: '—',
        note: 'Rejected proposals',
        icon: '⚠️',
      },
    ];

    const actions: DashboardAction[] = [
      {
        label: 'Open Board Review',
        description: 'Review pending manga proposals.',
        path: '/board/proposals',
        icon: '🏛️',
      },
    ];

    return {
      role: UserRole.EDITORIAL_BOARD,
      title: 'Board Review Center',
      subtitle:
        'Review submitted proposals and make publishing decisions for new manga series.',
      cards,
      actions,
      progress: [
        {
          label: 'Proposal review',
          value: 64,
        },
        {
          label: 'Decision queue',
          value: 46,
        },
        {
          label: 'Voting progress',
          value: 30,
        },
      ],
      flow: this.getProductionFlow(),
    };
  }

  private async getAdminOverview() {
    const userCount = await this.prisma.user.count();

    const cards: DashboardCard[] = [
      {
        label: 'Users',
        value: this.formatNumber(userCount),
        note: 'Accounts managed by admin',
        icon: '👥',
      },
      {
        label: 'Roles',
        value: '05',
        note: 'System role groups',
        icon: '🔐',
      },
      {
        label: 'Price Rules',
        value: '—',
        note: 'Task pricing rules',
        icon: '💰',
      },
      {
        label: 'Audit Logs',
        value: '—',
        note: 'Recent system actions',
        icon: '📜',
      },
    ];

    const actions: DashboardAction[] = [
      {
        label: 'User Management',
        description: 'Create and manage system accounts.',
        path: '/admin/users',
        icon: '👥',
      },
    ];

    return {
      role: UserRole.ADMIN,
      title: 'Admin Dashboard',
      subtitle:
        'Manage system users, role access, pricing rules and audit activities.',
      cards,
      actions,
      progress: [
        {
          label: 'User setup',
          value: 80,
        },
        {
          label: 'Configuration',
          value: 45,
        },
        {
          label: 'Audit readiness',
          value: 20,
        },
      ],
      flow: this.getProductionFlow(),
    };
  }

  private getDefaultOverview(role: UserRole) {
    return {
      role,
      title: 'MangaFlow Overview',
      subtitle: 'Welcome to MangaFlow Forest Studio.',
      cards: [],
      actions: [],
      progress: [],
      flow: this.getProductionFlow(),
    };
  }

  private getProductionFlow() {
    return [
      {
        order: '01',
        label: 'Proposal',
        description: 'Create and submit manga proposal for board review.',
      },
      {
        order: '02',
        label: 'Series',
        description: 'Manage approved series and create chapters.',
      },
      {
        order: '03',
        label: 'Page Region',
        description: 'Draw pages, mark regions and assign work to assistants.',
      },
      {
        order: '04',
        label: 'Review',
        description: 'Review submissions and save final publishable version.',
      },
    ];
  }

  private formatNumber(value: number) {
    return value.toString().padStart(2, '0');
  }
}
