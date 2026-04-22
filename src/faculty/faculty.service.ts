import { Injectable } from '@nestjs/common';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FacultyService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateFacultyDto) {
    try {
      const existingFaculty = await this.prisma.faculty.findUnique({ where: { name: dto.name } });

      if (existingFaculty) {
        return {
          status: 200,
          message: `Faculty ${dto.name} already exists.`
        }
      }

      const faculty = await this.prisma.faculty.create({
        data: {
          ...dto
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              email: true
            }
          },
          _count: {
            select: {
              departments: true
            }
          }
        }
      })

      return {
        status: 201,
        message: `Faculty ${dto.name} created.`,
        data: faculty
      }
    } catch (error) {
      return {
        status: 500,
        message: `An error occured: ${error}`
      }
    }
  }

  async findAll() {
    try {
      const faculties = await this.prisma.faculty.findMany({
        select: {
          id: true,
          name: true,
          createdBy: {
            select: {
              id: true,
              email: true
            }
          },
          _count: {
            select: {
              departments: true,
            }
          },
          createdAt: true
        }
      })

      return {
        status: 200,
        data: faculties
      }
    } catch (error) {
      return {
        status: 500,
        message: `An error occured: ${error}`
      }
    }
  }

  async findOne(id: number) {
    try {
      const faculty = await this.prisma.faculty.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
          createdAt: true,
        },
      });

      if (!faculty) {
        return {
          status: 404,
          message: `Faculty with ID ${id} not found.`,
        };
      }

      return {
        status: 200,
        message: 'Faculty retrieved successfully',
        data: faculty,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error.message || error}`,
      };
    }
  }

  async update(id: number, dto: UpdateFacultyDto) {
    try {
      const existing = await this.prisma.faculty.findUnique({ where: { id } });
      if (!existing) {
        return {
          status: 404,
          message: `Faculty with ID ${id} not found.`,
        };
      }

      const updatedFaculty = await this.prisma.faculty.update({
        where: { id },
        data: dto,
        select: {
          id: true,
          name: true,
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
          createdAt: true, // include for consistency
        },
      });

      return {
        status: 200,
        message: 'Faculty updated successfully',
        data: updatedFaculty,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error.message || error}`,
      };
    }
  }

  async remove(id: number) {
    try {
      const faculty = await this.prisma.faculty.findUnique({ where: { id } });

      if (!faculty) {
        return {
          status: 404,
          message: `Faculty ${id} not fount.`
        }
      }

      await this.prisma.faculty.delete({ where: { id } });
      return {
        status: 200,
        message: `Faculty ${id} deleted`
      }
    } catch (error) {
      return {
        status: 500,
        message: `An error Occured: ${error}`
      }
    }
  }
}
