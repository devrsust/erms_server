import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';

@Module({
  controllers: [ApprovalController],
  providers: [ApprovalService],
})
export class ApprovalModule {}
