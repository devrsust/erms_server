import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindUserActivityQueryDto {
  @ApiProperty({ example: 'USER' })
  actorType: 'ALUMNI' | 'USER';

  @ApiProperty({ example: '5' })
  actorId: string;

  @ApiPropertyOptional({ example: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  limit?: number = 10;

  @ApiPropertyOptional({ example: '' })
  search?: string = '';

  @ApiPropertyOptional({ example: 'createdAt' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc' })
  order?: 'asc' | 'desc' = 'desc';
}