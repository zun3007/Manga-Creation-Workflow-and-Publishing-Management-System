import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlinkSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { StudioNotificationsService } from '../studio-notifications/studio-notifications.service';

type StudioAssetRow = {
  asset_id: number;
  owner_user_id: number;
  original_name: string;
  file_name: string;
  asset_type: string;
  file_url: string;
  mime_type: string | null;
  file_size: number;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class StudioAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studioNotificationsService: StudioNotificationsService,
  ) {}

  async findMyAssets(ownerUserId: number) {
    const rows = await this.prisma.$queryRaw<StudioAssetRow[]>`
      SELECT *
      FROM studio_assets
      WHERE owner_user_id = ${ownerUserId}
      ORDER BY created_at DESC
    `;

    return rows.map((row) => this.mapAsset(row));
  }

  async createAsset(ownerUserId: number, file: any, assetType: string) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const safeAssetType = assetType?.trim() || 'Character';
    const fileUrl = `/uploads/assets/${file.filename}`;

    await this.prisma.$executeRaw`
      INSERT INTO studio_assets (
        owner_user_id,
        original_name,
        file_name,
        asset_type,
        file_url,
        mime_type,
        file_size,
        created_at,
        updated_at
      )
      VALUES (
        ${ownerUserId},
        ${file.originalname},
        ${file.filename},
        ${safeAssetType},
        ${fileUrl},
        ${file.mimetype},
        ${file.size},
        NOW(3),
        NOW(3)
      )
    `;

    const rows = await this.prisma.$queryRaw<StudioAssetRow[]>`
  SELECT *
  FROM studio_assets
  WHERE owner_user_id = ${ownerUserId}
    AND file_name = ${file.filename}
  ORDER BY asset_id DESC
  LIMIT 1
`;

    const createdAsset = this.mapAsset(rows[0]);

    await this.studioNotificationsService.createNotification({
      userId: ownerUserId,
      title: 'Asset uploaded',
      message: `${createdAsset.name} has been added to your asset library.`,
      type: 'ASSET',
    });

    return createdAsset;

    return this.mapAsset(rows[0]);
  }

  async updateAsset(
    ownerUserId: number,
    assetId: number,
    data: {
      originalName?: string;
      assetType?: string;
    },
  ) {
    const rows = await this.prisma.$queryRaw<StudioAssetRow[]>`
    SELECT *
    FROM studio_assets
    WHERE asset_id = ${assetId}
      AND owner_user_id = ${ownerUserId}
    LIMIT 1
  `;

    const asset = rows[0];

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const nextName = data.originalName?.trim() || asset.original_name;
    const nextType = data.assetType?.trim() || asset.asset_type;

    await this.prisma.$executeRaw`
    UPDATE studio_assets
    SET original_name = ${nextName},
        asset_type = ${nextType},
        updated_at = NOW(3)
    WHERE asset_id = ${assetId}
      AND owner_user_id = ${ownerUserId}
  `;

    const updatedRows = await this.prisma.$queryRaw<StudioAssetRow[]>`
    SELECT *
    FROM studio_assets
    WHERE asset_id = ${assetId}
      AND owner_user_id = ${ownerUserId}
    LIMIT 1
  `;

    return this.mapAsset(updatedRows[0]);
  }

  async removeAsset(ownerUserId: number, assetId: number) {
    const rows = await this.prisma.$queryRaw<StudioAssetRow[]>`
      SELECT *
      FROM studio_assets
      WHERE asset_id = ${assetId}
        AND owner_user_id = ${ownerUserId}
      LIMIT 1
    `;

    const asset = rows[0];

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    await this.prisma.$executeRaw`
      DELETE FROM studio_assets
      WHERE asset_id = ${assetId}
        AND owner_user_id = ${ownerUserId}
    `;

    try {
      const relativePath = asset.file_url.replace('/uploads/', 'uploads/');
      unlinkSync(join(process.cwd(), relativePath));
    } catch {
      // Ignore file delete error because database record was removed.
    }

    return {
      message: 'Asset removed successfully',
      assetId,
    };
  }

  private mapAsset(row: StudioAssetRow) {
    return {
      id: row.asset_id,
      ownerUserId: row.owner_user_id,
      name: row.original_name,
      fileName: row.file_name,
      type: row.asset_type,
      fileUrl: row.file_url,
      mimeType: row.mime_type,
      size: row.file_size,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
