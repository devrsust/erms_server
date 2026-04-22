import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsString, IsOptional, IsBoolean, Min, IsNumber } from "class-validator";

export class ApprovalStepDto {
  @ApiProperty({ description: "Display order for this step (starting from 1)" })
  @IsInt()
  @Min(1)
  stepOrder: number;

  @ApiProperty({ description: "Name of the step" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Description of the step" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Role responsible for the step" })
  @IsOptional()
  @IsNumber()
  roleId?: number;

  @ApiPropertyOptional({ description: "Specific user responsible for the step" })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: "Whether this step can reject a document", default: true })
  @IsOptional()
  @IsBoolean()
  canReject?: boolean;
}
