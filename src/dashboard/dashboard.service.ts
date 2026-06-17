// dashboard.service.ts
import { Dashboard } from './entities/dashboard.entity';
import { Injectable } from '@nestjs/common';
import { ActivityService } from 'src/activity/activity.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) { }

  // ADMIN STATS
  async getAdminStats(uid: number) {
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

    // Get the admin user details for activity log
    const admin = await this.prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        email: true,
        role: {
          select: { name: true }
        }
      }
    });

    await this.activityService.create({
      action: "VIEW",
      entity: "USER",
      description: `Admin ${admin?.email || 'Unknown'} viewed dashboard stats`,
      actorType: admin?.role?.name || "ADMIN",
      actorId: String(uid),
    });

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
        where: { userId, status: 'APPROVED' }
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
          status: 'SUCCESSFUL'
        }
      }),
    ]);

    // Get the alumni user details for activity log
    const alumni = await this.prisma.alumni.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        matric_number: true,
        role: {
          select: { name: true }
        }
      }
    });

    await this.activityService.create({
      action: "VIEW",
      entity: "ALUMNI",
      description: `Alumni ${alumni?.email || alumni?.matric_number || 'Unknown'} viewed their dashboard stats`,
      actorType: "ALUMNI",
      actorId: String(userId),
    });

    return {
      totalRequests,
      completedRequests,
      pendingRequests,
      totalSuccessfulTransactionAmount: transactions._sum.totalAmount || 0,
    };
  }
}