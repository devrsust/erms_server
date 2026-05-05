import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RsuApiModule } from '../rsu-api/rsu-api.module';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRATION_TIME"),
        },
      }),
    }),
    RsuApiModule,
    ActivityModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule { }
