import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ProposalStatus,
  PROPOSAL_TRANSITIONS,
  canTransition,
  NotificationType,
  Role,
} from '@manga/shared';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';

@Injectable()
export class ProposalsService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(mangakaUserId: number, dto: CreateProposalDto) {
    const proposalId = await this.db.insert(
      `INSERT INTO \`Series_Proposal\` (mangaka_user_id, title, synopsis, proposed_frequency, proposal_status, sample_manuscript_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        mangakaUserId,
        dto.title,
        dto.synopsis ?? null,
        dto.proposedFrequency,
        ProposalStatus.DRAFT,
        dto.sampleManuscriptUrl ?? null,
      ],
    );

    for (const genreId of dto.genreIds) {
      await this.db.query(
        `INSERT INTO \`Proposal_Genre\` (proposal_id, genre_id) VALUES (?, ?)`,
        [proposalId, genreId],
      );
    }

    return this.findOne(proposalId);
  }

  private async findOne(proposalId: number) {
    return this.db.queryOne(
      `SELECT
        sp.proposal_id AS id,
        sp.mangaka_user_id AS mangakaUserId,
        sp.title,
        sp.synopsis,
        sp.proposal_status AS status,
        sp.proposed_frequency AS proposedFrequency,
        sp.review_due_date AS reviewDueDate,
        sp.submitted_at AS submittedAt,
        sp.created_at AS createdAt,
        sp.updated_at AS updatedAt,
        sp.sample_manuscript_url AS sampleManuscriptUrl,
        GROUP_CONCAT(g.genre_name SEPARATOR ',') AS genres
       FROM \`Series_Proposal\` sp
       LEFT JOIN \`Proposal_Genre\` pg ON sp.proposal_id = pg.proposal_id
       LEFT JOIN \`Genre\` g ON pg.genre_id = g.genre_id
       WHERE sp.proposal_id = ?
       GROUP BY sp.proposal_id`,
      [proposalId],
    );
  }

  /**
   * Proposal detail with role-scoped access (S1-F10). A Mangaka sees only their
   * own; an Editorial Board member sees any; a Tantou Editor sees a proposal only
   * if they are the active assigned editor of the series it produced.
   */
  async getDetail(proposalId: number, userId: number, role: string) {
    const proposal = await this.findOne(proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }
    if (role === Role.MANGAKA) {
      if ((proposal as { mangakaUserId: number }).mangakaUserId !== userId) {
        throw new ForbiddenException('You do not own this proposal');
      }
    } else if (role === Role.TANTOU_EDITOR) {
      const assigned = await this.db.queryOne(
        `SELECT 1 AS ok
         FROM \`Series\` s
         JOIN \`Series_Tantou_Editor\` ste
           ON ste.series_id = s.series_id AND ste.unassigned_at IS NULL
         WHERE s.proposal_id = ? AND ste.editor_user_id = ?
         LIMIT 1`,
        [proposalId, userId],
      );
      if (!assigned) {
        throw new ForbiddenException('Bạn không phụ trách đề xuất này');
      }
    }
    // EDITORIAL_BOARD: may view any proposal detail.
    return proposal;
  }

  async listMine(mangakaUserId: number) {
    return this.db.query(
      `SELECT
        sp.proposal_id AS id,
        sp.mangaka_user_id AS mangakaUserId,
        sp.title,
        sp.synopsis,
        sp.proposal_status AS status,
        sp.proposed_frequency AS proposedFrequency,
        sp.review_due_date AS reviewDueDate,
        sp.submitted_at AS submittedAt,
        sp.created_at AS createdAt,
        sp.updated_at AS updatedAt,
        sp.sample_manuscript_url AS sampleManuscriptUrl,
        GROUP_CONCAT(g.genre_name SEPARATOR ',') AS genres
       FROM \`Series_Proposal\` sp
       LEFT JOIN \`Proposal_Genre\` pg ON sp.proposal_id = pg.proposal_id
       LEFT JOIN \`Genre\` g ON pg.genre_id = g.genre_id
       WHERE sp.mangaka_user_id = ?
       GROUP BY sp.proposal_id
       ORDER BY sp.created_at DESC`,
      [mangakaUserId],
    );
  }

  /** Edit a DRAFT proposal (S1-F07). Mangaka-owned + DRAFT only. */
  async update(
    proposalId: number,
    mangakaUserId: number,
    dto: UpdateProposalDto,
  ) {
    const proposal = await this.findOne(proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }
    if ((proposal as { mangakaUserId: number }).mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException('You do not own this proposal');
    }
    if ((proposal as { status: string }).status !== ProposalStatus.DRAFT) {
      throw new BadRequestException(
        'Chỉ có thể sửa đề xuất khi còn ở trạng thái nháp',
      );
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    if (dto.title !== undefined) {
      sets.push('title = ?');
      params.push(dto.title);
    }
    if (dto.synopsis !== undefined) {
      sets.push('synopsis = ?');
      params.push(dto.synopsis ?? null);
    }
    if (dto.proposedFrequency !== undefined) {
      sets.push('proposed_frequency = ?');
      params.push(dto.proposedFrequency);
    }
    if (dto.sampleManuscriptUrl !== undefined) {
      sets.push('sample_manuscript_url = ?');
      params.push(dto.sampleManuscriptUrl ?? null);
    }

    await this.db.transaction(async (tx) => {
      if (sets.length > 0) {
        params.push(proposalId);
        await tx.query(
          `UPDATE \`Series_Proposal\` SET ${sets.join(', ')} WHERE proposal_id = ?`,
          params,
        );
      }
      if (dto.genreIds !== undefined) {
        await tx.query(`DELETE FROM \`Proposal_Genre\` WHERE proposal_id = ?`, [
          proposalId,
        ]);
        for (const genreId of dto.genreIds) {
          await tx.query(
            `INSERT INTO \`Proposal_Genre\` (proposal_id, genre_id) VALUES (?, ?)`,
            [proposalId, genreId],
          );
        }
      }
    });

    return this.findOne(proposalId);
  }

  async submit(proposalId: number, mangakaUserId: number) {
    const proposal = await this.findOne(proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }
    if (proposal.mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException('You do not own this proposal');
    }

    if (
      !canTransition(
        PROPOSAL_TRANSITIONS,
        proposal.status,
        ProposalStatus.SUBMITTED,
      )
    ) {
      throw new BadRequestException(
        `Cannot transition from ${proposal.status} to SUBMITTED`,
      );
    }

    await this.db.query(
      `UPDATE \`Series_Proposal\` SET proposal_status = ?, submitted_at = NOW()
       WHERE proposal_id = ?`,
      [ProposalStatus.SUBMITTED, proposalId],
    );

    return this.findOne(proposalId);
  }

  async reviewQueue() {
    return this.db.query(
      `SELECT
        sp.proposal_id AS id,
        sp.title,
        sp.synopsis,
        sp.proposal_status AS status,
        sp.proposed_frequency AS proposedFrequency,
        sp.review_due_date AS reviewDueDate,
        sp.submitted_at AS submittedAt,
        u.full_name AS mangakaName,
        GROUP_CONCAT(g.genre_name SEPARATOR ',') AS genres
       FROM \`Series_Proposal\` sp
       JOIN \`User\` u ON sp.mangaka_user_id = u.user_id
       LEFT JOIN \`Proposal_Genre\` pg ON sp.proposal_id = pg.proposal_id
       LEFT JOIN \`Genre\` g ON pg.genre_id = g.genre_id
       WHERE sp.proposal_status IN ('SUBMITTED', 'UNDER_REVIEW')
       GROUP BY sp.proposal_id
       ORDER BY sp.submitted_at ASC`,
    );
  }

  async decide(
    proposalId: number,
    decision: 'APPROVED' | 'REJECTED',
    _boardUserId: number,
  ) {
    const proposal = await this.findOne(proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const decisionStatus =
      decision === 'APPROVED'
        ? ProposalStatus.APPROVED
        : ProposalStatus.REJECTED;

    if (!canTransition(PROPOSAL_TRANSITIONS, proposal.status, decisionStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${proposal.status} to ${decisionStatus}`,
      );
    }

    let seriesId: number | null = null;

    // Execute all DB writes in a single transaction
    await this.db.transaction(async (tx) => {
      if (decision === 'APPROVED') {
        seriesId = await tx.insert(
          `INSERT INTO \`Series\` (proposal_id, mangaka_user_id, title, publication_frequency, series_status)
           VALUES (?, ?, ?, ?, ?)`,
          [
            proposalId,
            proposal.mangakaUserId,
            proposal.title,
            proposal.proposedFrequency,
            'ACTIVE',
          ],
        );

        await tx.query(
          `INSERT INTO \`Series_Genre\` (series_id, genre_id)
           SELECT ?, genre_id FROM \`Proposal_Genre\` WHERE proposal_id = ?`,
          [seriesId, proposalId],
        );
      }

      await tx.query(
        `UPDATE \`Series_Proposal\` SET proposal_status = ?
         WHERE proposal_id = ?`,
        [decisionStatus, proposalId],
      );
    });

    // Send notifications after transaction commits
    if (decision === 'APPROVED') {
      await this.notifications.notify(
        proposal.mangakaUserId,
        NotificationType.PROPOSAL_DECISION,
        'Đề xuất được duyệt',
        `Series "${proposal.title}" đã được tạo.`,
        'Series',
        seriesId!,
      );

      // Notify all EDITORIAL_BOARD users
      const boardMembers = await this.db.query<{ user_id: number }>(
        `SELECT user_id FROM \`User\` WHERE role = 'EDITORIAL_BOARD' AND is_activated = 1`,
      );

      for (const member of boardMembers) {
        await this.notifications.notify(
          member.user_id,
          NotificationType.PROPOSAL_DECISION,
          `Series mới "${proposal.title}" đã được duyệt`,
          `Proposal #${proposalId} đã được EDITORIAL_BOARD phê duyệt và tạo thành series.`,
          'Series',
          seriesId!,
        );
      }
    } else {
      await this.notifications.notify(
        proposal.mangakaUserId,
        NotificationType.PROPOSAL_DECISION,
        'Đề xuất bị từ chối',
        `Series "${proposal.title}" đã bị từ chối.`,
        'Proposal',
        proposalId,
      );
    }

    return {
      proposalId,
      decision,
      seriesId,
    };
  }
}
