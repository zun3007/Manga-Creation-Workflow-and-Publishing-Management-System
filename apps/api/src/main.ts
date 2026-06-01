import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

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
