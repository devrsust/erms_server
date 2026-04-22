import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PaystackService } from '../paystack/paystack.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
    private readonly configService: ConfigService,
  ) { }

  async initPayment(payload: any) {

    console.log(payload);

    const { user, price, processing_fee, document } = payload;
    const amount = Number(price) + Number(processing_fee);

    const userId = typeof user === "object" ? user.id : user;
    console.log('Extracted userId:', userId);
    console.log('userId type:', typeof userId);

    // Ensure userId exists in database
    const existingUser = await this.prisma.alumni.findUnique({
      where: { id: userId },
    });

    console.log(existingUser);

    if (!existingUser) {
      throw new HttpException(
        `User with ID ${userId} does not exist`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const paymentRecord = await this.prisma.payment.create({
        data: {
          userId: userId,
          status: "PENDING",
          gateway_name: "PAYSTACK",
          totalAmount: amount
        }
      });

      const paystackInit = await this.paystack.initializePayment({
        email: user.email,
        amount: amount * 100, // Paystack expects kobo
        subaccount: this.configService.get("PAYSTACK_SUBACCOUNT"),
        transaction_charge: Number(document?.processing_fee || processing_fee) * 100,
        metadata: {
          payment_id: paymentRecord.id,
          user_id: user.id,
        },
      });

      if (!paystackInit.status) {
        throw new HttpException(
          paystackInit.message || "Failed to initialize payment",
          HttpStatus.BAD_REQUEST,
        );
      }

      const payData = await paystackInit.data;

      console.log(paymentRecord);

      try {
        const updatedPayment = await this.prisma.payment.update({
          where: { id: paymentRecord.id },
          data: {
            transaction_id: payData.reference,
            reference: payData.reference,
            access_code: payData.access_code,
            email: user.email,
            gateway_response: {
              status: paystackInit.status,
              message: paystackInit.message,
              data: payData,
            },
          },
        });

        console.log("✅ Payment record updated:", updatedPayment);
      } catch (err: any) {
        console.error("❌ Failed to update payment record:", err);
        throw new HttpException(
          err?.message || "Failed to update payment record",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return {
        payment_id: paymentRecord.id,
        message: "Payment initialized successfully",
        ...payData.data
      };

    } catch (error) {
      console.error("❌ Payment init error:", error);
      throw new HttpException(
        error?.message || "Failed to initialize payment",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

  }

  async findAll() {
    try {
      const payments = await this.prisma.payment.findMany({
        select: {
          id: true,
          transaction_id: true,
          totalAmount: true,
          status: true,
          user: {
            select: {
              id: true,
              matric_number: true,
              email: true
            }
          },
          createdAt: true
        }
      })

      return {
        status: 200,
        data: payments
      }
    } catch (error) {
      return {
        status: 500,
        message: `An error occured ${error}`
      }
    }
  }

  async findAllByUser(userId: number) {
    const userTransactions = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        transaction_id: true,
        totalAmount: true,
        createdAt: true,
        request: {
          select: {
            id: true,
            type: true,
            reference_number: true,
            document: true
          }
        }
      }
    })

    return {
      status: 200,
      data: userTransactions
    }
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: id },
      include: {
        request: true,
        user: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    if (!payment) {
      throw new HttpException("Payment not found", HttpStatus.NOT_FOUND);
    }

    return payment;
  }

  async updatePayment(
    paymentId: string,
    updateData: Partial<{
      transaction_id: string;
      reference: string;
      access_code: string;
      gateway_response: any;
      status: string;
      email: string;
    }>,
  ) {
    try {
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          ...updateData,
        },
      });

      return updatedPayment;
    } catch (err: any) {
      console.error("❌ Failed to update payment:", err);
      throw new HttpException(
        err?.message || "Failed to update payment",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
