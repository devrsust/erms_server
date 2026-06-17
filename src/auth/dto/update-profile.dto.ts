// src/auth/dto/update-profile.dto.ts
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstname?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastname?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  
}