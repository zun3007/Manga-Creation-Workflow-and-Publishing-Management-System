import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardVoteStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardVoteDto } from './dto/create-board-vote.dto';
import { StudioNotificationsService } from '../studio-notifications/studio-notifications.service';

type ProposalRow = {
  proposal_id: number;
  mangaka_user_id: number;
  title: string;
  synopsis: string;
  proposed_status: string;
  proposed_frequency: string;
};

@Injectable()
export class BoardRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studioNotificationsService: StudioNotificationsService,
  ) {}

  async findRanking() {
    const proposals = await this.prisma.seriesProposal.findMany({
      where: {
        proposedStatus: 'SUBMITTED',
      },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
        boardVotes: {
          include: {
            boardUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return proposals
      .map((proposal) => {
        const votes = proposal.boardVotes;

        const averageScore =
          votes.length > 0
            ? votes.reduce(
                (total, vote) => total + Number(vote.finalScore),
                0,
              ) / votes.length
            : null;

        const rankingScore =
          averageScore !== null
            ? Math.round(averageScore * 10)
            : this.calculateAutoScore(proposal);

        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        let recommendation = 'Strong candidate for board discussion.';

        if (rankingScore < 45) {
          riskLevel = 'HIGH';
          recommendation = 'Needs more detail before approval.';
        } else if (rankingScore < 65) {
          riskLevel = 'MEDIUM';
          recommendation = 'Potential idea, but should be reviewed carefully.';
        }

        return {
          ...proposal,
          averageVoteScore:
            averageScore !== null ? Number(averageScore.toFixed(1)) : null,
          rankingScore,
          riskLevel,
          recommendation,
          voteCount: votes.length,
        };
      })
      .sort((a, b) => b.rankingScore - a.rankingScore);
  }

  async submitVote(boardUserId: number, dto: CreateBoardVoteDto) {
    const artQuality = this.validateScore(dto.artQuality, 'Art quality');
    const storyClarity = this.validateScore(dto.storyClarity, 'Story clarity');
    const marketPotential = this.validateScore(
      dto.marketPotential,
      'Market potential',
    );

    const proposal = await this.prisma.seriesProposal.findUnique({
      where: {
        id: dto.proposalId,
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const finalScore = Number(
      ((artQuality + storyClarity + marketPotential) / 3).toFixed(1),
    );

    let status: BoardVoteStatus = BoardVoteStatus.REVIEWED;

    if (finalScore < 6.5) {
      status = BoardVoteStatus.REVISED;
    }

    return this.prisma.boardVote.upsert({
      where: {
        proposalId_boardUserId: {
          proposalId: dto.proposalId,
          boardUserId,
        },
      },
      update: {
        artQuality,
        storyClarity,
        marketPotential,
        finalScore,
        comment: dto.comment?.trim() || null,
        status,
      },
      create: {
        proposalId: dto.proposalId,
        boardUserId,
        artQuality,
        storyClarity,
        marketPotential,
        finalScore,
        comment: dto.comment?.trim() || null,
        status,
      },
      include: {
        boardUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        proposal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async approveProposal(proposalId: number) {
    const proposals = await this.prisma.$queryRaw<ProposalRow[]>`
      SELECT 
        proposal_id,
        mangaka_user_id,
        title,
        synopsis,
        proposed_status,
        proposed_frequency
      FROM series_proposals
      WHERE proposal_id = ${proposalId}
      LIMIT 1
    `;

    const proposal = proposals[0];

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.proposed_status === 'REJECTED') {
      throw new BadRequestException('Rejected proposal cannot be approved');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE series_proposals
        SET proposed_status = 'APPROVED',
            updated_at = NOW(3)
        WHERE proposal_id = ${proposalId}
      `;

      await tx.$executeRaw`
        INSERT INTO series (
          proposal_id,
          mangaka_user_id,
          title,
          publication_frequency,
          series_status,
          created_at,
          updated_at
        )
        VALUES (
          ${proposal.proposal_id},
          ${proposal.mangaka_user_id},
          ${proposal.title},
          ${proposal.proposed_frequency},
          'ACTIVE',
          NOW(3),
          NOW(3)
        )
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          publication_frequency = VALUES(publication_frequency),
          series_status = 'ACTIVE',
          updated_at = NOW(3)
      `;

      const series = await tx.$queryRaw`
        SELECT *
        FROM series
        WHERE proposal_id = ${proposalId}
        LIMIT 1
      `;

      await this.studioNotificationsService.createNotification({
        userId: proposal.mangaka_user_id,
        title: 'Proposal approved',
        message: `${proposal.title} has been approved and converted into an active series.`,
        type: 'APPROVAL',
      });

      return {
        message: 'Proposal approved and series created successfully',
        proposalId,
        series,
      };
    });
  }

  async rejectProposal(proposalId: number) {
    const proposals = await this.prisma.$queryRaw<ProposalRow[]>`
    SELECT 
      proposal_id,
      mangaka_user_id,
      title,
      synopsis,
      proposed_status,
      proposed_frequency
    FROM series_proposals
    WHERE proposal_id = ${proposalId}
    LIMIT 1
  `;

    const proposal = proposals[0];

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.proposed_status === 'APPROVED') {
      throw new BadRequestException('Approved proposal cannot be rejected');
    }

    await this.prisma.$executeRaw`
    UPDATE series_proposals
    SET proposed_status = 'REJECTED',
        updated_at = NOW(3)
    WHERE proposal_id = ${proposalId}
  `;

    await this.studioNotificationsService.createNotification({
      userId: proposal.mangaka_user_id,
      title: 'Proposal rejected',
      message: `${proposal.title} has been rejected. Please review the feedback and resubmit later.`,
      type: 'REJECTED',
    });

    return {
      message: 'Proposal rejected successfully',
      proposalId,
    };
  }

  private validateScore(value: number, label: string) {
    const score = Number(value);

    if (Number.isNaN(score) || score < 1 || score > 10) {
      throw new BadRequestException(`${label} must be between 1 and 10`);
    }

    return Number(score.toFixed(1));
  }

  private calculateAutoScore(proposal: {
    synopsis: string | null;
    proposedFrequency: string;
    proposedStatus: string;
    genres?: unknown[];
  }) {
    const genreScore = Math.min(proposal.genres?.length ?? 0, 3) * 10;

    const synopsisScore =
      Math.min(Math.floor((proposal.synopsis?.length ?? 0) / 80), 4) * 10;

    const frequencyScore =
      proposal.proposedFrequency === 'WEEKLY'
        ? 20
        : proposal.proposedFrequency === 'MONTHLY'
          ? 14
          : 10;

    const statusScore = proposal.proposedStatus === 'SUBMITTED' ? 20 : 8;

    return genreScore + synopsisScore + frequencyScore + statusScore;
  }
}
