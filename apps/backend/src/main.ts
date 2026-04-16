import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe'
import { Logger } from '@nestjs/common/services/logger.service'
import helmet from 'helmet'
import { json } from 'express'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });

  app.setGlobalPrefix('api');
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3002').split(',');
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.use(json({ limit: '10mb' }));

    // Validation DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Permet les propriétés non listées
      transform: true,
      skipMissingProperties: false, // Valide même les propriétés manquantes
      transformOptions: {
        enableImplicitConversion: true, // Conversion automatique des types
      },
    }),
  );

  
  app.use(helmet());
  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`🚀 API running at http://localhost:${port}`)
}

bootstrap();
