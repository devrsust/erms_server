import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Patch,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginAlumniDto } from './dto/login-alumni.dto';

import { ActivityService } from 'src/activity/activity.service';
import { type AuthRequest, JwtAuthGuard } from 'lib/jwt.strategy';
import { ChangePasswordDto } from './dto/change-password.dto';

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
  async loginUser(@Body() data: LoginUserDto) {
    const result = await this.authService.loginUser(data);

    if (result?.status === 200 && result.user) {
      await this.activityService.create({
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
  async loginAlumni(@Body() data: LoginAlumniDto) {
    const result = await this.authService.loginAlumni(data);

    if (result?.status === 200 && result.user) {
      await this.activityService.create({
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
  async logout(@Req() req: AuthRequest) {
    const user = req.user;

    const result = await this.authService.logout(user);

    await this.activityService.create({
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
  async getProfile(@Req() req: AuthRequest) {
    const userId = req.user.id;

    const profile = await this.authService.getProfile(userId);

    await this.activityService.create({
      action: 'VIEW',
      entity: 'PROFILE',
      description: `User ${req.user.email || req.user.id} viewed profile`,
      actorType: String(req.user.role),
      actorId: String(req.user.id),
    });

    return profile;
  }

  // =========================
  // UPDATE PROFILE (USER ONLY)
  // =========================
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Req() req: AuthRequest,
    @Body() data: { firstname?: string; lastname?: string; email?: string },
  ) {
    const userId = req.user.id;

    const updated = await this.authService.updateProfile(userId, data);

    await this.activityService.create({
      action: 'UPDATE',
      entity: 'PROFILE',
      description: `User ${req.user.email || req.user.id} updated profile`,
      actorType: String(req.user.role),
      actorId: String(req.user.id),
    });

    return updated;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile/password')
  async changePassword(
    @Req() req: AuthRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(req.user.id, dto);

    await this.activityService.create({
      action: 'UPDATE',
      entity: 'AUTH',
      description: `User ${req.user.email || req.user.id} changed password`,
      actorType: String(req.user.role),
      actorId: String(req.user.id),
    });

    return result;
  }
}