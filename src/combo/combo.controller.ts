import { Controller, Post, UseInterceptors, UploadedFile, Req, BadRequestException, Param, Delete, ParseIntPipe, Body, Patch, Get, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as XLSX from 'xlsx';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ComboService } from './combo.service';
import { ExcelComboRow } from './dto/excel-combo-row.dto';
import { validate } from 'class-validator';
import { UpdateComboDto } from './dto/update-combo.dto';
import { FindAllCombosQueryDto } from './dto/find-all.dto';

@ApiTags('combos')
@Controller('combos')
export class ComboController {
  constructor(private readonly comboService: ComboService) { }

  // ----------------------------------------------------------------------
  // GET /combos?page=1&limit=10&search=... (with filters)
  // ----------------------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'Get all combos with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, matric, certNo' })
  @ApiQuery({ name: 'year', required: false, description: 'Filter by year' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'session', required: false, description: 'Filter by session' })
  @ApiQuery({ name: 'isPrinted', required: false, enum: ['true', 'false'], description: 'Filter by print status' })
  @ApiResponse({ status: 200, description: 'List of combos with pagination metadata' })
  async findAll(@Query() query: FindAllCombosQueryDto) {
    return this.comboService.findAll(query);
  }

  // ----------------------------------------------------------------------
  // GET /combos/by-matric/:id
  // ----------------------------------------------------------------------
  @Get('check')
  @ApiOperation({ summary: 'Get combo by matric number (via query param)' })
  @ApiQuery({ name: 'matric', required: true, description: 'Matric number (may contain slashes)' })
  @ApiResponse({ status: 200, description: 'Combo found' })
  @ApiResponse({ status: 404, description: 'Combo not found' })
  async checkByMatric(@Query('matric') matric: string) {
    return this.comboService.findByMatric(matric);
  }

  // ----------------------------------------------------------------------
  // GET /combos/:id
  // ----------------------------------------------------------------------
  @Get(':id')
  @ApiOperation({ summary: 'Get a single combo by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Combo ID' })
  @ApiResponse({ status: 200, description: 'Combo details' })
  @ApiResponse({ status: 404, description: 'Combo not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.comboService.findOne(id);
  }

  // ----------------------------------------------------------------------
  // PATCH /combos/:id
  // ----------------------------------------------------------------------
  @Patch(':id')
  @ApiOperation({ summary: 'Update a combo' })
  @ApiParam({ name: 'id', type: Number, description: 'Combo ID' })
  @ApiResponse({ status: 200, description: 'Combo updated successfully' })
  @ApiResponse({ status: 404, description: 'Combo not found' })
  @ApiResponse({ status: 409, description: 'Conflict with unique fields' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateComboDto: UpdateComboDto,
  ) {
    return this.comboService.update(id, updateComboDto);
  }

  // ----------------------------------------------------------------------
  // DELETE /combos/:id
  // ----------------------------------------------------------------------
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a combo by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Combo ID' })
  @ApiResponse({ status: 200, description: 'Combo deleted successfully' })
  @ApiResponse({ status: 404, description: 'Combo not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.comboService.remove(id);
  }

  // ----------------------------------------------------------------------
  // DELETE /combos/year/:year
  // ----------------------------------------------------------------------
  @Delete('year/:year')
  @ApiOperation({ summary: 'Delete all combos for a specific year' })
  @ApiParam({ name: 'year', type: String, description: 'Year (e.g., "2024")' })
  @ApiResponse({ status: 200, description: 'Combos deleted' })
  @ApiResponse({ status: 404, description: 'No combos found for that year' })
  async removeByYear(@Param('year') year: string) {
    return this.comboService.removeByYear(year);
  }

  // ----------------------------------------------------------------------
  // POST /combos/bulk-upload
  // ----------------------------------------------------------------------
  @Post('bulk-upload')
  @ApiOperation({ summary: 'Bulk upload combos from Excel/CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel or CSV file with columns: name, matric_number, email, certNo, type, year, remark, session, print_date',
        },
        adminId: {
          type: 'number',
          description: 'ID of the admin performing the upload',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Combos created (with success/failure details)' })
  @ApiResponse({ status: 400, description: 'Validation error or missing file/adminId' })
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('adminId') adminId: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!adminId) throw new BadRequestException('Admin ID is required');

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    if (rows.length === 0) throw new BadRequestException('File is empty');

    const dtos: ExcelComboRow[] = [];
    const validationErrors: any[] = [];

    for (const [index, row] of rows.entries()) {
      const dto = new ExcelComboRow();
      Object.assign(dto, row);
      const errors = await validate(dto);
      if (errors.length > 0) {
        validationErrors.push({
          row: index + 2,
          errors: errors.map(e => Object.values(e.constraints || {})).flat(),
        });
      } else {
        dtos.push(dto);
      }
    }

    if (validationErrors.length > 0) {
      return {
        status: 400,
        message: 'Validation failed for some rows',
        data: { errors: validationErrors },
      };
    }

    const userId = parseInt(adminId, 10);
    if (isNaN(userId)) throw new BadRequestException('Invalid admin ID');

    const createDtos = dtos.map(row => ({ ...row }));
    return this.comboService.createBulk(createDtos, userId);
  }
}