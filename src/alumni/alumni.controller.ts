import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { AlumniService } from './alumni.service';
import { CreateAlumnusDto } from './dto/create-alumnus.dto';
import { UpdateAlumnusDto } from './dto/update-alumnus.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Alumni')
@Controller('alumni')
export class AlumniController {
  constructor(private readonly alumniService: AlumniService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new alumnus' })
  create(@Body() createAlumnusDto: CreateAlumnusDto) {
    return this.alumniService.create(createAlumnusDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all alumni' })
  findAll() {
    return this.alumniService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one alumnus by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.alumniService.findOne(id);
  }

  @Get(':id/admin/:userId')
  @ApiOperation({ summary: 'Get one alumnus by ID with admin authentication' })
  getOneByAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.alumniService.getOneByAdmin(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an alumnus by ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAlumnusDto: UpdateAlumnusDto,
  ) {
    return this.alumniService.update(id, updateAlumnusDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an alumnus by ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.alumniService.remove(id);
  }
}