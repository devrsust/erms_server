import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import crypto from "node:crypto";
import axios from "axios";


export type PaystackPaymentResponse = {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

@Injectable()
export class PaystackService {

  constructor(
    private prisma: PrismaService,
    private readonly configService: ConfigService
  ) { }

  private baseUrl = "https://api.paystack.co";
  protected http = axios;

  get config() {
    return {
      secret_key: this.configService.get<string>("PAYSTACK_SECRET_KEY"),
      public_key: this.configService.get<string>("PAYSTACK_PUBLIC_KEY"),
      subaccount: this.configService.get<string | undefined>(
        "PAYSTACK_SUBACCOUNT"
      ),
      callback_url: this.configService.get<string | undefined>(
        "PAYSTACK_CALLBACK_URL"
      ),
    };
  }

  async verifyWebhook(signature: string, payload: any): Promise<boolean> {
    const secret = this.config.secret_key;

    if (!secret) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }

    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(payload))
      .digest("hex");

    return hash === signature;
  }

  async initializePayment(data: {
    email: string;
    amount: number;
    subaccount?: string;
    transaction_charge?: number;
    callback_url?: string;
    reference?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const gateway = this.config;

    return this.http<PaystackPaymentResponse>({
      method: "POST",
      url: `${this.baseUrl}/transaction/initialize`,
      headers: {
        Authorization: `Bearer ${gateway.secret_key}`,
        "Content-Type": "application/json",
      },
      data: {
        email: data.email,
        amount: data.amount,
        // subaccount: data.subaccount || gateway.subaccount || undefined,
        transaction_charge: data.transaction_charge,
        callback_url: data.callback_url || gateway.callback_url || undefined,
        reference: data.reference,
        metadata: data.metadata,
      },
    });
  }

  async handleWebhook(payload: { event: string; data: any }) {
    switch (payload.event) {
      case "charge.success":
        return this.chargeSuccess(payload.data);

      case "charge.failed":
        console.warn("Processing Paystack charge failed webhook");
        break;

      case "transfer.success":
        console.log("Processing Paystack transfer success webhook");
        break;

      case "transfer.failed":
        console.warn("Processing Paystack transfer failed webhook");
        break;

      default:
        console.debug(`Unknown Paystack webhook event: ${payload.event}`);
    }
  }

  private async chargeSuccess(payload: any) {
    const payment = await this.prisma.payment.update({
      where: {
        reference: payload.reference,
      },
      data: {
        status: "SUCCESSFUL",
      },
    });

    if (!payment)
      throw new HttpException(
        "Failed to updated payment",
        HttpStatus.BAD_REQUEST
      );

    return {
      success: true,
    };
  }

  async verifyPayment(reference: string): Promise<any> {
    const gateway = this.config;

    const res = await this.http({
      method: "GET",
      url: `${this.baseUrl}/transaction/verify/${reference}`,
      headers: {
        Authorization: `Bearer ${gateway.secret_key}`,
      },
    });

    return res.data?.data;
  }

}
