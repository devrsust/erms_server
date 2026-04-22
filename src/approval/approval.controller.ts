import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ApprovalService } from './approval.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { UpdateApprovalDto } from './dto/update-approval.dto';
import { FindAllApprovalsQueryDto } from './dto/find-all.dto';

@ApiTags('approvals')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new approval (approve/reject a request step)' })
  @ApiResponse({ status: 200, description: 'Approval processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request (step already processed or request not pending)' })
  @ApiResponse({ status: 403, description: 'Forbidden (user not authorized for this step)' })
  @ApiResponse({ status: 404, description: 'Request or step not found' })

  async create(
    @Body() createApprovalDto: CreateApprovalDto,
  ) {
    return this.approvalService.create(createApprovalDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all approvals with pagination & search' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, example: '' })
  @ApiResponse({ status: 200 })
  async findAll(@Query() query: FindAllApprovalsQueryDto) {
    return this.approvalService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get approval by ID' })
  @ApiResponse({ status: 200, description: 'Returns approval details' })
  @ApiResponse({ status: 404, description: 'Approval not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.approvalService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an approval (generally not allowed)' })
  @ApiResponse({ status: 400, description: 'Approval records cannot be updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateApprovalDto: UpdateApprovalDto,
  ) {
    // Approvals are immutable – service will return a 400 error
    return this.approvalService.update(id, updateApprovalDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an approval (generally not allowed)' })
  @ApiResponse({ status: 400, description: 'Approval records cannot be deleted' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    // Approvals are typically not deleted – service will return a 400 error
    return this.approvalService.remove(id);
  }
}