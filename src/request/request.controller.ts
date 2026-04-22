import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { RequestService } from './request.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';

@Controller('request')
export class RequestController {
  constructor(private readonly requestService: RequestService) { }

  @Post()
  create(@Body() dto: CreateRequestDto & { paymentId: string }) {
    const { paymentId, ...requestData } = dto;
    console.log(dto);
    return this.requestService.create(paymentId, requestData);
  }

  @Get()
  findAll() {
    return this.requestService.findAll();
  }

  @Get("user/:userId")
  findAllByUser(@Param("userId") userId: number) {
    return this.requestService.findAllByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requestService.findOne(+id);
  }

  @Get('admin/:id')
  findOneByAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.requestService.findOneByAdmins(id);
  }

  @Get('pending/:userId')
  getPendingApprovals(@Param('userId', ParseIntPipe) userId: number) {
    return this.requestService.getPendingApprovals(userId);
  }
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRequestDto: UpdateRequestDto) {
    return this.requestService.update(+id, updateRequestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requestService.remove(+id);
  }
}
