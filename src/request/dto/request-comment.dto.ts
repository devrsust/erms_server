import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class RequestCommentDto {
  @ApiProperty({ description: 'Comment content', example: 'Please upload additional documents.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Request ID (usually set from route params)' })
  @IsOptional()
  @IsInt()
  requestId?: number;

  @ApiPropertyOptional({ description: 'User ID (usually set from authenticated user)' })
  @IsOptional()
  @IsInt()
  userId?: number;
}