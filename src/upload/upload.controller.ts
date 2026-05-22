import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  Req,
  UseGuards,
} from '@nestjs/common'

import { FileInterceptor } from '@nestjs/platform-express'
import { Request } from 'express'

import { UploadService } from './upload.service'
import { JwtAuthGuard } from 'lib/jwt.strategy'

interface AuthenticatedRequest extends Request {
  user: {
    id: number
    email?: string
    role: string
    roleId?: number
  }
}

@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  // =========================================
  // SIGNATURE
  // =========================================

  @Post('signature')
  @UseInterceptors(FileInterceptor('file'))
  async postSignature(
    @Req() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.uploadService.postSignature(
      req.user.id,
      file,
    )
  }

  @Get('signature/:userId')
  async getSignature(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.uploadService.getSignature(userId)
  }

  // =========================================
  // STAMP
  // =========================================

  @Post('stamp')
  @UseInterceptors(FileInterceptor('file'))
  async postStamp(
    @Req() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.uploadService.postStamp(
      req.user.id,
      file,
    )
  }

  @Get('stamp/:userId')
  async getStamp(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.uploadService.getStamp(userId)
  }

  // =========================================
  // DELETE (OPTIONAL)
  // =========================================

  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.uploadService.delete(
      id,
      req.user.id,
    )
  }
}