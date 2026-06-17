import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginAlumniDto } from './dto/login-alumni.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

import { ActivityService } from 'src/activity/activity.service';
import { type AuthRequest, JwtAuthGuard } from 'lib/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly activityService: ActivityService,
  ) { }

  // =========================
  // LOGIN USER
  // =========================
  @Post('login/user')
  @HttpCode(HttpStatus.OK)
  async loginUser(@Body() data: LoginUserDto): Promise<any> {
    const result = await this.authService.loginUser(data);

    if (result?.status === HttpStatus.OK && result.user) {
      await this.logEvent({
        action: 'LOGIN',
        entity: 'USER',
        description: `User ${result.user.email} logged in`,
        actorType: String(result.user.role?.name || 'USER'),
        actorId: String(result.user.id),
      });
    }

    return result;
  }

  // =========================
  // LOGIN ALUMNI
  // =========================
  @Post('login/alumni')
  @HttpCode(HttpStatus.OK)
  async loginAlumni(@Body() data: LoginAlumniDto): Promise<any> {
    const result = await this.authService.loginAlumni(data);

    if (result?.status === HttpStatus.OK && result.user) {
      await this.logEvent({
        action: 'LOGIN',
        entity: 'ALUMNI',
        description: `Alumni ${result.user.email} logged in`,
        actorType: 'ALUMNI',
        actorId: String(result.user.id),
      });
    }

    return result;
  }

  // =========================
  // LOGOUT
  // =========================
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthRequest): Promise<any> {
    const { user } = req;
    const result = await this.authService.logout(user);

    await this.logEvent({
      action: 'LOGOUT',
      entity: 'AUTH',
      description: `User ${user.email || user.id} logged out`,
      actorType: String(user.role),
      actorId: String(user.id),
    });

    return result;
  }

  // =========================
  // GET PROFILE
  // =========================
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: AuthRequest): Promise<any> {
    const userId = req.user.id;
    const profile = await this.authService.getProfile(userId);

    await this.logEvent({
      action: 'VIEW',
      entity: 'PROFILE',
      description: `User ${req.user.email || req.user.id} viewed profile`,
      actorType: String(req.user.role),
      actorId: String(req.user.id),
    });

    return profile;
  }

  // =========================
  // UPDATE PROFILE (SECURED)
  // =========================
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Req() req: AuthRequest,
    @Body() dto: UpdateProfileDto, // Now fully secured via runtime validation rules
  ): Promise<any> {
    const userId = req.user.id;
    const updated = await this.authService.updateProfile(userId, dto);

    await this.logEvent({
      action: 'UPDATE',
      entity: 'PROFILE',
      description: `User ${req.user.email || req.user.id} updated profile`,
      actorType: String(req.user.role),
      actorId: String(req.user.id),
    });

    return updated;
  }

  // =========================
  // CHANGE PASSWORD
  // =========================
  @UseGuards(JwtAuthGuard)
  @Patch('profile/password')
  async changePassword(
    @Req() req: AuthRequest,
    @Body() dto: ChangePasswordDto,
  ): Promise<any> {
    const result = await this.authService.changePassword(req.user.id, dto);

    await this.logEvent({
      action: 'UPDATE',
      entity: 'AUTH',
      description: `User ${req.user.email || req.user.id} changed password`,
      actorType: String(req.user.role),
      actorId: String(req.user.id),
    });

    return result;
  }

  // ==========================================================
  // PRIVATE SECURITY & STRUCTURAL AUDIT LOGGING COURIER
  // ==========================================================
  private async logEvent(payload: {
    action: string;
    entity: string;
    description: string;
    actorType: string;
    actorId: string;
  }): Promise<void> {
    try {
      await this.activityService.create(payload);
    } catch (error: unknown) {
      // Check if it's a standard Error object
      const errorMessage = error instanceof Error ? error.message : 'Unknown system error';
      console.error('Audit Log Pipeline Failure:', errorMessage);
    }
  }
}