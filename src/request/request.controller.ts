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
  UseGuards
} from '@nestjs/common';
import { Request } from 'express';

import { RequestService } from './request.service';
import { ActivityService } from '../activity/activity.service';

import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
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
@Controller('request')
export class RequestController {
  constructor(
    private readonly requestService: RequestService,
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
  // CREATE REQUEST
  // =========================================
  @Post()
  async create(
    @Body() dto: CreateRequestDto & { paymentId: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;
    const { paymentId, ...requestData } = dto;

    const response = await this.requestService.create(paymentId, requestData);

    await this.logActivity({
      action: 'CREATE',
      entity: 'REQUEST',
      description: `User ${actor.email} created a new document request. Payment linked: ${paymentId}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // GET ALL REQUESTS
  // =========================================
  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page = '1',
    @Query('limit') limit = '10'
  ) {
    const actor = req.user;

    const response = await this.requestService.findAll(
      Number(page),
      Number(limit),
    );

    await this.logActivity({
      action: 'VIEW',
      entity: 'REQUEST',
      description: `User ${actor.email} viewed all document requests (Page ${page}, Limit ${limit})`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // GET ALL REQUESTS BY USER
  // =========================================
  @Get('user/:userId')
  async findAllByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.requestService.findAllByUser(userId);

    await this.logActivity({
      action: 'VIEW',
      entity: 'REQUEST',
      description: `User ${actor.email} viewed document requests owned by User ID ${userId}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // GET SINGLE REQUEST
  // =========================================
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.requestService.findOne(id);

    await this.logActivity({
      action: 'VIEW',
      entity: 'REQUEST',
      description: `User ${actor.email} viewed details for request ID ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // GET SINGLE REQUEST (ADMIN ROUTE)
  // =========================================
  @Get('admin/:id')
  async findOneByAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.requestService.findOneByAdmins(id);

    await this.logActivity({
      action: 'VIEW',
      entity: 'REQUEST',
      description: `Admin ${actor.email} accessed request ID ${id} via administrative oversight route`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // GET PENDING APPROVALS FOR USER
  // =========================================
  @Get('pending/:userId')
  async getPendingApprovals(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.requestService.getPendingApprovals(userId);

    await this.logActivity({
      action: 'VIEW',
      entity: 'REQUEST',
      description: `User ${actor.email} requested pending request approval actions queue for User ID ${userId}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // UPDATE REQUEST
  // =========================================
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRequestDto: UpdateRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.requestService.update(id, updateRequestDto);

    await this.logActivity({
      action: 'UPDATE',
      entity: 'REQUEST',
      description: `User ${actor.email} modified configuration payloads on request ID ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // DELETE REQUEST
  // =========================================
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.requestService.remove(id);

    await this.logActivity({
      action: 'DELETE',
      entity: 'REQUEST',
      description: `User ${actor.email} deleted request entry record with ID ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }
}