import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditLogAction } from '../audit-logs/audit-log-action';
import { AuditLogEntityType } from '../audit-logs/audit-log-entity-type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { TeamMemberResponse } from './dto/team-member-response.type';
import { UpdateTeamMemberRoleDto } from './dto/update-team-member-role.dto';

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async findMembers(): Promise<TeamMemberResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    const members = await this.prisma.user.findMany({
      where: { tenantId },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return members.map((member) => this.toResponse(member));
  }

  async createMember(dto: CreateTeamMemberDto): Promise<TeamMemberResponse> {
    const tenantId = this.tenantContext.getTenantId();
    const email = dto.email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      const member = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: dto.role,
          tenantId,
        },
      });

      await this.auditLogs.record({
        action: AuditLogAction.TeamMemberCreated,
        entityType: AuditLogEntityType.TeamMember,
        entityId: member.id,
        metadata: {
          email: member.email,
          role: member.role,
        },
      });

      return this.toResponse(member);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }

  async updateMemberRole(
    id: number,
    dto: UpdateTeamMemberRoleDto,
  ): Promise<TeamMemberResponse> {
    const tenantId = this.tenantContext.getTenantId();
    const member = await this.findMemberOrThrow(id, tenantId);

    if (member.role === Role.ADMIN && dto.role !== Role.ADMIN) {
      await this.ensureAnotherAdminExists(member.id, tenantId);
    }

    const updated = await this.prisma.user.update({
      where: { id: member.id, tenantId },
      data: { role: dto.role },
    });

    await this.auditLogs.record({
      action: AuditLogAction.TeamMemberRoleUpdated,
      entityType: AuditLogEntityType.TeamMember,
      entityId: updated.id,
      metadata: {
        email: updated.email,
        fromRole: member.role,
        toRole: updated.role,
      },
    });

    return this.toResponse(updated);
  }

  async deleteMember(id: number): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();
    const actorUserId = this.tenantContext.getActorUserId();
    const member = await this.findMemberOrThrow(id, tenantId);

    if (member.id === actorUserId) {
      throw new BadRequestException('You cannot delete yourself');
    }

    if (member.role === Role.ADMIN) {
      await this.ensureAnotherAdminExists(member.id, tenantId);
    }

    await this.prisma.user.delete({
      where: { id: member.id, tenantId },
    });

    await this.auditLogs.record({
      action: AuditLogAction.TeamMemberDeleted,
      entityType: AuditLogEntityType.TeamMember,
      entityId: member.id,
      metadata: {
        email: member.email,
        role: member.role,
      },
    });
  }

  private async findMemberOrThrow(id: number, tenantId: number) {
    const member = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!member) {
      throw new NotFoundException(`Team member with id=${id} not found`);
    }

    return member;
  }

  private async ensureAnotherAdminExists(
    currentAdminId: number,
    tenantId: number,
  ): Promise<void> {
    const otherAdminCount = await this.prisma.user.count({
      where: {
        tenantId,
        role: Role.ADMIN,
        id: { not: currentAdminId },
      },
    });

    if (otherAdminCount === 0) {
      throw new ForbiddenException('At least one admin is required');
    }
  }

  private toResponse(member: {
    id: number;
    email: string;
    role: Role;
    createdAt: Date;
  }): TeamMemberResponse {
    return {
      id: member.id,
      email: member.email,
      role: member.role,
      createdAt: member.createdAt,
    };
  }
}
