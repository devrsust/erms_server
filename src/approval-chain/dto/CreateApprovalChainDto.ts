import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsString, IsOptional, ValidateNested } from "class-validator";
import { ApprovalStepDto } from "./ApprovalStepDto";

export class CreateApprovalChainDto {
  @ApiProperty({ description: "User who created the chain" })
  @IsInt()
  createdById: number;

  @ApiProperty({ description: "Name of the approval chain" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Chain description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "All steps for this chain", type: [ApprovalStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps: ApprovalStepDto[];
}
