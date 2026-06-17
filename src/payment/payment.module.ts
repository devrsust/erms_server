import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaystackService } from '../paystack/paystack.service';
import { PaystackModule } from '../paystack/paystack.module';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports:[PaystackModule, ActivityModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule { }
