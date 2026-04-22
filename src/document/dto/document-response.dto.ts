// dto/document-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Document, User } from 'generated/prisma/client';

class UserSummary {
  @ApiProperty() id: number;
  @ApiProperty() firstname: string;
  @ApiProperty() lastname: string;
  @ApiProperty() email: string;
}

class ApprovalChainSummary {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class DocumentResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() title: string;
  @ApiProperty({ required: false }) description?: string;
  @ApiProperty() status: string;
  @ApiProperty() price: number;
  @ApiProperty() processingFee: number;
  @ApiProperty() totalAmount: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: UserSummary }) createdBy: UserSummary;
  @ApiProperty({ type: ApprovalChainSummary, required: false }) approvalChain?: ApprovalChainSummary;

  constructor(document: Document & { createdBy?: User; approvalChain?: any }) {
    this.id = document.id;
    this.title = document.title;
    this.description = document.description ?? undefined;
    this.status = document.status;
    this.price = document.price;
    this.processingFee = document.processingFee;
    this.totalAmount = document.totalAmount;
    this.createdAt = document.createdAt;
    this.updatedAt = document.updatedAt;
    if (document.createdBy) {
      this.createdBy = {
        id: document.createdBy.id,
        firstname: document.createdBy.firstname,
        lastname: document.createdBy.lastname,
        email: document.createdBy.email,
      };
    }
    if (document.approvalChain) {
      this.approvalChain = {
        id: document.approvalChain.id,
        name: document.approvalChain.name,
      };
    }
  }
}