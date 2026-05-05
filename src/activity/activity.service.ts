import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { FindAllActivityQueryDto } from './dto/find-all.dto';
import { paginate, searchQuery } from 'src/common/utils/query.util';
import { FindUserActivityQueryDto } from './dto/find-user-activity.dto';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateActivityDto) {
    try {
      const activity = await this.prisma.activity.create({
        data: {
          action: dto.action,
          entity: dto.entity,
          description: dto.description,
          actorType: dto.actorType,
          actorId: dto.actorId,
          meta: dto.meta,
        },
        select: {
          id: true,
          action: true,
          actorId: true,
          createdAt: true
        }
      });

      return {
        status: 201,
        message: "Activity created",
        data: activity
      }

    } catch (error) {
      console.log(error);
      return {
        status: 500,
        message: `An error occurred: ${error}`,
      };
    }
  }

  async findAll(query: FindAllActivityQueryDto) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 20;
      const search = query.search?.trim() || '';

      const sortBy = query.sortBy || 'createdAt';
      const order: 'asc' | 'desc' = query.order === 'asc' ? 'asc' : 'desc';

      const { skip, take } = paginate(page, limit);

      // Base search (adjust fields as needed)
      const searchWhere =
        searchQuery(search, ['action', 'entity', 'description']) ?? {};

      // Additional filters
      const where: any = {
        ...searchWhere,
      };

      if (query.entity) {
        where.entity = query.entity;
      }

      if (query.action) {
        where.action = query.action;
      }

      // Prevent invalid column sorting
      const allowedSortFields = ['createdAt', 'action', 'entity'];
      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : 'createdAt';

      const [items, total] = await Promise.all([
        this.prisma.activity.findMany({
          where,
          skip,
          take,
          orderBy: {
            [safeSortBy]: order,
          },
        }),
        this.prisma.activity.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        page,
        limit,
        total,
        totalPages,
        data: items,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error}`,
      };
    }
  }

  async findOne(id: number) {
    try {
      const activity = await this.prisma.activity.findUnique({
        where: { id },
        select: {
          id: true,
          action: true,
          actorId: true,
          actorType: true,
          createdAt: true,
        }
      });

      return {
        status: 200,
        data: activity,
      };

    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error}`,
      };
    }
  }

  async findByUser(query: FindUserActivityQueryDto) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const search = query.search?.trim() || '';

      const sortBy = query.sortBy || 'createdAt';
      const order: 'asc' | 'desc' = query.order === 'asc' ? 'asc' : 'desc';

      const { skip, take } = paginate(page, limit);

      // Base search
      const searchWhere =
        searchQuery(search, ['action', 'entity', 'description']) ?? {};

      // Filters
      const where: any = {
        ...searchWhere,
        actorType: query.actorType,
        actorId: String(query.actorId),
      };

      // Safe sorting
      const allowedSortFields = ['createdAt', 'action', 'entity'];
      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : 'createdAt';

      const [items, total] = await Promise.all([
        this.prisma.activity.findMany({
          where,
          skip,
          take,
          orderBy: {
            [safeSortBy]: order,
          },
        }),
        this.prisma.activity.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        page,
        limit,
        total,
        totalPages,
        data: items,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error}`,
      };
    }
  }

  async remove(id: number) {
    try {
      const activity = await this.prisma.activity.findUnique({ where: { id } });
      if (!activity) {
        return {
          status: 400,
          message: `Activiyt ID ${id} not found.`
        }
      }

      await this.prisma.activity.delete({ where: { id } });
      return {
        statsu: 200,
        message: `Activiyt ID ${id} deleted.`
      }

    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error}`,
      };
    }
  }
}
