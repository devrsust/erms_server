// document.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { paginate, searchQuery } from 'src/common/utils/query.util';
import { FindAllDocumentsQueryDto } from './dto/find-all.dto';

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateDocumentDto) {
    try {
      // Validate user permissions
      const user = await this.prisma.user.findUnique({
        where: { id: dto.createdById },
        select: { role: { select: { name: true } } },
      });

      if (!user || !['SUPER ADMIN', 'ADMIN'].includes(user.role?.name || '')) {
        throw new ForbiddenException(
          'You are not authorized to create documents',
        );
      }

      // Validate approval chain if provided
      const approvalChain = await this.prisma.approvalChain.findUnique({
        where: { id: dto.approvalChainId },
      });
      if (!approvalChain) {
        throw new NotFoundException(
          `Approval chain with ID ${dto.approvalChainId} not found`,
        );
      }

      // Compute total amount
      const totalAmount = dto.price + dto.processingFee;

      // Create the document
      const document = await this.prisma.document.create({
        data: {
          title: dto.title,
          description: dto.description,
          status: dto.status,
          price: dto.price,
          processingFee: dto.processingFee,
          totalAmount,
          createdById: Number(dto.createdById),
          approvalChainId: dto.approvalChainId || null,
        },
        select: {
          id: true,
          description: true,
          totalAmount: true,
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
          createdAt: true,
        },
      });

      return {
        status: 201,
        message: 'Document created successfully',
        data: document,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async findAll(query: FindAllDocumentsQueryDto) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 20;
      const search = query.search?.trim() || '';

      const { skip, take } = paginate(page, limit);
      const where = searchQuery(search, ['title', 'description']) ?? {};

      const [items, total] = await Promise.all([
        this.prisma.document.findMany({
          where,
          skip,
          take,
          select: {
            id: true,
            title: true,
            totalAmount: true,
            createdBy: {
              select: {
                id: true,
                email: true,
              },
            },
            approvalChain: {
              select: {
                id: true,
                steps: true,
              },
            },
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.document.count({ where }),
      ]);

      const totalPages = Math.ceil(total / (limit || 1));

      return {
        page,
        limit,
        total,
        totalPages,
        data: items,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async findOne(id: number) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        price: true,
        processingFee: true,
        totalAmount: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        approvalChain: {
          select: {
            id: true,
            steps: true,
          },
        },
      },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async update(id: number, dto: UpdateDocumentDto) {
    try {
      // Check if document exists
      const existingDocument = await this.prisma.document.findUnique({
        where: { id },
      });

      if (!existingDocument) {
        throw new NotFoundException(`Document with ID ${id} not found`)
      }

      // Prepare update data
      const updateData: any = {};

      if (dto.title !== undefined) updateData.title = dto.title;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.status !== undefined) updateData.status = dto.status;

      // If price or processingFee is updated, recalculate totalAmount
      let recalcTotal = false;
      if (dto.price !== undefined) {
        updateData.price = dto.price;
        recalcTotal = true;
      }
      if (dto.processingFee !== undefined) {
        updateData.processingFee = dto.processingFee;
        recalcTotal = true;
      }

      if (recalcTotal) {
        const price = dto.price ?? existingDocument.price;
        const processingFee = dto.processingFee ?? existingDocument.processingFee;
        updateData.totalAmount = price + processingFee;
      }

      // Validate approval chain if being updated
      if (dto.approvalChainId !== undefined) {
        if (dto.approvalChainId !== null) {
          const approvalChain = await this.prisma.approvalChain.findUnique({
            where: { id: dto.approvalChainId },
          });
          if (!approvalChain) {
            return {
              status: 404,
              message: `Approval chain with ID ${dto.approvalChainId} not found`,
            };
          }
        }
        updateData.approvalChainId = dto.approvalChainId;
      }

      // Perform update
      const updatedDocument = await this.prisma.document.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          price: true,
          processingFee: true,
          totalAmount: true,
          approvalChainId: true,
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        status: 200,
        message: 'Document updated successfully',
        data: updatedDocument,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async remove(id: number) {
    try {
      const document = await this.prisma.document.findUnique({ where: { id } });

      if (!document) {
        throw new NotFoundException(`Document with ID ${id} not found`);
      }

      await this.prisma.document.delete({ where: { id } });
      return {
        status: 200,
        message: `Document ${id} deleted`,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}