// src/document/dto/find-all.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';

// dto/find-all.dto.ts
import { IsOptional, IsNumberString, IsString, IsBooleanString } from 'class-validator';

export class FindAllCombosQueryDto {
  @IsNumberString()
  @IsOptional()
  page?: number;

  @IsNumberString()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  year?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  session?: string;
}