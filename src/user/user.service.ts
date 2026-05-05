import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateUserDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        return {
          status: 200,
          message: `User With Email ${dto.email} Already Exist.`
        }
      };

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const newUser = await this.prisma.user.create({
        data: {
          ...dto,
          password: hashedPassword,
        },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          role: {
            select: {
              id: true,
              name: true
            }
          },
          email: true
        }
      });

      return {
        status: 201,
        message: "User created",
        data: newUser
      }
    } catch (error) {
      return {
        status: 500,
        message: `An error occured ${error}`
      }
    }
  }

  async findAll() {
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: {
            select: {
              id: true,
              name: true
            }
          },
          createdAt: true,
          isActive: true
        }
      });
      return {
        status: 200,
        data: users,
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
      const user = await this.prisma.user.findUnique({
        where: { id: id },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true
        }
      })

      if (!user) {
        return {
          status: 404,
          message: `User with ID ${id} Not Found`
        }
      }

      return {
        status: 200,
        data: user
      }

    } catch (error) {
      return {
        status: 500,
        message: `An error occured ${error}`
      }
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({ where: { id: id } });

      if (!existingUser) {
        return {
          status: 404,
          message: `User with ID ${id} not found.`
        }
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: id },
        data: {
          ...dto
        }
      })

      return {
        status: 201,
        message: "User updated succesfully",
        data: updatedUser
      }

    } catch (error) {
      return {
        status: 500,
        message: `An error occured ${error}`
      }
    }
  }

  async remove(id: number) {
    try {
      const user = this.prisma.user.findUnique({
        where: { id: id }
      });

      if (!user) {
        return {
          status: 404,
          message: `User With ID ${id} Not Fount`
        }
      }

      await this.prisma.user.delete({
        where: { id: id }
      });

      return {
        status: 200,
        message: `User With ID ${id} Deleted Successfully`
      }
    } catch (error) {
      return {
        status: 500,
        message: `An error occured ${error}`
      }
    }
  }

  async getLatest() {
    const data = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(data);

    return data;  
  }
}
