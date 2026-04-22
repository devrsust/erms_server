import { ApiProperty } from "@nestjs/swagger";

export class ApprovalStepEntity {
  @ApiProperty() id: number;
  @ApiProperty() chainId: number;
  @ApiProperty() stepOrder: number;
  @ApiProperty() name: string;
  @ApiProperty() description?: string;
  @ApiProperty() roleId?: number;
  @ApiProperty() userId?: number;
  @ApiProperty() canReject: boolean;
}

export class ApprovalChainEntity {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() description?: string;

  @ApiProperty({ type: [ApprovalStepEntity] })
  steps: ApprovalStepEntity[];

  @ApiProperty() isActive: boolean;
  @ApiProperty() createdById: number;
  @ApiProperty() createdAt: Date;
}
