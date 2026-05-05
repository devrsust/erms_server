// src/activity/dto/find-all-activity.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindAllActivityQueryDto {
  @ApiPropertyOptional({ example: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'createdAt' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc' })
  order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ example: '' })
  search?: string = '';

  @ApiPropertyOptional({ example: 'Request' })
  entity?: string;

  @ApiPropertyOptional({ example: 'CREATE' })
  action?: string;
}