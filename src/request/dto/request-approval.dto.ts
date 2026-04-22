import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class RequestApprovalDto {
  @ApiPropertyOptional({ description: 'Request ID (usually set from route params)' })
  @IsOptional()
  @IsInt()
  requestId?: number;

  @ApiProperty({ description: 'Step ID being approved/rejected', example: 5 })
  @IsInt()
  @IsNotEmpty()
  stepId: number;

  @ApiPropertyOptional({ description: 'User ID (usually set from authenticated user)' })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiProperty({ enum: ['APPROVE', 'REJECT'], description: 'Approval action' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({ description: 'Approval or Rejection Comment'})
  @IsString()
  @IsNotEmpty()
  comment: string;
}