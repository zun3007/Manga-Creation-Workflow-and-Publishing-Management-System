import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../s3/storage.service';
import {
  ProposalStatus,
  PROPOSAL_TRANSITIONS,
  canTransition,
  NotificationType,
} from '@manga/shared';
import { CreateProposalDto } from './dto/create-proposal.dto';

@Injectable()
export class ProposalsService implements OnModuleInit {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  async onModuleInit() {
    await this.ensureProposalSchema();
    await this.ensureSampleManuscriptConfig();
  }

  async create(mangakaUserId: number, dto: CreateProposalDto) {
    const proposalId = await this.db.insert(
      `INSERT INTO \`Series_Proposal\` (mangaka_user_id, title, synopsis, proposed_frequency, proposal_status)
       VALUES (?, ?, ?, ?, ?)`,
      [mangakaUserId, dto.title, dto.synopsis ?? null, dto.proposedFrequency, ProposalStatus.DRAFT],
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
        sp.sample_manuscript_url AS sampleManuscriptUrl,
        sp.sample_manuscript_name AS sampleManuscriptName,
        sp.sample_manuscript_uploaded_at AS sampleManuscriptUploadedAt,
        sp.review_note AS reviewNote,
        sp.decision_note AS decisionNote,
        sp.review_due_date AS reviewDueDate,
        sp.submitted_at AS submittedAt,
        sp.created_at AS createdAt,
        sp.updated_at AS updatedAt,
        GROUP_CONCAT(g.genre_name SEPARATOR ',') AS genres
       FROM \`Series_Proposal\` sp
       LEFT JOIN \`Proposal_Genre\` pg ON sp.proposal_id = pg.proposal_id
       LEFT JOIN \`Genre\` g ON pg.genre_id = g.genre_id
       WHERE sp.proposal_id = ?
       GROUP BY sp.proposal_id`,
      [proposalId],
    );
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
        sp.sample_manuscript_url AS sampleManuscriptUrl,
        sp.sample_manuscript_name AS sampleManuscriptName,
        sp.sample_manuscript_uploaded_at AS sampleManuscriptUploadedAt,
        sp.review_note AS reviewNote,
        sp.decision_note AS decisionNote,
        sp.review_due_date AS reviewDueDate,
        sp.submitted_at AS submittedAt,
        sp.created_at AS createdAt,
        sp.updated_at AS updatedAt,
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

  async submit(proposalId: number, mangakaUserId: number) {
    const proposal = await this.findOne(proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }
    if (proposal.mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException('You do not own this proposal');
    }

    if (!canTransition(PROPOSAL_TRANSITIONS, proposal.status, ProposalStatus.SUBMITTED)) {
      throw new BadRequestException(
        `Cannot transition from ${proposal.status} to SUBMITTED`,
      );
    }

    if (!proposal.sampleManuscriptUrl) {
      throw new BadRequestException('Vui lòng tải bản thảo mẫu trước khi gửi duyệt.');
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
        sp.sample_manuscript_url AS sampleManuscriptUrl,
        sp.sample_manuscript_name AS sampleManuscriptName,
        sp.review_note AS reviewNote,
        sp.decision_note AS decisionNote,
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

  async reviewDetail(proposalId: number) {
    const proposal = await this.findOne(proposalId);
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (![ProposalStatus.SUBMITTED, ProposalStatus.UNDER_REVIEW].includes(proposal.status)) {
      throw new ForbiddenException('Chỉ xem được chi tiết đề xuất đang chờ duyệt.');
    }
    return proposal;
  }

  async startReview(proposalId: number) {
    const proposal = await this.findOne(proposalId);
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (!canTransition(PROPOSAL_TRANSITIONS, proposal.status, ProposalStatus.UNDER_REVIEW)) {
      throw new BadRequestException(`Cannot transition from ${proposal.status} to UNDER_REVIEW`);
    }
    await this.db.query(
      `UPDATE \`Series_Proposal\` SET proposal_status = ? WHERE proposal_id = ?`,
      [ProposalStatus.UNDER_REVIEW, proposalId],
    );
    return this.findOne(proposalId);
  }

  async updateReviewNote(proposalId: number, note: string) {
    const proposal = await this.findOne(proposalId);
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.status !== ProposalStatus.UNDER_REVIEW) {
      throw new BadRequestException('Chỉ thêm ghi chú khi đề xuất đang UNDER_REVIEW.');
    }
    await this.db.query(
      `UPDATE \`Series_Proposal\` SET review_note = ? WHERE proposal_id = ?`,
      [note.trim() || null, proposalId],
    );
    return this.findOne(proposalId);
  }

  async decide(
    proposalId: number,
    decision: 'APPROVED' | 'REJECTED',
    boardUserId: number,
    note?: string,
  ) {
    const proposal = await this.findOne(proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const decisionStatus =
      decision === 'APPROVED' ? ProposalStatus.APPROVED : ProposalStatus.REJECTED;

    if (proposal.status !== ProposalStatus.UNDER_REVIEW) {
      throw new BadRequestException('Chỉ được phê duyệt/từ chối khi đề xuất đang UNDER_REVIEW.');
    }

    if (decision === 'REJECTED' && !note?.trim()) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối.');
    }

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
          [proposalId, proposal.mangakaUserId, proposal.title, proposal.proposedFrequency, 'ACTIVE'],
        );

        await tx.query(
          `INSERT INTO \`Series_Genre\` (series_id, genre_id)
           SELECT ?, genre_id FROM \`Proposal_Genre\` WHERE proposal_id = ?`,
          [seriesId, proposalId],
        );
      }

      await tx.query(
        `UPDATE \`Series_Proposal\` SET proposal_status = ?, decision_note = ?
         WHERE proposal_id = ?`,
        [decisionStatus, note?.trim() || null, proposalId],
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
        `Series "${proposal.title}" đã bị từ chối.${note?.trim() ? ` Lý do: ${note.trim()}` : ''}`,
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

  async sampleManuscriptConfig() {
    const config = await this.readSampleManuscriptConfig();
    return {
      maxMB: config.maxMB,
      extensions: config.extensions,
      mimeTypes: config.mimeTypes,
      accept: config.extensions.join(','),
      hint: `${config.extensions.join(', ')} · tối đa ${config.maxMB}MB`,
    };
  }

  async uploadSampleManuscript(
    proposalId: number,
    mangakaUserId: number,
    file: Express.Multer.File,
    baseUrl: string,
  ) {
    if (!file) throw new BadRequestException('Thiếu file bản thảo mẫu.');

    const proposal = await this.findOne(proposalId);
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException('Bạn không sở hữu đề xuất này.');
    }
    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new BadRequestException('Chỉ được tải bản thảo khi đề xuất còn ở DRAFT.');
    }

    const config = await this.readSampleManuscriptConfig();
    this.validateSampleManuscriptFile(file, config);

    const extension = extname(file.originalname).toLowerCase();
    const key = `proposal-sample-${proposalId}-${randomUUID()}${extension}`;
    await this.storage.put(key, file.buffer, file.mimetype);

    const url = `${baseUrl.replace(/\/$/, '')}/uploads/${key}`;
    this.validateFileUrl(url, config.extensions);

    await this.db.query(
      `UPDATE \`Series_Proposal\`
       SET sample_manuscript_url = ?,
           sample_manuscript_name = ?,
           sample_manuscript_uploaded_at = NOW()
       WHERE proposal_id = ?`,
      [url, file.originalname, proposalId],
    );

    return this.findOne(proposalId);
  }

  private async ensureProposalSchema() {
    const columns = [
      ['sample_manuscript_url', 'VARCHAR(500) NULL'],
      ['sample_manuscript_name', 'VARCHAR(255) NULL'],
      ['sample_manuscript_uploaded_at', 'DATETIME NULL'],
      ['review_note', 'TEXT NULL'],
      ['decision_note', 'TEXT NULL'],
    ] as const;

    for (const [name, definition] of columns) {
      const existing = await this.db.queryOne(
        `SHOW COLUMNS FROM \`Series_Proposal\` LIKE ?`,
        [name],
      );
      if (!existing) {
        await this.db.query(`ALTER TABLE \`Series_Proposal\` ADD COLUMN \`${name}\` ${definition}`);
      }
    }
  }

  private async ensureSampleManuscriptConfig() {
    const defaults = [
      ['sample_manuscript_allowed_extensions', '.pdf,.png,.jpg,.jpeg,.webp', 'Allowed file extensions for proposal sample manuscripts'],
      ['sample_manuscript_allowed_mime_types', 'application/pdf,image/png,image/jpeg,image/webp', 'Allowed MIME types for proposal sample manuscripts'],
      ['sample_manuscript_max_mb', '25', 'Maximum sample manuscript upload size in MB'],
    ];

    for (const [key, value, description] of defaults) {
      await this.db.query(
        `INSERT INTO \`System_Config\` (config_key, config_value, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE config_value = config_value`,
        [key, value, description],
      );
    }
  }

  private async readSampleManuscriptConfig() {
    const rows = await this.db.query<{ config_key: string; config_value: string }>(
      `SELECT config_key, config_value FROM \`System_Config\`
       WHERE config_key IN (
         'sample_manuscript_allowed_extensions',
         'sample_manuscript_allowed_mime_types',
         'sample_manuscript_max_mb'
       )`,
    );
    const map = new Map(rows.map((row) => [row.config_key, row.config_value]));
    const extensions = this.parseList(map.get('sample_manuscript_allowed_extensions'));
    const mimeTypes = this.parseList(map.get('sample_manuscript_allowed_mime_types'));
    const maxMB = Number(map.get('sample_manuscript_max_mb'));

    if (!extensions.length || !mimeTypes.length || !Number.isFinite(maxMB) || maxMB <= 0) {
      throw new BadRequestException('Cấu hình upload bản thảo mẫu chưa hợp lệ.');
    }
    return { extensions, mimeTypes, maxMB };
  }

  private parseList(value?: string) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim().toLowerCase()).filter(Boolean);
    } catch {
      // comma-separated config
    }
    return value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  }

  private validateSampleManuscriptFile(
    file: Express.Multer.File,
    config: { extensions: string[]; mimeTypes: string[]; maxMB: number },
  ) {
    const extension = extname(file.originalname).toLowerCase();
    if (!config.extensions.includes(extension)) {
      throw new BadRequestException('Định dạng file không được hỗ trợ.');
    }
    if (!config.mimeTypes.includes(file.mimetype.toLowerCase())) {
      throw new BadRequestException('Content-type file không được hỗ trợ.');
    }
    if (file.size > config.maxMB * 1024 * 1024) {
      throw new BadRequestException(`File vượt quá dung lượng cho phép (${config.maxMB}MB).`);
    }
    if (!this.hasValidMagicNumber(file.buffer, extension)) {
      throw new BadRequestException('File không đúng định dạng thật hoặc có chữ ký không hợp lệ.');
    }
  }

  private hasValidMagicNumber(buffer: Buffer, extension: string) {
    if (extension === '.pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    if (extension === '.png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (extension === '.jpg' || extension === '.jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (extension === '.webp') {
      return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    }
    return false;
  }

  private validateFileUrl(url: string, extensions: string[]) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('URL bản thảo không hợp lệ.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('URL bản thảo phải là HTTP/HTTPS.');
    }
    const extension = extname(parsed.pathname).toLowerCase();
    if (!extensions.includes(extension)) {
      throw new BadRequestException('URL bản thảo có extension không hợp lệ.');
    }
  }
}
