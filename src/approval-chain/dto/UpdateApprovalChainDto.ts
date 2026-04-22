import { PartialType } from "@nestjs/swagger";
import { CreateApprovalChainDto } from "./CreateApprovalChainDto";

export class UpdateApprovalChainDto extends PartialType(CreateApprovalChainDto) {}