import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { ActivityModule } from 'src/activity/activity.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    ActivityModule, AuthModule
  ],
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule { }
