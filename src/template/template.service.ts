import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateTemplateDto) {
    try {
      const existingTemplate = await this.prisma.template.findUnique({ where: { name: dto.name } });
      if (existingTemplate) {
        throw new BadRequestException(
          `Template ${dto.name} already exists.`,
        );
      }

      const template = await this.prisma.template.create({
        data: {
          logo: dto.logo,
          name: dto.name,
          content: dto.content,
          createdBy: dto.createdBy,
        },
        select: {
          id: true,
          name: true,
          logo: true,
          createdBy: true,
          createdAt: true
        }
      });

      return {
        status: HttpStatus.CREATED,
        message: 'Role created successfully',
        data: template,
      };

    } catch (error) {

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Unable to create template',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(page = 1, limit = 10) {
    try {
      page = Number(page);
      limit = Number(limit);

      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;

      const skip = (page - 1) * limit;

      const [template, total] = await Promise.all([
        this.prisma.template.findMany({
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            name: true,
            logo: true,
            content: true,
            creator: {
              select: {
                id: true,
                email: true,
              }
            },
            createdAt: true,
            _count: {
              select: {
                users: true,
                requests: true
              },
            },
          },
        }),

        this.prisma.template.count(),
      ]);

      return {
        status: HttpStatus.OK,
        data: template,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {

    }
  }

  async findOne(id: number) {
    try {
      const template = await this.prisma.template.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          logo: true,
          content: true,
          createdBy: true,
          creator: {
            select: {
              id: true,
              email: true,
            }
          },
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              requests: true
            },
          },
        },
      });

      if (!template) {
        throw new HttpException(
          `Template with ID ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        status: HttpStatus.OK,
        data: template,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Unable to fetch template',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: number, updateTemplateDto: UpdateTemplateDto) {
    try {
      const existingTemplate = await this.prisma.template.findUnique({
        where: { id },
      });

      if (!existingTemplate) {
        throw new HttpException(
          `Template with ID ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (updateTemplateDto.name) {
        const nameConflict = await this.prisma.template.findFirst({
          where: {
            name: updateTemplateDto.name,
            id: { not: id },
          },
        });

        if (nameConflict) {
          throw new BadRequestException(
            `Template name ${updateTemplateDto.name} already exists.`,
          );
        }
      }

      const updatedTemplate = await this.prisma.template.update({
        where: { id },
        data: {
          logo: updateTemplateDto.logo,
          name: updateTemplateDto.name,
          content: updateTemplateDto.content,
        },
        select: {
          id: true,
          name: true,
          logo: true,
          content: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        status: HttpStatus.OK,
        message: 'Template updated successfully',
        data: updatedTemplate,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Unable to update template',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: number) {
    try {
      const existingTemplate = await this.prisma.template.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              requests: true,
            },
          },
        },
      });

      if (!existingTemplate) {
        throw new HttpException(
          `Template with ID ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (existingTemplate._count.users > 0 || existingTemplate._count.requests > 0) {
        throw new BadRequestException(
          `Cannot delete template as it is being used by ${existingTemplate._count.users} user(s) and ${existingTemplate._count.requests} request(s).`,
        );
      }

      await this.prisma.template.delete({
        where: { id },
      });

      return {
        status: HttpStatus.OK,
        message: `Template with ID ${id} deleted successfully`,
        data: null,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Unable to delete template',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
