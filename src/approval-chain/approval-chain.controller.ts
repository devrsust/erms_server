import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query
} from '@nestjs/common';
import { ApprovalChainService } from './approval-chain.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CreateApprovalChainDto } from './dto/CreateApprovalChainDto';
import { UpdateApprovalChainDto } from './dto/UpdateApprovalChainDto';

@ApiTags('Approval Chains')
@Controller('approval-chains')
export class ApprovalChainController {
  constructor(private readonly service: ApprovalChainService) { }

  // ---------------------------------------------------------
  // CREATE CHAIN
  // ---------------------------------------------------------
  @Post()
  @ApiOperation({ summary: 'Create a new approval chain with steps' })
  create(@Body() dto: CreateApprovalChainDto) {
    return this.service.create(dto);
  }

  // ---------------------------------------------------------
  // GET ALL CHAINS
  // ---------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'Get all approval chains with steps' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, example: '' })
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search: string = '',
  ) {
    return this.service.findAll({ page: Number(page), limit: Number(limit), search });
  }

  // ---------------------------------------------------------
  // GET ONE CHAIN
  // ---------------------------------------------------------
  @Get(':id')
  @ApiOperation({ summary: 'Get one approval chain by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // ---------------------------------------------------------
  // UPDATE ONE CHAIN
  // ---------------------------------------------------------
  @Patch(':id')
  @ApiOperation({ summary: 'Update an approval chain and optionally replace steps' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApprovalChainDto
  ) {
    return this.service.update(id, dto);
  }

  // ---------------------------------------------------------
  // DELETE A CHAIN
  // ---------------------------------------------------------
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a chain and all its steps' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ---------------------------------------------------------
  // ACTIVATE / DEACTIVATE A CHAIN
  // ---------------------------------------------------------
  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate an approval chain' })
  toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @Query('active') active: string
  ) {
    const isActive = active === 'true';
    return this.service.toggleActive(id, isActive);
  }
}
