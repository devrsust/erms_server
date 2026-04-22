import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';
import { FindAllCombosQueryDto } from './dto/find-all.dto';

@Injectable()
export class ComboService {
  constructor(private prisma: PrismaService) { }

  // ----------------------------------------------------------------------
  // BULK CREATE (used by /bulk-upload)
  // ----------------------------------------------------------------------
  async createBulk(dtos: CreateComboDto[], createdById: number) {
    try {
      const results: any[] = [];
      const errors: Array<{ item: CreateComboDto; error: string }> = [];

      for (const dto of dtos) {
        try {
          const dtoWithUser = { ...dto, createdById };

          // Uniqueness check across matric_number, email, certNo
          const existing = await this.prisma.combo.findFirst({
            where: {
              OR: [
                { matric_number: dto.matric_number },
                { certNo: dto.certNo },
              ],
            },
          });

          if (existing) {
            errors.push({
              item: dto,
              error: `Duplicate: matric ${dto.matric_number}, or certNo ${dto.certNo}`,
            });
            continue;
          }

          const combo = await this.prisma.combo.create({
            data: dtoWithUser,
            select: {
              id: true,
              matric_number: true,
              certNo: true,
            },
          });
          results.push(combo);
        } catch (itemError) {
          errors.push({ item: dto, error: itemError.message });
        }
      }

      return {
        status: results.length ? 201 : 400,
        message: `Created ${results.length} combos, ${errors.length} failed.`,
        data: { created: results, errors },
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred during bulk creation: ${error.message}`,
      };
    }
  }

  // ----------------------------------------------------------------------
  // GET ALL with filters & pagination
  // ----------------------------------------------------------------------
  async findAll(query: FindAllCombosQueryDto) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { matric_number: { contains: query.search, mode: 'insensitive' } },
          { certNo: { contains: query.search, mode: 'insensitive' } },
        ];
      }
      if (query.year) where.year = query.year;
      if (query.type) where.type = query.type;
      if (query.session) where.session = query.session;

      const [items, total] = await Promise.all([
        this.prisma.combo.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            class: true,
            matric_number: true,
            certNo: true,
            type: true,
            year: true,
            remark: true,
            session: true,
            print_date: true,
            createdBy: { select: { id: true, email: true } },
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.combo.count({ where }),
      ]);

      return {
        status: 200,
        data: items,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error.message}`,
      };
    }
  }

  // ----------------------------------------------------------------------
  // GET ONE
  // ----------------------------------------------------------------------
  async findOne(id: number) {
    try {
      const combo = await this.prisma.combo.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          class: true,
          matric_number: true,
          certNo: true,
          type: true,
          year: true,
          remark: true,
          session: true,
          print_date: true,
          createdBy: { select: { id: true, email: true } },
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!combo) {
        return {
          status: 404,
          message: `Combo with ID ${id} not found.`,
        };
      }

      return {
        status: 200,
        data: combo,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error.message}`,
      };
    }
  }

  async findByMatric(matric: string) {
    try {
      const combo = await this.prisma.combo.findUnique({
        where: { matric_number: matric },
        select: {
          id: true,
          name: true,
          matric_number: true,
          certNo: true,
          print_date: true,
        },
      });
      if (!combo) {
        return {
          status: 404,
          message: `Combo with matric number ${matric} not found.`,
        };
      }
      return {
        status: 200,
        data: combo,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error.message}`,
      };
    }
  }

  // ----------------------------------------------------------------------
  // UPDATE
  // ----------------------------------------------------------------------
  async update(id: number, dto: UpdateComboDto) {
    try {
      const existing = await this.prisma.combo.findUnique({ where: { id } });
      if (!existing) {
        return {
          status: 404,
          message: `Combo with ID ${id} not found.`,
        };
      }

      // Prevent unique field conflicts
      if (dto.matric_number || dto.certNo) {
        const conflict = await this.prisma.combo.findFirst({
          where: {
            AND: [
              { NOT: { id } },
              {
                OR: [
                  { matric_number: dto.matric_number },
                  { certNo: dto.certNo },
                ].filter(Boolean),
              },
            ],
          },
        });
        if (conflict) {
          return {
            status: 409,
            message: 'Matric number, email, or certificate number already in use by another record.',
          };
        }
      }

      const updated = await this.prisma.combo.update({
        where: { id },
        data: dto,
        select: {
          id: true,
          name: true,
          class: true,
          matric_number: true,
          certNo: true,
          type: true,
          year: true,
          remark: true,
          session: true,
          print_date: true,
          createdBy: { select: { id: true, email: true } },
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        status: 200,
        message: 'Combo updated successfully.',
        data: updated,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error.message}`,
      };
    }
  }

  // ----------------------------------------------------------------------
  // DELETE (single)
  // ----------------------------------------------------------------------
  async remove(id: number) {
    try {
      const existing = await this.prisma.combo.findUnique({ where: { id } });
      if (!existing) {
        return {
          status: 404,
          message: `Combo with ID ${id} not found.`,
        };
      }

      await this.prisma.combo.delete({ where: { id } });
      return {
        status: 200,
        message: `Combo with ID ${id} deleted successfully.`,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error.message}`,
      };
    }
  }

  // ----------------------------------------------------------------------
  // DELETE BY YEAR
  // ----------------------------------------------------------------------
  async removeByYear(year: string) {
    try {
      const count = await this.prisma.combo.count({ where: { year } });
      if (count === 0) {
        return {
          status: 404,
          message: `No combos found for year ${year}.`,
        };
      }

      const { count: deletedCount } = await this.prisma.combo.deleteMany({
        where: { year },
      });

      return {
        status: 200,
        message: `Deleted ${deletedCount} combos for year ${year}.`,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error.message}`,
      };
    }
  }

  // ----------------------------------------------------------------------
  // OPTIONAL: checkPrintStatus – not used in the controller but kept for reference
  // ----------------------------------------------------------------------
  async checkPrintStatus(matric: string) {
    try {
      const combo = await this.prisma.combo.findUnique({
        where: { matric_number: matric },
        select: { id: true, createdAt: true },
      });
      if (!combo) {
        return {
          status: 404,
          message: `Combo for user ${matric} not found.`,
        };
      }
      return {
        status: 200,
        data: combo,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error.message}`,
      };
    }
  }
}