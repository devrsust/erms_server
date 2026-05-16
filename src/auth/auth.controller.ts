import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginAlumniDto } from './dto/login-alumni.dto';

import { ActivityService } from 'src/activity/activity.service';
import { type AuthRequest, JwtAuthGuard } from 'lib/jwt.strategy';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly activityService: ActivityService
  ) {}

  // =========================
  // LOGIN USER
  // =========================
  @Post("login/user")
  async loginUser(@Body() data: LoginUserDto) {
    const result = await this.authService.loginUser(data);

    // optional activity log (only on success)
    if (result?.status === 200 && result.user) {
      try {
        await this.activityService.create({
          action: "LOGIN",
          entity: "USER",
          description: `User ${result.user.email} logged in`,
          actorType: String(result.user.role?.name || 'USER'),
          actorId: String(result.user.id),
        });
      } catch (e) {
        console.error("Activity log failed:", e);
      }
    }

    return result;
  }

  // =========================
  // LOGIN ALUMNI
  // =========================
  @Post("login/alumni")
  async loginAlumni(@Body() data: LoginAlumniDto) {
    const result = await this.authService.loginAlumni(data);

    if (result?.status === 200 && result.user) {
      try {
        await this.activityService.create({
          action: "LOGIN",
          entity: "ALUMNI",
          description: `Alumni ${result.user.email} logged in`,
          actorType: "ALUMNI",
          actorId: String(result.user.id),
        });
      } catch (e) {
        console.error("Activity log failed:", e);
      }
    }

    return result;
  }

  // =========================
  // LOGOUT (SECURED)
  // =========================
  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout(@Req() req: AuthRequest) {
    const user = req.user;

    const result = await this.authService.logout(user);

    try {
      await this.activityService.create({
        action: "LOGOUT",
        entity: "AUTH",
        description: `User ${user.email || user.id} logged out`,
        actorType: String(user.role),
        actorId: String(user.id),
      });
    } catch (e) {
      console.error("Activity log failed:", e);
    }

    return result;
  }


}