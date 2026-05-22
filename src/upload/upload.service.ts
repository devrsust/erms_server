import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common'
import { v2 as cloudinary } from 'cloudinary'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UploadService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService, // replace with PrismaService or TypeORM repo
  ) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    })
  }

  // =========================
  // GENERIC UPLOAD CORE
  // =========================
  private async upload(file: Express.Multer.File, folder: string) {
    if (!file) throw new BadRequestException('No file uploaded')

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/svg+xml',
    ]

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}`,
      )
    }

    try {
      return await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            transformation: [
              { quality: 'auto' },
              { fetch_format: 'auto' },
            ],
            allowed_formats: ['jpg', 'jpeg', 'png', 'svg'],
          },
          (err, result) => {
            if (err) return reject(err)
            resolve(result)
          },
        )

        stream.end(file.buffer)
      })
    } catch (e) {
      throw new InternalServerErrorException('Cloudinary upload failed')
    }
  }

  // =========================
  // SIGNATURE
  // =========================
  async postSignature(userId: number, file: Express.Multer.File) {
    const uploaded = await this.upload(file, 'signatures')

    const record = await this.prisma.upload.create({
      data: {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        folder: 'signatures',
        type: 'signature',
        userId,
      },
    })

    return {
      success: true,
      message: 'Signature uploaded',
      data: record,
    }
  }

  async getSignature(userId: number) {
    const record = await this.prisma.upload.findFirst({
      where: {
        userId,
        type: 'signature',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!record) {
      throw new NotFoundException('Signature not found')
    }

    return {
      success: true,
      data: record,
    }
  }

  // =========================
  // STAMP
  // =========================
  async postStamp(userId: number, file: Express.Multer.File) {
    const uploaded = await this.upload(file, 'stamps')

    const record = await this.prisma.upload.create({
      data: {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        folder: 'stamps',
        type: 'stamp',
        userId,
      },
    })

    return {
      success: true,
      message: 'Stamp uploaded',
      data: record,
    }
  }

  async getStamp(userId: number) {
    const record = await this.prisma.upload.findFirst({
      where: {
        userId,
        type: 'stamp',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!record) {
      throw new NotFoundException('Stamp not found')
    }

    return {
      success: true,
      data: record,
    }
  }

  // =========================
  // OPTIONAL: DELETE
  // =========================
  async delete(id: number, userId: number) {
    const record = await this.prisma.upload.findUnique({
      where: { id },
    })

    if (!record) throw new NotFoundException('Upload not found')

    if (record.userId !== userId) {
      throw new ForbiddenException('Not allowed')
    }

    if (record.publicId) {
      await cloudinary.uploader.destroy(record.publicId)
    }

    await this.prisma.upload.delete({
      where: { id },
    })

    return {
      success: true,
      message: 'Deleted successfully',
    }
  }
}