import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'ID of the document being commented on' })
  @IsInt()
  documentId: number;

  @ApiProperty({ description: 'Content of the comment' })
  @IsString()
  content: string;
}