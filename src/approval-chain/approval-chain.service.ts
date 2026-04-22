import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalChainDto } from './dto/CreateApprovalChainDto';
import { UpdateApprovalChainDto } from './dto/UpdateApprovalChainDto';

@Injectable()
export class ApprovalChainService {
  constructor(private prisma: PrismaService) { }

  // ---------------------------------------------------------
  // CREATE CHAIN WITH STEPS
  // ---------------------------------------------------------
  async create(dto: CreateApprovalChainDto) {
    try {
      // 1. Check duplicate chain name
      const exists = await this.prisma.approvalChain.findUnique({
        where: { name: dto.name },
      });
      if (exists) {
        return {
          status: 400,
          message: `Approval chain '${dto.name}' already exists.`,
        };
      }

      // 2. Validate no duplicate stepOrder
      const stepOrders = dto.steps.map(s => s.stepOrder);
      const stepOrderSet = new Set(stepOrders);
      if (stepOrders.length !== stepOrderSet.size) {
        return {
          status: 400,
          message: 'Duplicate stepOrder values detected.',
        };
      }

      // 3. Validate each step: must have either roleId or userId, not both
      for (const step of dto.steps) {
        if (step.roleId && step.userId) {
          return {
            status: 400,
            message: `Step ${step.stepOrder}: Cannot assign both roleId and userId.`,
          };
        }
      }

      // 4. Create the approval chain
      const chain = await this.prisma.approvalChain.create({
        data: {
          name: dto.name,
          description: dto.description,
          createdById: dto.createdById,
          isActive: true,
        },
      });

      // 5. Create all steps in bulk
      await this.prisma.approvalStep.createMany({
        data: dto.steps.map(step => ({
          chainId: chain.id,
          stepOrder: step.stepOrder,
          name: step.name,
          description: step.description || null,
          roleId: step.roleId || null,
          userId: step.userId || null,
          canReject: step.canReject ?? true,
        })),
      });

      // 6. Fetch the newly created chain with its steps (ordered)
      const chainWithSteps = await this.prisma.approvalChain.findUnique({
        where: { id: chain.id },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
          },
        },
        
      });

      return {
        status: 201,
        message: 'Approval chain created successfully',
        data: chainWithSteps,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error.message || error}`,
      };
    }
  }

  // ---------------------------------------------------------
  // GET ALL CHAINS
  // ---------------------------------------------------------
  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search by chain name or description
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } }
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.approvalChain.count({ where }),
      this.prisma.approvalChain.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          steps: { orderBy: { stepOrder: "asc" } }
        }
      })
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data
    };
  }

  // ---------------------------------------------------------
  // GET ONE CHAIN
  // ---------------------------------------------------------
  async findOne(id: number) {
    const chain = await this.prisma.approvalChain.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
      }
    });

    if (!chain) {
      throw new NotFoundException(`Approval chain #${id} not found.`);
    }

    return chain;
  }

  // ---------------------------------------------------------
  // UPDATE CHAIN + REPLACE STEPS
  // ---------------------------------------------------------
  async update(id: number, dto: UpdateApprovalChainDto) {
    const chain = await this.prisma.approvalChain.findUnique({ where: { id } });
    if (!chain) throw new NotFoundException(`Chain #${id} not found.`);

    // Update chain properties
    await this.prisma.approvalChain.update({
      where: { id },
      data: {
        name: dto.name ?? chain.name,
        description: dto.description ?? chain.description
      }
    });

    // If steps provided → replace existing steps
    if (dto.steps) {
      // Validate duplicates
      const stepOrders = dto.steps.map(s => s.stepOrder);
      if (stepOrders.length !== new Set(stepOrders).size) {
        throw new BadRequestException("Duplicate stepOrder values detected.");
      }

      // Validate role/user logic
      dto.steps.forEach(step => {
        if (step.roleId && step.userId) {
          throw new BadRequestException(
            `Step ${step.stepOrder}: Cannot assign both roleId and userId.`
          );
        }
      });

      // Remove old steps
      await this.prisma.approvalStep.deleteMany({ where: { chainId: id } });

      // Create new steps
      await this.prisma.approvalStep.createMany({
        data: dto.steps.map(step => ({
          chainId: id,
          stepOrder: step.stepOrder,
          name: step.name,
          description: step.description || null,
          roleId: step.roleId || null,
          userId: step.userId || null,
          canReject: step.canReject ?? true
        }))
      });
    }

    return {
      message: "Approval chain updated successfully",
      data: await this.findOne(id)
    };
  }

  // ---------------------------------------------------------
  // DELETE CHAIN (CASCADE will delete steps)
  // ---------------------------------------------------------
  async remove(id: number) {
    const chain = await this.prisma.approvalChain.findUnique({ where: { id } });
    if (!chain) throw new NotFoundException(`Chain #${id} not found.`);

    await this.prisma.approvalChain.delete({ where: { id } });

    return { message: "Approval chain deleted." };
  }

  // ---------------------------------------------------------
  // ACTIVATE / DEACTIVATE CHAIN
  // ---------------------------------------------------------
  async toggleActive(id: number, isActive: boolean) {
    const chain = await this.prisma.approvalChain.findUnique({ where: { id } });
    if (!chain) throw new NotFoundException(`Chain #${id} not found.`);

    await this.prisma.approvalChain.update({
      where: { id },
      data: { isActive }
    });

    return { message: `Chain is now ${isActive ? "ACTIVE" : "INACTIVE"}.` };
  }
}
