import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  PrismaClient,
  RegionType,
  UserRole,
} from '../src/generated/prisma/client';

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 3308),
  user: process.env.DATABASE_USER ?? 'manga',
  password: process.env.DATABASE_PASSWORD ?? '123456',
  database: process.env.DATABASE_NAME ?? 'manga_workflow',
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash('123456', 12);

  const admin = await prisma.user.upsert({
    where: {
      email: 'admin@mangaflow.local',
    },
    update: {
      displayName: 'Admin MangaFlow',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@mangaflow.local',
      displayName: 'Admin MangaFlow',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const mangaka = await prisma.user.upsert({
    where: {
      email: 'mangaka@mangaflow.local',
    },
    update: {
      displayName: 'Mangaka Demo',
      passwordHash,
      role: UserRole.MANGAKA,
      isActive: true,
    },
    create: {
      email: 'mangaka@mangaflow.local',
      displayName: 'Mangaka Demo',
      passwordHash,
      role: UserRole.MANGAKA,
    },
  });

  const assistant = await prisma.user.upsert({
    where: {
      email: 'assistant@mangaflow.local',
    },
    update: {
      displayName: 'Assistant Demo',
      passwordHash,
      role: UserRole.ASSISTANT,
      isActive: true,
    },
    create: {
      email: 'assistant@mangaflow.local',
      displayName: 'Assistant Demo',
      passwordHash,
      role: UserRole.ASSISTANT,
    },
  });

  const editor = await prisma.user.upsert({
    where: {
      email: 'editor@mangaflow.local',
    },
    update: {
      displayName: 'Tantou Editor Demo',
      passwordHash,
      role: UserRole.TANTOU_EDITOR,
      isActive: true,
    },
    create: {
      email: 'editor@mangaflow.local',
      displayName: 'Tantou Editor Demo',
      passwordHash,
      role: UserRole.TANTOU_EDITOR,
    },
  });

  const board = await prisma.user.upsert({
    where: {
      email: 'board@mangaflow.local',
    },
    update: {
      displayName: 'Editorial Board Demo',
      passwordHash,
      role: UserRole.EDITORIAL_BOARD,
      isActive: true,
    },
    create: {
      email: 'board@mangaflow.local',
      displayName: 'Editorial Board Demo',
      passwordHash,
      role: UserRole.EDITORIAL_BOARD,
    },
  });

  await prisma.mangakaProfile.upsert({
    where: {
      userId: mangaka.id,
    },
    update: {
      penName: 'Hikari Studio',
      biography: 'Demo profile for the main manga creator.',
      yearsExperience: 5,
      studioName: 'MangaFlow Studio',
    },
    create: {
      userId: mangaka.id,
      penName: 'Hikari Studio',
      biography: 'Demo profile for the main manga creator.',
      yearsExperience: 5,
      studioName: 'MangaFlow Studio',
    },
  });

  await prisma.assistantProfile.upsert({
    where: {
      userId: assistant.id,
    },
    update: {
      salaryRate: 100000,
      skillSet: 'Background, speech bubble cleanup, shading, effects',
      totalEarnings: 0,
    },
    create: {
      userId: assistant.id,
      salaryRate: 100000,
      skillSet: 'Background, speech bubble cleanup, shading, effects',
      totalEarnings: 0,
    },
  });

  await prisma.tantouEditorProfile.upsert({
    where: {
      userId: editor.id,
    },
    update: {
      departmentName: 'Editorial Department',
      specialization: 'Manga manuscript review',
      yearsExperience: 7,
      managedSeriesCount: 0,
    },
    create: {
      userId: editor.id,
      departmentName: 'Editorial Department',
      specialization: 'Manga manuscript review',
      yearsExperience: 7,
      managedSeriesCount: 0,
    },
  });

  await prisma.editorialBoardProfile.upsert({
    where: {
      userId: board.id,
    },
    update: {
      departmentName: 'Editorial Board',
      specialization: 'Publishing and ranking decisions',
      yearsExperience: 10,
      managedSeriesCount: 0,
    },
    create: {
      userId: board.id,
      departmentName: 'Editorial Board',
      specialization: 'Publishing and ranking decisions',
      yearsExperience: 10,
      managedSeriesCount: 0,
    },
  });

  const genres = [
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Fantasy',
    'Romance',
    'Sci-Fi',
    'Slice of Life',
  ];

  for (const name of genres) {
    await prisma.genre.upsert({
      where: {
        name,
      },
      update: {},
      create: {
        name,
      },
    });
  }

  await prisma.taskPriceRule.deleteMany({
    where: {
      createdByUserId: admin.id,
    },
  });

  await prisma.taskPriceRule.createMany({
    data: [
      {
        createdByUserId: admin.id,
        name: 'Background Drawing',
        regionType: RegionType.BACKGROUND,
        basePrice: 120000,
        effectiveFrom: new Date(),
      },
      {
        createdByUserId: admin.id,
        name: 'Speech Bubble Cleanup',
        regionType: RegionType.SPEECH_BUBBLE,
        basePrice: 50000,
        effectiveFrom: new Date(),
      },
      {
        createdByUserId: admin.id,
        name: 'Visual Effect',
        regionType: RegionType.EFFECT,
        basePrice: 90000,
        effectiveFrom: new Date(),
      },
      {
        createdByUserId: admin.id,
        name: 'Character Shading',
        regionType: RegionType.CHARACTER,
        basePrice: 150000,
        effectiveFrom: new Date(),
      },
    ],
  });

  await prisma.systemConfig.upsert({
    where: {
      key: 'DEFAULT_RANKING_RISK_THRESHOLD',
    },
    update: {
      value: '10',
      description:
        'A series ranked below this threshold may be marked as at risk.',
      updatedByUserId: admin.id,
    },
    create: {
      key: 'DEFAULT_RANKING_RISK_THRESHOLD',
      value: '10',
      description:
        'A series ranked below this threshold may be marked as at risk.',
      updatedByUserId: admin.id,
    },
  });

  console.log('Seed completed successfully.');
  console.table([
    {
      role: 'ADMIN',
      email: admin.email,
      password: '123456',
    },
    {
      role: 'MANGAKA',
      email: mangaka.email,
      password: '123456',
    },
    {
      role: 'ASSISTANT',
      email: assistant.email,
      password: '123456',
    },
    {
      role: 'TANTOU_EDITOR',
      email: editor.email,
      password: '123456',
    },
    {
      role: 'EDITORIAL_BOARD',
      email: board.email,
      password: '123456',
    },
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
