// Auth Module — AGENT-03
// Main exports for use by other modules

export { AuthModule } from './auth.module';
export { AuthService } from './auth.service';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { JwtRefreshGuard } from './guards/jwt-refresh.guard';
export { RolesGuard } from './guards/roles.guard';
export { PropertyGuard } from './guards/property.guard';

// Decorators
export { CurrentUser } from './decorators/current-user.decorator';
export { Roles, ROLES_KEY } from './decorators/roles.decorator';
export { Public, IS_PUBLIC_KEY } from './decorators/public.decorator';

// Strategies & Types
export { JwtPayload } from './strategies/jwt.strategy';
export { JwtRefreshPayload } from './strategies/jwt-refresh.strategy';

// DTOs
export { LoginDto } from './dto/login.dto';
export { RegisterDto } from './dto/register.dto';
export { RefreshDto } from './dto/refresh.dto';
export {
  AuthResponseDto,
  RefreshResponseDto,
  MeResponseDto,
} from './dto/auth-response.dto';
