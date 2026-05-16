import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { RoleService } from './role.service';
import { ActivityService } from '../activity/activity.service';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from 'lib/jwt.strategy';


interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email?: string;
    role: string;
    roleId?: number;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('role')
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly activityService: ActivityService,
  ) { }

  private async logActivity(payload: {
    action: string;
    entity: string;
    description: string;
    actorType: string;
    actorId: string;
  }) {
    try {
      await this.activityService.create(payload);
    } catch (error) {
      console.error('Activity log failed:', error);
    }
  }

  // =========================================
  // CREATE ROLE
  // =========================================
  @Post()
  async create(
    @Body() createRoleDto: CreateRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.roleService.create(createRoleDto);

    await this.logActivity({
      action: 'CREATE',
      entity: 'ROLE',
      description: `Admin ${actor.email} created role ${createRoleDto.name}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // GET ALL ROLES
  // =========================================
  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page = '1',
    @Query('limit') limit = '10'
  ) {
    const actor = req.user;

    const response = await this.roleService.findAll(
      Number(page),
      Number(limit),
    );

    await this.activityService.create({
      action: 'VIEW',
      entity: 'ROLE',
      description: `Admin ${actor?.email} viewed roles`,
      actorType: actor?.role || 'ADMIN',
      actorId: String(actor?.id),
    });

    return response;
  }

  // =========================================
  // GET SINGLE ROLE
  // =========================================
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.roleService.findOne(id);

    await this.logActivity({
      action: 'VIEW',
      entity: 'ROLE',
      description: `Admin ${actor.email} viewed role ID ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // UPDATE ROLE
  // =========================================
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.roleService.update(
      id,
      updateRoleDto,
    );

    await this.logActivity({
      action: 'UPDATE',
      entity: 'ROLE',
      description: `Admin ${actor.email} updated role ID ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // DELETE ROLE
  // =========================================
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.roleService.remove(id);

    await this.logActivity({
      action: 'DELETE',
      entity: 'ROLE',
      description: `Admin ${actor.email} deleted role ID ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }
}