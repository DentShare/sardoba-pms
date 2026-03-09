import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  uptime: number;
  timestamp: string;
  version: string;
}

interface DetailedHealthStatus extends HealthStatus {
  database: {
    status: 'up' | 'down';
    response_time_ms?: number;
    error?: string;
  };
  redis: {
    status: 'up' | 'down' | 'not_configured';
    response_time_ms?: number;
    error?: string;
  };
  memory: {
    rss_mb: number;
    heap_used_mb: number;
    heap_total_mb: number;
  };
}

/**
 * Health check controller for monitoring and load balancer probes.
 *
 * GET /v1/health          - Basic health check (fast, for load balancers)
 * GET /v1/health/detailed - Full check with DB and Redis connectivity
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({
    status: 200,
    description: 'Service is running',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        uptime: { type: 'number', example: 12345 },
        timestamp: { type: 'string', example: '2025-01-01T00:00:00.000Z' },
        version: { type: 'string', example: '0.1.0' },
      },
    },
  })
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with DB and Redis status' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health status including database and Redis connectivity',
  })
  async getDetailedHealth(): Promise<DetailedHealthStatus> {
    const dbStatus = await this.checkDatabase();
    const redisStatus = await this.checkRedis();

    const memUsage = process.memoryUsage();

    // Determine overall status
    let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';
    if (dbStatus.status === 'down') {
      overallStatus = 'error';
    } else if (redisStatus.status === 'down') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      database: dbStatus,
      redis: redisStatus,
      memory: {
        rss_mb: Math.round(memUsage.rss / 1024 / 1024),
        heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
    };
  }

  /**
   * Check database connectivity by running a simple query.
   */
  private async checkDatabase(): Promise<DetailedHealthStatus['database']> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'up',
        response_time_ms: Date.now() - start,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error';
      this.logger.error(`Database health check failed: ${message}`);
      return {
        status: 'down',
        response_time_ms: Date.now() - start,
        error: message,
      };
    }
  }

  /**
   * Check Redis connectivity.
   * Uses ioredis directly to ping the Redis instance.
   */
  private async checkRedis(): Promise<DetailedHealthStatus['redis']> {
    const redisUrl = this.configService.get<string>('REDIS_URL', '');

    if (!redisUrl) {
      return { status: 'not_configured' };
    }

    const start = Date.now();
    let Redis: typeof import('ioredis').default;

    try {
      // Dynamic import to avoid hard dependency if ioredis is not available
      const ioredis = await import('ioredis');
      Redis = ioredis.default;
    } catch {
      return { status: 'not_configured' };
    }

    let client: InstanceType<typeof Redis> | null = null;
    try {
      const redisPassword = this.configService.get<string>(
        'REDIS_PASSWORD',
        '',
      );

      client = new Redis(redisUrl, {
        password: redisPassword || undefined,
        connectTimeout: 3000,
        lazyConnect: true,
      });

      await client.connect();
      await client.ping();

      return {
        status: 'up',
        response_time_ms: Date.now() - start,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Redis error';
      this.logger.warn(`Redis health check failed: ${message}`);
      return {
        status: 'down',
        response_time_ms: Date.now() - start,
        error: message,
      };
    } finally {
      if (client) {
        try {
          await client.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
    }
  }
}
