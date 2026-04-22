import { Injectable } from '@nestjs/common';
import { CreateAlumnusDto } from './dto/create-alumnus.dto';
import { UpdateAlumnusDto } from './dto/update-alumnus.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlumniService {
  constructor(private readonly prisma: PrismaService) { }

  create(createAlumnusDto: CreateAlumnusDto) {
    return 'This action adds a new alumnus';
  }

  async findAll() {
    try {
      const alumniData = await this.prisma.alumni.findMany({
        select: {
          id: true,
          firstname: true,
          middlename: true,
          lastname: true,
          email: true,
          phone_number: true,
          matric_number: true,
          _count: {
            select: {
              requests: true,
            },
          },
          last_login: true,
          data: true,
          createdAt: true
        }
      })

      return {
        status: 200,
        data: alumniData
      }
    } catch (error) {
      return {
        status: 500,
        message: `An error occured ${error}`
      }
    }
  }

  async findOne(id: number) {
    try {
      const alumni = await this.prisma.alumni.findUnique({
        where: { id },
        select: {
          id: true,
          firstname: true,
          middlename: true,
          lastname: true,
          email: true,
          gender: true,
          date_of_birth: true,
          last_login: true,
          phone_number: true,
          matric_number: true,
          createdAt: true
        }
      }); 

      if (!alumni) {
        return {
          status: 404,
          message: `User ${id} not found`,
          data: null,
        };
      }

      return {
        status: 200,
        message: "User fetched successfully",
        data: alumni,
      };

    } catch (error: any) {
      return {
        status: 500,
        message: "An error occurred while fetching the user",
        error: error.message ?? error.toString(),
      };
    }
  }

  async getOneByAdmin(id: number, userId: number) {
    try {
      // validate admin user
      const admin = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });

      if (!admin || admin?.role?.name !== 'Super Admin' && admin?.role?.name !== 'Admin') {
        return {
          status: 403,
          message: 'You are not authorized to view this record',
        };
      }

      const alumni = await this.prisma.alumni.findUnique({
        where: { id },
      });

      if (!alumni) {
        return {
          status: 404,
          message: `Alumnus ${id} not found`,
        };
      }

      return {
        status: 200,
        message: 'Alumnus fetched successfully',
        data: alumni,
      };
    } catch (error: any) {
      return {
        status: 500,
        message: 'An error occurred while fetching alumnus',
        error: error.message ?? String(error),
      };
    }
  }

  update(id: number, updateAlumnusDto: UpdateAlumnusDto) {
    return `This action updates a #${id} alumnus`;
  }

  remove(id: number) {
    return `This action removes a #${id} alumnus`;
  }
}
