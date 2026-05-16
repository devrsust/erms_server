import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt'
import { ActivityService } from 'src/activity/activity.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) { }

  async create(dto: CreateUserDto, uid: number) {
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

      const actor = await this.prisma.user.findUnique({
        where: { id: uid },
        select: {
          id: true,
          email: true,
          role: { select: { name: true } }
        }
      });

      await this.activityService.create({
        action: "CREATE",
        entity: "USER",
        description: `User ${newUser.email} was created`,
        actorType: actor?.role?.name || "SYSTEM",
        actorId: String(uid),
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

  async findAll(uid: number) {
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

      const actor = await this.prisma.user.findUnique({
        where: { id: uid },
        select: {
          id: true,
          email: true,
          role: { select: { name: true } }
        }
      });

      await this.activityService.create({
        action: "VIEW",
        entity: "USER",
        description: `Retrieved all users list`,
        actorType: actor?.role?.name || "SYSTEM",
        actorId: String(uid),
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

  async findOne(id: number, uid: number) {
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

      const actor = await this.prisma.user.findUnique({
        where: { id: uid },
        select: {
          id: true,
          email: true,
          role: { select: { name: true } }
        }
      });

      await this.activityService.create({
        action: "VIEW",
        entity: "USER",
        description: `Retrieved user ${user.email} details`,
        actorType: actor?.role?.name || "SYSTEM",
        actorId: String(uid),
      });

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

  async update(id: number, dto: UpdateUserDto, uid: number) {
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

      const actor = await this.prisma.user.findUnique({
        where: { id: uid },
        select: {
          id: true,
          email: true,
          role: { select: { name: true } }
        }
      });

      await this.activityService.create({
        action: "UPDATE",
        entity: "USER",
        description: `User ${existingUser.email} was updated`,
        actorType: actor?.role?.name || "SYSTEM",
        actorId: String(uid),
      });

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

  async remove(id: number, uid: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: id }
      });

      if (!user) {
        return {
          status: 404,
          message: `User With ID ${id} Not Fount`
        }
      }

      const userToDelete = await this.prisma.user.findUnique({ where: { id: id } });

      await this.prisma.user.delete({
        where: { id: id }
      });

      const actor = await this.prisma.user.findUnique({
        where: { id: uid },
        select: {
          id: true,
          email: true,
          role: { select: { name: true } }
        }
      });

      await this.activityService.create({
        action: "DELETE",
        entity: "USER",
        description: `User ${userToDelete?.email} was deleted`,
        actorType: actor?.role?.name || "SYSTEM",
        actorId: String(uid),
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

  async getLatest(uid: number) {
    const data = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        email: true,
        role: { select: { name: true } }
      }
    });

    await this.activityService.create({
      action: "VIEW",
      entity: "USER",
      description: `Retrieved latest 10 users`,
      actorType: actor?.role?.name || "SYSTEM",
      actorId: String(uid),
    });

    return data;
  }
}