import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:3000',
  );

  // CORS
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sardoba PMS API')
    .setDescription('Property Management System for boutique hotels in Uzbekistan')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('/v1', 'API v1')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Global prefix
  app.setGlobalPrefix('v1');

  await app.listen(port);

  console.log(`Sardoba PMS API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
