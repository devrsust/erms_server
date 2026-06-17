import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';

import { ApprovalService } from './approval.service';
import { ActivityService } from '../activity/activity.service';

import { CreateApprovalDto } from './dto/create-approval.dto';
import { FindAllApprovalsQueryDto } from './dto/find-all.dto';
import { JwtAuthGuard } from 'lib/jwt.strategy';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email?: string;
    role: string;
    roleId?: number;
  };
}

@ApiTags('approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('approvals')
export class ApprovalController {
  constructor(
    private readonly approvalService: ApprovalService,
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
  // CREATE APPROVAL
  // =========================================
  @Post()
  @HttpCode(200) // Forces actual HTTP status to match Swagger documentation
  @ApiOperation({ summary: 'Create a new approval (approve/reject a request step)' })
  @ApiResponse({ status: 200, description: 'Approval processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request (step already processed or request not pending)' })
  @ApiResponse({ status: 403, description: 'Forbidden (user not authorized for this step)' })
  @ApiResponse({ status: 404, description: 'Request or step not found' })
  async create(
    @Body() createApprovalDto: CreateApprovalDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.approvalService.create(createApprovalDto);

    await this.logActivity({
      action: 'CREATE',
      entity: 'APPROVAL',
      description: `Admin ${actor.email} processed an approval step`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // GET ALL APPROVALS
  // =========================================
  @Get()
  @ApiOperation({ summary: 'Get all approvals with pagination & search' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, example: '' })
  @ApiResponse({ status: 200 })
  async findAll(
    @Query() query: FindAllApprovalsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.approvalService.findAll(query);

    await this.logActivity({
      action: 'VIEW',
      entity: 'APPROVAL',
      description: `Admin ${actor?.email} viewed approvals`,
      actorType: actor?.role || 'ADMIN',
      actorId: String(actor?.id),
    });

    return response;
  }

  // =========================================
  // GET SINGLE APPROVAL
  // =========================================
  @Get(':id')
  @ApiOperation({ summary: 'Get approval by ID' })
  @ApiResponse({ status: 200, description: 'Returns approval details' })
  @ApiResponse({ status: 404, description: 'Approval not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.approvalService.findOne(id);

    await this.logActivity({
      action: 'VIEW',
      entity: 'APPROVAL',
      description: `Admin ${actor.email} viewed approval ID ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }
}