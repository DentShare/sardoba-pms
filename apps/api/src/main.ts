import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  Logger,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import * as path from 'path';
import * as crypto from 'crypto';
import helmet from 'helmet';
import { SardobaException } from '@sardoba/shared';
import { AppModule } from './app.module';

// ── Correlation ID middleware ──────────────────────────────────────────────────

function correlationMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const id =
    (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.headers['x-request-id'] = id;
  res.setHeader('x-request-id', id);
  next();
}

// ── Request logging middleware ─────────────────────────────────────────────────

function requestLoggerMiddleware(logger: Logger) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const start = Date.now();
    const { method, originalUrl } = req;
    const requestId = req.headers['x-request-id'] as string;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const logLine = `${method} ${originalUrl} ${statusCode} ${duration}ms [${requestId}]`;

      if (statusCode >= 500) {
        logger.error(logLine);
      } else if (statusCode >= 400) {
        logger.warn(logLine);
      } else if (duration > 1000) {
        logger.warn(`SLOW ${logLine}`);
      }
      // Skip logging 2xx/3xx with normal latency to reduce noise
    });

    next();
  };
}

// ── Global exception filter ───────────────────────────────────────────────────

@Catch()
class AllExceptionsFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const requestId = request.headers?.['x-request-id'] ?? '-';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof SardobaException) {
      status = exception.httpStatus;
      if (status >= 500) {
        this.logger.error(
          `${request.method} ${request.url} → ${status} [${exception.code}] [${requestId}]`,
          exception.stack,
        );
      }
      response.status(status).json(exception.toJSON());
      return;
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      if (status >= 500) {
        this.logger.error(
          `${request.method} ${request.url} → ${status} [${requestId}]`,
          exception instanceof Error ? exception.stack : String(exception),
        );
      }
      response.status(status).json(exception.getResponse());
      return;
    }

    this.logger.error(
      `${request.method} ${request.url} → 500 [${requestId}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(status).json({
      statusCode: status,
      message: 'Internal server error',
      path: request.url,
    });
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:3002',
  );

  // Correlation ID — before everything else
  app.use(correlationMiddleware);

  // Request logging
  app.use(requestLoggerMiddleware(logger));

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS — dynamic origin from env, no hardcoded localhost in production
  const adminUrl = configService.get<string>(
    'ADMIN_URL',
    'http://localhost:3005',
  );
  const corsOrigins: (string | RegExp)[] = [frontendUrl, adminUrl];
  if (!isProduction) {
    corsOrigins.push('http://localhost:3002', 'http://localhost:3005', 'http://localhost:4002', 'http://localhost:4005');
  }
  app.enableCors({
    origin: corsOrigins,
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

  // Swagger — disabled in production
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Sardoba PMS API')
      .setDescription(
        'Property Management System for boutique hotels in Uzbekistan',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addServer('/v1', 'API v1')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
    logger.log('Swagger docs enabled at /docs');
  }

  // Global exception filter for verbose error logging
  app.useGlobalFilters(new AllExceptionsFilter());

  // Serve uploaded files statically (before global prefix)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Global prefix
  app.setGlobalPrefix('v1');

  // Graceful shutdown with timeout
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`Sardoba PMS API running on http://localhost:${port} [${nodeEnv}]`);

  // Graceful shutdown handler with 30s timeout
  const shutdown = async (signal: string) => {
    logger.log(`${signal} received — shutting down gracefully...`);
    const timeout = setTimeout(() => {
      logger.error('Shutdown timeout (30s) exceeded — forcing exit');
      process.exit(1);
    }, 30_000);
    try {
      await app.close();
      clearTimeout(timeout);
      logger.log('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err);
      clearTimeout(timeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
