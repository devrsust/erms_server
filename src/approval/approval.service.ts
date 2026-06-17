import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  HttpException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, searchQuery } from '../common/utils/query.util';
import { CreateApprovalDto } from 'src/approval/dto/create-approval.dto';
import { FindAllApprovalsQueryDto } from './dto/find-all.dto';
import { UpdateApprovalDto } from './dto/update-approval.dto';

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateApprovalDto) {
    try {
      // 1. Fetch request with ordered approval chain steps
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
        throw new NotFoundException(`Request with ID ${dto.requestId} not found`);
      }

      // Guard Clause: Prevent modification on finalized elements
      if (['APPROVED', 'REJECTED'].includes(request.status)) {
        throw new BadRequestException(`Request has already been finalized with status: ${request.status}`);
      }

      // 2. Validate Step
      const steps = request.document.approvalChain?.steps || [];
      const currentIndex = steps.findIndex(s => s.id === dto.stepId);
      const step = steps[currentIndex];

      if (!step) {
        throw new NotFoundException(`Approval step with ID ${dto.stepId} not found for this request`);
      }

      // Security Guard — Ensure the user is acting on the CURRENT active step
      if (request.currentStepId && request.currentStepId !== step.id) {
        throw new BadRequestException(`Step ID ${dto.stepId} is not the current active step for this request.`);
      }

      // 3. Validate User & Permissions
      const user = await this.prisma.user.findUnique({
        where: { id: dto.adminId },
        select: { id: true, roleId: true },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${dto.adminId} not found`);
      }

      const isAssigned = step.userId === user.id || (step.roleId && step.roleId === user.roleId);
      if (!isAssigned) {
        throw new ForbiddenException('You are not authorized to act on this step');
      }

      // 4. Database Transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Determine normalization action string
        const actionType = ['REJECT', 'RETURN'].includes(dto.action) ? dto.action : 'APPROVE';

        // Historical sanity check specifically for the RETURN execution branch
        let previousStepId: number | null = null;
        if (actionType === 'RETURN') {
          const lastForwardMove = await tx.approval.findFirst({
            where: {
              requestId: dto.requestId,
              action: 'APPROVE',
            },
            orderBy: { createdAt: 'desc' },
          });

          if (!lastForwardMove) {
            throw new BadRequestException('Cannot return from this step: No prior approval history found.');
          }
          previousStepId = lastForwardMove.stepId;
        }

        // ✅ STEP 1: Create the Approval Record up front to acquire its ID
        const approval = await tx.approval.create({
          data: {
            requestId: dto.requestId,
            stepId: step.id,
            userId: user.id,
            action: actionType,
          },
        });

        // ✅ STEP 2: Create Comment explicitly linking to the newly minted approvalId
        let comment: any = null;
        if (dto.comment) {
          comment = await tx.comment.create({
            data: {
              content: dto.comment,
              requestId: dto.requestId,
              userId: user.id,
              approvalId: approval.id, // Explicit relational linking
            },
          });
        }

        // ==========================================
        // ACTION EXECUTION BRANCHES
        // ==========================================
        if (actionType === 'REJECT') {
          await tx.request.update({
            where: { id: dto.requestId },
            data: { status: 'REJECTED', currentStepId: null },
          });

          return { action: 'REJECT', approval, comment };
        }

        if (actionType === 'RETURN') {
          await tx.request.update({
            where: { id: dto.requestId },
            data: { currentStepId: previousStepId, status: 'RETURNED' },
          });

          return {
            action: 'RETURN',
            approval,
            comment,
            fromStepId: step.id,
            toStepId: previousStepId,
          };
        }

        // Action Type: APPROVE Execution
        const nextStep = steps[currentIndex + 1];

        // Case A: Intermediate Approval Step
        if (nextStep) {
          await tx.request.update({
            where: { id: dto.requestId },
            data: { currentStepId: nextStep.id, status: 'PROCESSING' },
          });

          return { action: 'APPROVE_NEXT', approval, comment, nextStep };
        }

        // Case B: Final Approval Step Reached
        await tx.request.update({
          where: { id: dto.requestId },
          data: {
            status: 'APPROVED',
            currentStepId: null,
            pdfUrl: dto.pdfUrl || null,
            publicId: dto.publicId || null,
          },
        });

        return { action: 'APPROVE_FINAL', approval, comment };
      });

      // 5. Build Unified Outbound Responses
      switch (result.action) {
        case 'REJECT':
          return {
            message: 'Request rejected successfully',
            data: { approval: result.approval, comment: result.comment },
          };

        case 'RETURN':
          return {
            message: `Request successfully returned to step ${result.toStepId}`,
            data: { approval: result.approval, comment: result.comment },
          };

        case 'APPROVE_NEXT':
          return {
            message: 'Step approved. Moved to next processing step.',
            data: { approval: result.approval, comment: result.comment, nextStep: result.nextStep },
          };

        case 'APPROVE_FINAL':
          return {
            message: 'Request fully approved and signed transcript uploaded successfully.',
            data: {
              approval: result.approval,
              comment: result.comment,
              pdfUrl: dto.pdfUrl,
              publicId: dto.publicId,
            },
          };

        default:
          throw new InternalServerErrorException('Unknown action result encountered');
      }

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(`An error occurred: ${error}`);
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
      const where = searchQuery(search, ['comment']) ?? {};

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
      throw new InternalServerErrorException(`An error occurred: ${error}`);
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
        throw new NotFoundException(`Approval with ID ${id} not found`);
      }

      return {
        data: approval,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(`An error occurred: ${error}`);
    }
  }

  /**
   * Update an approval (typically not allowed, kept for consistency).
   */
  async update(id: number, updateApprovalDto: UpdateApprovalDto) {
    throw new BadRequestException('Approval records cannot be updated');
  }

  /**
   * Delete an approval (typically not allowed, kept for consistency).
   */
  async remove(id: number) {
    throw new BadRequestException('Approval records cannot be deleted');
  }
}