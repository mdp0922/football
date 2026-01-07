import { Controller, Get, Post, Delete, Put, Body, Param, Headers, UnauthorizedException, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AdminService } from './admin.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private getUserIdFromToken(authHeader: string): string {
    if (!authHeader) {
      throw new UnauthorizedException('未登录');
    }
    const token = authHeader.replace('Bearer ', '');
    try {
      return Buffer.from(token, 'base64').toString('utf-8');
    } catch (e) {
      throw new UnauthorizedException('无效 Token');
    }
  }

  // 简单的权限校验中间件逻辑
  private async checkAdmin(authHeader: string, requireSuperAdmin = false) {
    const userId = this.getUserIdFromToken(authHeader);
    const isAdmin = await this.adminService.verifyAdmin(userId, requireSuperAdmin);
    if (!isAdmin) {
      throw new UnauthorizedException('无权访问');
    }
    return userId;
  }
  
  @Post('users/:id/reset-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: '重置用户密码 (管理员)' })
  async resetPassword(@Headers('authorization') authHeader: string, @Param('id') id: string, @Body() body: { newPassword?: string }) {
    await this.checkAdmin(authHeader);
    const newPass = body.newPassword || '123456';
    await this.adminService.resetPassword(id, newPass);
    return { message: `密码已重置为: ${newPass}`, password: newPass };
  }

  @Post('add-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加系统管理员 (仅超级管理员)' })
  async addSystemAdmin(@Headers('authorization') authHeader: string, @Body() body: { userId: string }) {
    await this.checkAdmin(authHeader, true);
    return this.adminService.addSystemAdmin(body.userId);
  }

  @Post('init')
  @ApiOperation({ summary: '初始化管理员' })
  init() {
    return this.adminService.initAdmin();
  }

  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有用户 (管理员)' })
  async getUsers(
    @Headers('authorization') authHeader: string,
    @Query('keyword') keyword?: string,
    @Query('certification') certification?: string,
  ) {
    await this.checkAdmin(authHeader);
    return this.adminService.getUsers(keyword, certification);
  }

  @Put('users/:id/radar')
  @ApiBearerAuth()
  @ApiOperation({ summary: '审核用户五芒星数据' })
  async auditRadar(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected' },
  ) {
    await this.checkAdmin(authHeader);
    return this.adminService.auditRadar(id, body.status);
  }

  @Put('teams/:id/certification')
  @ApiBearerAuth()
  @ApiOperation({ summary: '认证球队 (管理员)' })
  async certifyTeam(@Headers('authorization') authHeader: string, @Param('id') id: string, @Body() body: { isCertified: boolean }) {
    await this.checkAdmin(authHeader);
    return this.adminService.certifyTeam(id, body.isCertified);
  }

  @Get('users/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: '导出用户数据 (管理员)' })
  async exportUsers(
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
    @Query('keyword') keyword?: string,
    @Query('certification') certification?: string,
  ) {
    await this.checkAdmin(authHeader);
    const buffer = await this.adminService.exportUsersExcel(keyword, certification);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=users.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('matches/:id/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: '导出指定赛事的报名数据 (管理员)' })
  async exportMatchRegistrations(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    await this.checkAdmin(authHeader);
    const buffer = await this.adminService.exportMatchRegistrations(+id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=match-${id}-registrations.xlsx`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('matches')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有赛事 (管理员)' })
  async getMatches(@Headers('authorization') authHeader: string) {
    await this.checkAdmin(authHeader);
    return this.adminService.getAllMatches();
  }

  @Put('matches/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新赛事 (管理员)' })
  async updateMatch(@Headers('authorization') authHeader: string, @Param('id') id: string, @Body() body: any) {
    await this.checkAdmin(authHeader);
    return this.adminService.updateMatch(+id, body);
  }

  @Delete('matches/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除赛事 (管理员)' })
  async deleteMatch(@Headers('authorization') authHeader: string, @Param('id') id: string) {
    await this.checkAdmin(authHeader);
    return this.adminService.deleteMatch(+id);
  }

  @Get('matches/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: '导出赛事报名数据 (管理员)' })
  async exportMatches(
    @Headers('authorization') authHeader: string,
    @Res() res: Response
  ) {
    await this.checkAdmin(authHeader);
    const buffer = await this.adminService.exportMatchesExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=matches.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Put('users/:id/certification')
  @ApiBearerAuth()
  @ApiOperation({ summary: '设置用户认证 (管理员)' })
  async updateUserCertification(@Headers('authorization') authHeader: string, @Param('id') id: string, @Body() body: any) {
    await this.checkAdmin(authHeader);
    return this.adminService.updateUserCertification(id, body);
  }

  @Get('teams')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有球队 (管理员)' })
  async getTeams(@Headers('authorization') authHeader: string) {
    await this.checkAdmin(authHeader);
    return this.adminService.getTeams();
  }

  @Post('matches')
  @ApiBearerAuth()
  @ApiOperation({ summary: '发布赛事 (管理员)' })
  async createMatch(@Headers('authorization') authHeader: string, @Body() body: any) {
    await this.checkAdmin(authHeader);
    return this.adminService.createMatch(body);
  }

  @Post('announcements')
  @ApiBearerAuth()
  @ApiOperation({ summary: '发布公告 (管理员)' })
  async createAnnouncement(@Headers('authorization') authHeader: string, @Body() body: { title: string; content: string }) {
    await this.checkAdmin(authHeader);
    return this.adminService.createAnnouncement(body.title, body.content);
  }

  @Delete('announcements/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除公告 (管理员)' })
  async deleteAnnouncement(@Headers('authorization') authHeader: string, @Param('id') id: string) {
    await this.checkAdmin(authHeader);
    return this.adminService.deleteAnnouncement(id);
  }

  @Get('announcements')
  @ApiOperation({ summary: '获取公告列表' })
  getAnnouncements() {
    return this.adminService.getAnnouncements();
  }
}
