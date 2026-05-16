import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { FindAllApprovalsQueryDto } from 'src/approval/dto/find-all.dto';
import { FindUserActivityQueryDto } from './dto/find-user-activity.dto';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) { }

  @Post()
  create(@Body() createActivityDto: CreateActivityDto) {
    return this.activityService.create(createActivityDto);
  }

  @Get()
  findAll(@Query() query: FindAllApprovalsQueryDto) {
    return this.activityService.findAll(query);
  }

  @Get('user')
  findByUser(@Query() query: FindUserActivityQueryDto) {
    return this.activityService.findByUser(query);
  }

  @Get('admin')
  findByAdmin(@Query() query: FindUserActivityQueryDto) {
    return this.activityService.findByAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activityService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.activityService.remove(+id);
  }
}
