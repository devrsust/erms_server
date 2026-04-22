import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FacultyService } from './faculty.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';

@ApiTags('faculty')
@Controller('faculty')
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new faculty' })
  @ApiResponse({ status: 201, description: 'Faculty created successfully' })
  create(@Body() createFacultyDto: CreateFacultyDto) {
    return this.facultyService.create(createFacultyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all faculty' })
  @ApiResponse({ status: 200, description: 'List of faculty retrieved' })
  findAll() {
    return this.facultyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get faculty by ID' })
  @ApiResponse({ status: 200, description: 'Faculty details retrieved' })
  @ApiResponse({ status: 404, description: 'Faculty not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.facultyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update faculty' })
  @ApiResponse({ status: 200, description: 'Faculty updated successfully' })
  @ApiResponse({ status: 404, description: 'Faculty not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFacultyDto) {
    return this.facultyService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete faculty' })
  @ApiResponse({ status: 200, description: 'Faculty deleted successfully' })
  @ApiResponse({ status: 404, description: 'Faculty not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.facultyService.remove(id);
  }
}