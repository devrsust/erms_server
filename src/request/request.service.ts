import { Injectable } from '@nestjs/common';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RequestApprovalDto } from './dto/request-approval.dto';

@Injectable()
export class RequestService {
  constructor(private prisma: PrismaService) { }

  async create(paymentId: string, dto: CreateRequestDto) {
    try {
      // 1. Validate payment first
      const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment) {
        return { status: 400, message: `Payment ${paymentId} not found` };
      }
      if (payment.status !== "SUCCESSFUL") {
        return { status: 400, message: `Payment was not successful` };
      }

      // 2. Fetch document and its first approval step
      const document = await this.prisma.document.findUnique({
        where: { id: dto.documentId },
        select: {
          approvalChain: {
            select: {
              steps: {
                orderBy: { stepOrder: 'asc' },
                take: 1,
                select: { id: true }
              }
            }
          }
        }
      });

      if (!document) {
        return { status: 400, message: `Document with ID ${dto.documentId} not found` };
      }

      const currentStepId = document.approvalChain?.steps[0]?.id;

      // 3. Prepare request data (including currentStepId)
      const requestData: any = {
        userId: dto.userId,
        documentId: dto.documentId,
        type: dto.type,
        status: 'PENDING',
        reference_number: dto.reference_number,
        address: dto.address,
        email: dto.email,                  // ✅ always included
        facultyId: Number(dto.facultyId),
        currentStepId: currentStepId,   // ✅ now in data
      };



      // 4. Create request
      const request = await this.prisma.request.create({
        data: requestData,
        select: {
          id: true,
          type: true,
          email: true,
          facultyId: true,
          address: true,
          reference_number: true,
          currentStepId: true,    // ✅ include in response
          status: true,
          user: { select: { id: true, email: true } },
          document: { select: { id: true, title: true } }
        }
      });

      // 5. Link payment to request
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: { requestId: request.id },
      });

      return {
        status: 201,
        message: "Request created and payment linked successfully",
        data: request,
        payment: updatedPayment
      };
    } catch (error) {
      return { status: 500, message: `An error occurred: ${error}` };
    }
  }

  async findAll() {
    try {
      const requests = await this.prisma.request.findMany({
        select: {
          id: true,
          status: true,
          reference_number: true,
          user: {
            select: {
              id: true,
              matric_number: true,
              email: true
            }
          },
          document: {
            select: {
              id: true,
              title: true,
              totalAmount: true,
            }
          },
          payments: {
            select: {
              id: true,
              status: true,
              reference: true
            }
          },
          createdAt: true
        }
      })

      return {
        status: 200,
        data: requests
      }
    } catch (error) {
      return {
        stattus: 500,
        message: `An error occured ${error}`
      }
    }
  }

  async findAllByUser(userId: number) {
    try {
      const userRequests = await this.prisma.request.findMany({
        where: { userId: userId },
        select: {
          id: true,
          status: true,
          reference_number: true,
          type: true,
          document: {
            select: {
              id: true,
              title: true,
              totalAmount: true
            }
          },
          payments: {
            select: {
              id: true,
              status: true,
              reference: true
            }
          },
          createdAt: true
        }
      })

      return {
        status: 200,
        data: userRequests
      }
    } catch (error) {
      return {
        status: 500,
        message: `An error occured ${error}`
      }
    }
  }

  async getPendingApprovals(userId: number) {
    try {
      // 1. Get user's role
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { roleId: true }
      });

      if (!user) {
        return { status: 404, message: `User ${userId} not found` };
      }

      const userRoleId = user.roleId;

      // 2. Assignment conditions
      const assignmentConditions: any[] = [
        { currentStep: { userId: userId } }
      ];

      if (userRoleId) {
        assignmentConditions.push({
          currentStep: { roleId: userRoleId }
        });
      }

      // 3. Fetch requests
      const requests = await this.prisma.request.findMany({
        where: {
          status: 'PENDING', // ✅ ensure only active workflows
          currentStepId: { not: null },
          OR: assignmentConditions
        },
        include: {
          currentStep: true,
          approvals: {
            where: { userId: userId },
            select: {
              stepId: true,
              action: true // ✅ include action
            }
          },
          document: {
            select: {
              id: true,
              title: true,
              approvalChain: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          faculty: {
            select: { id: true, name: true }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstname: true,
              lastname: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // 4. Correct filtering
      const pendingRequests = requests.filter(req => {
        // ✅ double-check assignment (important safety)
        const isAssigned =
          req.currentStep?.userId === userId ||
          (userRoleId && req.currentStep?.roleId === userRoleId);

        if (!isAssigned) return false;

        // ✅ only block if user COMPLETED this step
        const alreadyCompleted = req.approvals.some(a =>
          a.stepId === req.currentStepId &&
          (a.action === 'APPROVE' || a.action === 'REJECT')
        );

        return !alreadyCompleted;
      });

      // 5. Clean response
      const result = pendingRequests.map(({ approvals, ...rest }) => rest);

      return {
        status: 200,
        data: result,
        count: result.length
      };

    } catch (error) {
      return {
        status: 500,
        message: `An error occurred: ${error}`
      };
    }
  }

  async findOne(id: number) {
    try {
      const req = await this.prisma.request.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          reference_number: true,
          status: true,
          faculty: {
            select: {
              id: true,
              name: true
            }
          },
          email: true,
          address: true,
          currentStep: true,
          document: {
            select: {
              id: true,
              title: true,
              approvalChain: {
                select: {
                  id: true,
                  steps: true
                }
              },
            }
          },
          comments: {
            select: {
              id: true,
              content: true,
              user: {
                select: {
                  id: true,
                  firstname: true,
                  lastname: true,
                }
              }
            }
          },
          createdAt: true
        }
      });

      if (!req) {
        return {
          status: 404,
          message: `Request ${id} not Found!`
        }
      }

      return {
        status: 200,
        data: req,
      }

    } catch (error) {

    }
  }

  async findOneByAdmins(id: number) {
    try {
      const req = await this.prisma.request.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          reference_number: true,
          status: true,
          faculty: {
            select: {
              id: true,
              name: true
            }
          },
          user: true,
          email: true,
          address: true,
          currentStep: true,
          document: {
            select: {
              id: true,
              title: true,
              approvalChain: {
                select: {
                  id: true,
                  steps: true
                }
              },
            }
          },
          comments: {
            select: {
              id: true,
              content: true,
              user: {
                select: {
                  id: true,
                  firstname: true,
                  lastname: true,
                }
              }
            }
          },
          createdAt: true
        }
      });

      if (!req) {
        return {
          status: 404,
          message: `Request ${id} not Found!`
        }
      }

      return {
        status: 200,
        data: req,
      }

    } catch (error) {

    }
  }



  update(id: number, updateRequestDto: UpdateRequestDto) {
    return `This action updates a #${id} request`;
  }

  remove(id: number) {
    return `This action removes a #${id} request`;
  }
}
