import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }


  @Get('admin')
  getAdminStats() {
    return this.dashboardService.getAdminStats();
  }

  @Get('alumni/:id')
  getAlumniStats(@Param('id') id: string) {
    return this.dashboardService.getAlumniStats(Number(id));
  }
}
