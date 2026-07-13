import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { StorageService } from './s3/storage.service';

/**
 * Refuse to boot in production with missing or left-at-dev-default secrets.
 * These defaults are fine for local development but would allow forged JWTs
 * (dev-secret) or trivial DB/storage access if shipped.
 */
function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;
  const insecure: string[] = [];
  const check = (name: string, devDefault: string) => {
    const v = process.env[name];
    if (!v || v === devDefault) insecure.push(name);
  };
  check('JWT_SECRET', 'dev-secret');
  check('DB_PASSWORD', 'manga_root');
  check('S3_SECRET_KEY', 'manga-s3-dev-secret');
  if (insecure.length) {
    throw new Error(
      `Refusing to start in production: missing or insecure secrets → ${insecure.join(', ')}. ` +
        'Set strong values in the environment before deploying.',
    );
  }
}

async function bootstrap() {
  assertProductionSecrets();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // Serve uploaded objects from S3 (SeaweedFS) at /uploads/<key>, with a legacy
  // on-disk fallback for files written before the S3 cutover. Public read (matches
  // <img src="/uploads/..."> which carries no auth) — same exposure as the old static mount.
  const storage = app.get(StorageService);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/uploads/:key', async (req: Request, res: Response) => {
    const key = String(req.params.key);

    // Validate key matches safe pattern (no path traversal)
    if (!/^[A-Za-z0-9._-]+$/.test(key)) {
      res.status(400).send('Invalid key');
      return;
    }

    try {
      const obj = await storage.get(key);
      if (obj.contentType) res.setHeader('Content-Type', obj.contentType);
      if (obj.contentLength != null) res.setHeader('Content-Length', String(obj.contentLength));
      res.setHeader('Cache-Control', 'public, max-age=86400');
      obj.stream.pipe(res);
    } catch {
      const diskPath = join(process.cwd(), 'uploads', key);
      if (existsSync(diskPath)) {
        res.sendFile(diskPath);
        return;
      }
      res.status(404).send('Not found');
    }
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Manga Creation Workflow & Publishing Management System API')
    .setDescription(
      'Internal manga-studio production & publishing platform — REST API. ' +
        'Authenticate via POST /api/auth/login, then click Authorize and paste the Bearer token.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });
  Logger.log(
    `Swagger UI → http://localhost:${process.env.PORT || 3000}/api/docs`,
    'Bootstrap',
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Manga API → http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
