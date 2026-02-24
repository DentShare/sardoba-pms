import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * TypeORM CLI data source configuration.
 * Used by migration:generate, migration:run, migration:revert commands.
 *
 * Usage:
 *   npx typeorm-ts-node-commonjs -d apps/api/src/database/data-source.ts migration:run
 */
const options: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sardoba_dev',
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsRun: false,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

export const AppDataSource = new DataSource(options);
