import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ADMIN STATS
  async getAdminStats() {
    const [
      admins,
      alumnis,
      requests,
      transactions
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.alumni.count(),
      this.prisma.request.count(),
      this.prisma.payment.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'SUCCESS' }
      }),
    ]);

    return {
      totalAdmins: admins,
      totalAlumnis: alumnis,
      totalRequests: requests,
      totalSuccessfulTransactionAmount: transactions._sum.totalAmount || 0,
    };
  }

  // ALUMNI STATS
  async getAlumniStats(userId: number) {
    const [
      totalRequests,
      completedRequests,
      pendingRequests,
      transactions
    ] = await Promise.all([
      this.prisma.request.count({
        where: { userId }
      }),
      this.prisma.request.count({
        where: { userId, status: 'COMPLETED' }
      }),
      this.prisma.request.count({
        where: {
          userId,
          status: { in: ['PENDING', 'PROCESSING'] }
        }
      }),
      this.prisma.payment.aggregate({
        _sum: { totalAmount: true },
        where: {
          userId,
          status: 'SUCCESS'
        }
      }),
    ]);

    return {
      totalRequests,
      completedRequests,
      pendingRequests,
      totalSuccessfulTransactionAmount: transactions._sum.totalAmount || 0,
    };
  }
}