import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

interface AuthenticatedRequest {
  user: {
    sub: number;
    role: string;
    propertyId: number;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users for the current property' })
  async list(@Req() req: AuthenticatedRequest) {
    return this.usersService.listByProperty(req.user.propertyId);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a new user by email' })
  async invite(
    @Body() dto: { email: string; role: 'admin' | 'viewer' },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.invite(req.user.propertyId, dto.email, dto.role);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user role' })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { role: 'admin' | 'viewer' },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateRole(id, req.user.propertyId, dto.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove user from property' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.usersService.remove(id, req.user.propertyId);
  }
}
