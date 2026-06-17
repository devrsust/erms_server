import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsIn, IsOptional } from 'class-validator';

export class CreateApprovalDto {
  @ApiProperty({ description: 'ID of the request being approved/rejected' })
  @IsInt()
  requestId: number;

  @ApiProperty({ description: 'ID of the Admin Processing the request' })
  @IsInt()
  adminId: number;

  @ApiProperty({ description: 'ID of the approval step being acted upon' })
  @IsInt()
  stepId: number;

  @ApiProperty({
    description: 'Action to perform',
    enum: ['APPROVE', 'REJECT'],
    example: 'APPROVE'
  })
  @IsString()
  @IsIn(['APPROVE', 'REJECT'])
  action: string;

  @ApiPropertyOptional({
    description: 'Optional comment explaining the decision',
    example: 'All documents are valid'
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  pdfUrl?: string;

  @IsString()
  @IsOptional()
  publicId?: string;

}