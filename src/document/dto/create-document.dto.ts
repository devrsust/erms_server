// dto/create-document.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document title (unique)' })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @ApiPropertyOptional({ description: 'Optional document description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Document status', example: 'DRAFT', enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] })
  @IsString()
  @IsNotEmpty({ message: 'Status is required' })
  status: string;

  @ApiProperty({ description: 'Document price (in cents)', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty({ message: 'Price is required' })
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @ApiProperty({ description: 'Processing fee (in cents)', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty({ message: 'Processing fee is required' })
  @Transform(({ value }) => parseFloat(value))
  processingFee: number;
  
@ApiPropertyOptional({ description: 'ID of the approval chain to attach' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  approvalChainId?: number;

  @ApiPropertyOptional({ description: 'ID of the creator (admin only)' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  createdById?: number;
}