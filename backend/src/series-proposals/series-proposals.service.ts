import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProposalStatus, SeriesStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeriesProposalDto } from './dto/create-series-proposal.dto';

@Injectable()
export class SeriesProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(mangakaUserId: number, dto: CreateSeriesProposalDto) {
    return this.prisma.seriesProposal.create({
      data: {
        mangakaUserId,
        title: dto.title,
        synopsis: dto.synopsis,
        proposedFrequency: dto.proposedFrequency,
        genres: dto.genreIds?.length
          ? {
              create: dto.genreIds.map((genreId: number) => ({
                genre: {
                  connect: { id: genreId },
                },
              })),
            }
          : undefined,
      },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
    });
  }

  async findMine(mangakaUserId: number) {
    return this.prisma.seriesProposal.findMany({
      where: {
        mangakaUserId,
      },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneForMangaka(id: number, mangakaUserId: number) {
    const proposal = await this.prisma.seriesProposal.findUnique({
      where: { id },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException(
        'You do not have permission to view this proposal',
      );
    }

    return proposal;
  }

  async submit(mangakaUserId: number, proposalId: number) {
    const proposal = await this.prisma.seriesProposal.findFirst({
      where: {
        id: proposalId,
        mangakaUserId,
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (
      proposal.proposedStatus !== 'DRAFT' &&
      proposal.proposedStatus !== 'REJECTED'
    ) {
      throw new BadRequestException(
        'Only draft or rejected proposals can be submitted',
      );
    }

    return this.prisma.seriesProposal.update({
      where: {
        id: proposalId,
      },
      data: {
        proposedStatus: 'SUBMITTED',
        submittedAt: new Date(),
        reviewDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
    });
  }

  async findPendingForBoard() {
    return this.prisma.seriesProposal.findMany({
      where: {
        proposedStatus: ProposalStatus.SUBMITTED,
      },
      include: {
        mangaka: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        genres: {
          include: {
            genre: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'asc',
      },
    });
  }

  async findOneForBoard(id: number) {
    const proposal = await this.prisma.seriesProposal.findUnique({
      where: { id },
      include: {
        mangaka: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        genres: {
          include: {
            genre: true,
          },
        },
        series: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    return proposal;
  }

  async approve(id: number) {
    const proposal = await this.findOneForBoard(id);

    if (proposal.proposedStatus !== ProposalStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted proposals can be approved');
    }

    if (proposal.series) {
      throw new BadRequestException(
        'This proposal already has an official series',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.seriesProposal.update({
        where: { id },
        data: {
          proposedStatus: ProposalStatus.APPROVED,
        },
      });

      return transaction.series.create({
        data: {
          proposalId: proposal.id,
          mangakaUserId: proposal.mangakaUserId,
          title: proposal.title,
          publicationFrequency: proposal.proposedFrequency,
          status: SeriesStatus.ACTIVE,
          genres: {
            create: proposal.genres.map((proposalGenre) => ({
              genre: {
                connect: {
                  id: proposalGenre.genreId,
                },
              },
            })),
          },
        },
        include: {
          genres: {
            include: {
              genre: true,
            },
          },
        },
      });
    });
  }

  async reject(id: number) {
    const proposal = await this.findOneForBoard(id);

    if (proposal.proposedStatus !== ProposalStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted proposals can be rejected');
    }

    return this.prisma.seriesProposal.update({
      where: { id },
      data: {
        proposedStatus: ProposalStatus.REJECTED,
      },
    });
  }
}
