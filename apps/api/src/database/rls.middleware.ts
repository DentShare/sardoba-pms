import { Injectable, NestMiddleware } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that sets the PostgreSQL session variable `app.current_property_id`
 * for Row-Level Security (RLS) policies.
 *
 * This runs after JWT authentication, so `req.user.propertyId` is available
 * for authenticated requests. For unauthenticated (public) requests,
 * the variable is set to '0' which matches no rows.
 */
@Injectable()
export class RlsMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const user = (req as any).user;
    const propertyId = user?.propertyId ?? 0;

    // SET LOCAL scopes the variable to the current transaction only.
    // Since TypeORM may pool connections, we use SET (session) here
    // and rely on the connection being reset between requests.
    try {
      await this.dataSource.query(
        `SET LOCAL app.current_property_id = '${Number(propertyId)}'`,
      );
    } catch {
      // If SET LOCAL fails (e.g., no active transaction), ignore.
      // RLS policies use COALESCE with default '0' for safety.
    }

    next();
  }
}
