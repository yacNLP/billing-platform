import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { TeamMemberResponse } from './dto/team-member-response.type';
import { UpdateTeamMemberRoleDto } from './dto/update-team-member-role.dto';
import { TeamService } from './team.service';

@ApiTags('team')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('team/members')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  findMembers(): Promise<TeamMemberResponse[]> {
    return this.teamService.findMembers();
  }

  @Post()
  createMember(@Body() dto: CreateTeamMemberDto): Promise<TeamMemberResponse> {
    return this.teamService.createMember(dto);
  }

  @Patch(':id/role')
  updateMemberRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamMemberRoleDto,
  ): Promise<TeamMemberResponse> {
    return this.teamService.updateMemberRole(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteMember(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.teamService.deleteMember(id);
  }
}
