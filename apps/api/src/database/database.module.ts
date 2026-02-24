import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('DATABASE_URL'),
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: true,
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
        ssl:
          config.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
        extra: {
          max: config.get<number>('DATABASE_POOL_MAX', 10),
          min: config.get<number>('DATABASE_POOL_MIN', 2),
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
