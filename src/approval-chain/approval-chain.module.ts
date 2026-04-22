import { Module } from '@nestjs/common';
import { ApprovalChainService } from './approval-chain.service';
import { ApprovalChainController } from './approval-chain.controller';

@Module({
  controllers: [ApprovalChainController],
  providers: [ApprovalChainService],
})
export class ApprovalChainModule {}
