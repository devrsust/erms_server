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
      // 1. Fetch request with its document and approval chain
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

      // 2. Validate the step exists and belongs to the request's approval chain
      const steps = request.document.approvalChain?.steps || [];
      const step = steps.find(s => s.id === dto.stepId);
      if (!step) {
        return {
          status: 404,
          message: `Approval step with ID ${dto.stepId} not found for this request`,
        };
      }

      // 3. Verify user is authorized for this step
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

      // 4. Check if this step has already been processed
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

      // 5. Perform all writes in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create approval record
        const approval = await tx.approval.create({
          data: {
            requestId: dto.requestId,
            stepId: dto.stepId,
            userId: user.id,
            action: dto.action,
            comment: dto.comment,
          },
        });

        // Create comment only if a comment was provided
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

        // Handle action
        if (dto.action === 'REJECT') {
          await tx.request.update({
            where: { id: dto.requestId },
            data: { status: 'REJECTED' },
          });
          return { approval, comment, action: 'REJECT' };
        } else {
          // APPROVE: find next step
          const currentIndex = steps.findIndex(s => s.id === dto.stepId);
          const nextStep = steps[currentIndex + 1];

          if (nextStep) {
            await tx.request.update({
              where: { id: dto.requestId },
              data: { currentStepId: nextStep.id },
            });
            return { approval, comment, action: 'APPROVE_NEXT', nextStep };
          } else {
            await tx.request.update({
              where: { id: dto.requestId },
              data: { status: 'APPROVED', currentStepId: null },
            });
            return { approval, comment, action: 'APPROVE_FINAL' };
          }
        }
      });

      // 6. Return appropriate success response
      switch (result.action) {
        case 'REJECT':
          return {
            status: 200,
            message: 'Request rejected successfully',
            data: { approval: result.approval, comment: result.comment },
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
            data: { approval: result.approval, comment: result.comment },
          };
      }
    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error.message || error}`,
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
        message: `An error occurred: ${error.message || error}`,
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
        message: `An error occurred: ${error.message || error}`,
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