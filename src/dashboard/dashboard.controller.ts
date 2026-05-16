// dashboard.controller.ts
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get('admin/:id')
  getAdminStats(@Param('id', ParseIntPipe) id: number) {
    return this.dashboardService.getAdminStats(id);
  }

  @Get('alumni/:id')
  getAlumniStats(@Param('id', ParseIntPipe) id: number) {
    return this.dashboardService.getAlumniStats(id);
  }
}