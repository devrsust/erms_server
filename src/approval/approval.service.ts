import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, searchQuery } from '../common/utils/query.util'; // if needed
import { CreateApprovalDto } from 'src/approval/dto/create-approval.dto';
import { FindAllApprovalsQueryDto } from './dto/find-all.dto';
import { UpdateApprovalDto } from './dto/update-approval.dto';

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateApprovalDto) {
    try {
      // 1. Fetch request with approval chain
      const request = await this.prisma.request.findUnique({
        where: { id: dto.requestId },
        include: {
          document: {
            include: {
              approvalChain: {
                include: {
                  steps: {
                    orderBy: { stepOrder: 'asc' },
                  },
                },
              },
            },
          },
        },
      });

      if (!request) {
        return {
          status: 404,
          message: `Request with ID ${dto.requestId} not found`,
        };
      }

      if (request.status !== 'PENDING') {
        return {
          status: 400,
          message: `Request is already ${request.status}`,
        };
      }

      // 2. Validate step
      const steps = request.document.approvalChain?.steps || [];
      const currentIndex = steps.findIndex(s => s.id === dto.stepId);
      const step = steps[currentIndex];

      if (!step) {
        return {
          status: 404,
          message: `Approval step with ID ${dto.stepId} not found for this request`,
        };
      }

      // 3. Validate user
      const user = await this.prisma.user.findUnique({
        where: { id: dto.adminId },
        select: { id: true, roleId: true },
      });

      if (!user) {
        return {
          status: 404,
          message: `User with ID ${dto.adminId} not found`,
        };
      }

      const isAssigned =
        step.userId === user.id ||
        (step.roleId && step.roleId === user.roleId);

      if (!isAssigned) {
        return {
          status: 403,
          message: 'You are not authorized to act on this step',
        };
      }

      // 4. Prevent duplicate processing
      const existingApproval = await this.prisma.approval.findFirst({
        where: {
          requestId: dto.requestId,
          stepId: dto.stepId,
        },
      });

      if (existingApproval) {
        return {  
          status: 400,
          message: 'This step has already been processed',
        };
      }

      // 5. Transaction
      const result = await this.prisma.$transaction(async (tx) => {

        // COMMENT (shared)
        let comment: any = null;
        if (dto.comment) {
          comment = await tx.comment.create({
            data: {
              content: dto.comment,
              requestId: dto.requestId,
              userId: user.id,
            },
          });
        }

        // =========================
        // REJECT
        // =========================
        if (dto.action === 'REJECT') {
          const approval = await tx.approval.create({
            data: {
              requestId: dto.requestId,
              stepId: step.id,
              userId: user.id,
              action: 'REJECT',
              comment: dto.comment,
            },
          });

          await tx.request.update({
            where: { id: dto.requestId },
            data: { status: 'REJECTED' },
          });

          return { action: 'REJECT', approval, comment };
        }

        // =========================
        // RETURN (Option 1 FIX)
        // =========================
        if (dto.action === 'RETURN') {
          if (currentIndex <= 0) {
            return {
              status: 400,
              message: 'Cannot return from the first step',
            };
          }

          const previousStep = steps[currentIndex - 1];

          // ✅ Delete current + forward approvals FIRST
          const forwardStepIds = steps
            .slice(currentIndex)
            .map(s => s.id);

          await tx.approval.deleteMany({
            where: {
              requestId: dto.requestId,
              stepId: {
                in: forwardStepIds,
              },
            },
          });

          // ✅ Move request backward
          await tx.request.update({
            where: { id: dto.requestId },
            data: {
              currentStepId: previousStep.id,
              status: 'PENDING',
            },
          });

          // ✅ Log RETURN AFTER cleanup
          const approval = await tx.approval.create({
            data: {
              requestId: dto.requestId,
              stepId: step.id,
              userId: user.id,
              action: 'RETURN',
              comment: dto.comment,
            },
          });

          return {
            action: 'RETURN',
            approval,
            fromStepId: step.id,
            toStepId: previousStep.id,
          };
        }

        // =========================
        // APPROVE
        // =========================
        const nextStep = steps[currentIndex + 1];

        const approval = await tx.approval.create({
          data: {
            requestId: dto.requestId,
            stepId: step.id,
            userId: user.id,
            action: 'APPROVE',
            comment: dto.comment,
          },
        });

        if (nextStep) {
          await tx.request.update({
            where: { id: dto.requestId },
            data: { currentStepId: nextStep.id },
          });

          return {
            action: 'APPROVE_NEXT',
            approval,
            comment,
            nextStep,
          };
        }

        await tx.request.update({
          where: { id: dto.requestId },
          data: {
            status: 'APPROVED',
            currentStepId: null,
          },
        });

        return {
          action: 'APPROVE_FINAL',
          approval,
          comment,
        };
      });

      // 6. Response
      switch (result.action) {
        case 'REJECT':
          return {
            status: 200,
            message: 'Request rejected successfully',
            data: {
              approval: result.approval,
              comment: result.comment,
            },
          };

        case 'RETURN':
          return {
            status: 200,
            message: `Request returned from step ${result.fromStepId} to step ${result.toStepId}`,
            data: {
              approval: result.approval,
              fromStepId: result.fromStepId,
              toStepId: result.toStepId,
            },
          };

        case 'APPROVE_NEXT':
          return {
            status: 200,
            message: 'Step approved. Moved to next step.',
            data: {
              approval: result.approval,
              comment: result.comment,
              nextStep: result.nextStep,
            },
          };

        case 'APPROVE_FINAL':
          return {
            status: 200,
            message: 'Request fully approved',
            data: {
              approval: result.approval,
              comment: result.comment,
            },
          };

        default:
          return {
            status: 500,
            message: 'Unknown action result',
          };
      }

    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error}`,
      };
    }
  }
  /**
   * Retrieve all approvals with optional pagination and search.
   */
  async findAll(query: FindAllApprovalsQueryDto) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 20;
      const search = query.search?.trim() || '';

      const { skip, take } = paginate(page, limit);
      const where = searchQuery(search, ['comment']) ?? {}; // adjust fields as needed

      const [items, total] = await Promise.all([
        this.prisma.approval.findMany({
          where,
          skip,
          take,
          include: {
            request: { select: { id: true, status: true } },
            step: true,
            user: { select: { id: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.approval.count({ where }),
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

  /**
   * Get a single approval by ID.
   */
  async findOne(id: number) {
    try {
      const approval = await this.prisma.approval.findUnique({
        where: { id },
        include: {
          request: true,
          step: true,
          user: { select: { id: true, email: true, role: true } },
        },
      });

      if (!approval) {
        return {
          status: 404,
          message: `Approval with ID ${id} not found`,
        };
      }

      return {
        status: 200,
        data: approval,
      };
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error}`,
      };
    }
  }

  /**
   * Update an approval (typically not allowed, kept for consistency).
   */
  async update(id: number, updateApprovalDto: UpdateApprovalDto) {
    // Approvals are usually immutable; return a 400 error.
    return {
      status: 400,
      message: 'Approval records cannot be updated',
    };
  }

  /**
   * Delete an approval (typically not allowed, kept for consistency).
   */
  async remove(id: number) {
    // Approvals are usually not deleted; return a 400 error.
    return {
      status: 400,
      message: 'Approval records cannot be deleted',
    };
  }
}