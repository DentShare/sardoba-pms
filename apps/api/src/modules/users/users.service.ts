import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { User, UserRole } from '@/database/entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async listByProperty(propertyId: number) {
    const users = await this.userRepository.find({
      where: { propertyId },
      order: { createdAt: 'ASC' },
    });

    return users.map((u) => this.toResponse(u));
  }

  async invite(propertyId: number, email: string, role: UserRole) {
    const existing = await this.userRepository.findOne({
      where: { propertyId, email },
    });

    if (existing) {
      throw new SardobaException(ErrorCode.ALREADY_EXISTS, {
        email,
        message: 'User already exists for this property',
      });
    }

    const tempPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = this.userRepository.create({
      propertyId,
      name: email.split('@')[0],
      email,
      passwordHash,
      role,
      isActive: true,
    });

    const saved = await this.userRepository.save(user);
    return this.toResponse(saved, 'invited');
  }

  async updateRole(
    userId: number,
    propertyId: number,
    role: UserRole,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId, propertyId },
    });

    if (!user) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'user',
        id: userId,
      });
    }

    if (user.role === 'owner') {
      throw new SardobaException(ErrorCode.FORBIDDEN, {
        reason: 'Cannot change owner role',
      });
    }

    user.role = role;
    const saved = await this.userRepository.save(user);
    return this.toResponse(saved);
  }

  async remove(userId: number, propertyId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId, propertyId },
    });

    if (!user) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'user',
        id: userId,
      });
    }

    if (user.role === 'owner') {
      throw new SardobaException(ErrorCode.FORBIDDEN, {
        reason: 'Cannot remove owner',
      });
    }

    await this.userRepository.remove(user);
  }

  private toResponse(user: User, statusOverride?: string) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: statusOverride ?? (user.isActive ? 'active' : 'disabled'),
      created_at: user.createdAt,
    };
  }
}
