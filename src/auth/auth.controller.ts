import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginAlumniDto } from './dto/login-alumni.dto';
import { JwtService } from '@nestjs/jwt';
import { type Request } from 'express';

@Controller({
  path: 'auth',
  version: "1"
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService
  ) { }

  @Post("login/user")
  loginUser(@Body() data: LoginUserDto) {
    return this.authService.loginUser(data);
  }

  @Post("login/alumni")
  loginAlumni(@Body() data: LoginAlumniDto) {
    return this.authService.loginAlumni(data);
  }

  @Post("logout")
  logout(
    @Req() request: Request,
    @Body() body: { user: any }
  ) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        status: 200,
        message: "Logged out successfully",
        header: authHeader
      }
    }

    const token = authHeader.substring(7);
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      return {
        status: 400,
        message: "Invalid or expired token",
        error: error
      }
    }

    if (!body?.user) {
      return {
        status: 400,
        message: "User data missing",
      }
    }

    return this.authService.logout(body.user);
  }

}
