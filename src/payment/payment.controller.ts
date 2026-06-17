import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  Query,
  UseGuards,
  ParseIntPipe
} from '@nestjs/common';
import { Request } from 'express';

import { PaymentService } from './payment.service';
import { ActivityService } from '../activity/activity.service';

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
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
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
  // INITIALIZE PAYMENT
  // =========================================
  @Post("init")
  async initPayment(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      request: string;
      type: string;
      destination: string;
      price: number;
      processing_fee: number;
      document: any;
      user?: any;
    }
  ) {
    const actor = req.user;

    // If user isn’t attached on body, attach from authenticated request
    const payload = {
      ...body,
      user: body.user || actor,
    };

    const response = await this.paymentService.initPayment(payload);

    await this.logActivity({
      action: 'CREATE',
      entity: 'PAYMENT',
      description: `User ${actor.email} initiated a payment gateway session for type: ${body.type}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // UPDATE PAYMENT
  // =========================================
  @Patch(":id")
  async updatePayment(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body()
    body: Partial<{
      transaction_id: string;
      reference: string;
      access_code: string;
      gateway_response: any;
      status: string;
      email: string;
    }>
  ) {
    const actor = req.user;

    const response = await this.paymentService.updatePayment(id, body);

    await this.logActivity({
      action: 'UPDATE',
      entity: 'PAYMENT',
      description: `User ${actor.email} modified payment status/reference tracking details for Payment ID ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // FETCH ALL PAYMENTS (ADMIN)
  // =========================================
  @Get()
  async getAllPayments(
    @Req() req: AuthenticatedRequest,
    @Query('page') page = '1',
    @Query('limit') limit = '10'
  ) {
    const actor = req.user;

    // Matches the paginated architecture blueprint pattern
    const response = await this.paymentService.findAll(
      Number(page),
      Number(limit),
    );

    await this.logActivity({
      action: 'VIEW',
      entity: 'PAYMENT',
      description: `Admin ${actor.email} viewed ledger audit list of all system payments (Page ${page}, Limit ${limit})`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // FETCH SINGLE PAYMENT BY ID
  // =========================================
  @Get(":id")
  async getPaymentById(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.paymentService.findOne(id);

    await this.logActivity({
      action: 'VIEW',
      entity: 'PAYMENT',
      description: `User ${actor.email} requested details for ledger payment item ID ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  // =========================================
  // FETCH PAYMENTS BY USER ID
  // =========================================
  @Get("user/:userId")
  async getPaymentsByUser(
    @Param("userId", ParseIntPipe) userId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const actor = req.user;

    const response = await this.paymentService.findAllByUser(userId);

    await this.logActivity({
      action: 'VIEW',
      entity: 'PAYMENT',
      description: `User ${actor.email} requested transactional payment history logs for target User ID ${userId}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }
}