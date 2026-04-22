// src/document/dto/find-all.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindAllDocumentsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  limit?: number = 20;

  @ApiPropertyOptional({ example: '' })
  search?: string = '';
}