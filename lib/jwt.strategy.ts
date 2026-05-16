import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface JwtPayload {
    sub: number;
    email?: string;
    role?: string;
    roleId?: number;
    iat?: number;
    exp?: number;
}

export interface AuthRequest extends Request {
    user: {
        id: number;
        email?: string;
        role: string;
        roleId?: number;
    };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthRequest>();

        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid authorization header');
        }

        const token = authHeader.replace('Bearer ', '').trim();

        if (!token) {
            throw new UnauthorizedException('Token not provided');
        }

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
                secret: this.configService.get<string>('JWT_SECRET'),
            });

            if (!payload?.sub) {
                throw new UnauthorizedException('Invalid token payload');
            }

            request.user = {
                id: payload.sub,
                email: payload.email,
                role: payload.role ?? 'USER',
                roleId: payload.roleId,
            };

            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}