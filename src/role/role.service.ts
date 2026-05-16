import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================
  // CREATE ROLE
  // =========================================
  async create(dto: CreateRoleDto) {
    try {
      const existingRole = await this.prisma.role.findUnique({
        where: {
          name: dto.name.trim().toUpperCase(),
        },
      });

      if (existingRole) {
        throw new BadRequestException(
          `Role ${dto.name} already exists`,
        );
      }

      const role = await this.prisma.role.create({
        data: {
          name: dto.name.trim().toUpperCase(),
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      });

      return {
        status: HttpStatus.CREATED,
        message: 'Role created successfully',
        data: role,
      };
    } catch (error) {
      this.logger.error(`create role error: ${error}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Unable to create role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================
  // GET ALL ROLES
  // =========================================
  async findAll(page = 1, limit = 10) {
    try {
      page = Number(page);
      limit = Number(limit);

      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;

      const skip = (page - 1) * limit;

      const [roles, total] = await Promise.all([
        this.prisma.role.findMany({
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                users: true,
              },
            },
          },
        }),

        this.prisma.role.count(),
      ]);

      return {
        status: HttpStatus.OK,
        data: roles,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`findAll roles error: ${error}`);

      throw new HttpException(
        'Unable to fetch roles',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================
  // GET SINGLE ROLE
  // =========================================
  async findOne(id: number) {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,

          users: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
            },
          },

          createdAt: true,
          updatedAt: true,
        },
      });

      if (!role) {
        throw new NotFoundException(
          `Role with ID ${id} not found`,
        );
      }

      return {
        status: HttpStatus.OK,
        data: role,
      };
    } catch (error) {
      this.logger.error(`findOne role error: ${error}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Unable to fetch role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================
  // UPDATE ROLE
  // =========================================
  async update(id: number, dto: UpdateRoleDto) {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id },
      });

      if (!role) {
        throw new NotFoundException(
          `Role with ID ${id} not found`,
        );
      }

      if (dto.name) {
        const existingRole = await this.prisma.role.findFirst({
          where: {
            name: dto.name.trim().toUpperCase(),
            NOT: {
              id,
            },
          },
        });

        if (existingRole) {
          throw new BadRequestException(
            `Role ${dto.name} already exists`,
          );
        }
      }

      const updatedRole = await this.prisma.role.update({
        where: { id },
        data: {
          ...(dto.name && {
            name: dto.name.trim().toUpperCase(),
          }),
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        status: HttpStatus.OK,
        message: 'Role updated successfully',
        data: updatedRole,
      };
    } catch (error) {
      this.logger.error(`update role error: ${error}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Unable to update role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================
  // DELETE ROLE
  // =========================================
  async remove(id: number) {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      });

      if (!role) {
        throw new NotFoundException(
          `Role with ID ${id} not found`,
        );
      }

      if (role._count.users > 0) {
        throw new BadRequestException(
          'Cannot delete role assigned to users',
        );
      }

      await this.prisma.role.delete({
        where: { id },
      });

      return {
        status: HttpStatus.OK,
        message: 'Role deleted successfully',
      };
    } catch (error) {
      this.logger.error(`delete role error: ${error}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Unable to delete role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}