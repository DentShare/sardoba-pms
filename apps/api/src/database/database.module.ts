import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        return {
          type: 'postgres' as const,
          url: config.get<string>('DATABASE_URL'),
          entities: [__dirname + '/entities/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/!(index).js'],
          migrationsRun: true,
          synchronize: false,
          logging: isProduction ? ['error', 'warn', 'migration'] : true,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
          extra: {
            max: config.get<number>('DATABASE_POOL_MAX', isProduction ? 20 : 10),
            min: config.get<number>('DATABASE_POOL_MIN', isProduction ? 5 : 2),
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
