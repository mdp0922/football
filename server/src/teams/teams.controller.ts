import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException, Delete } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

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

  @Get('user/pending')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户当前待审核申请' })
  getUserPendingRequests(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.teamsService.getUserPendingRequests(userId);
  }

  @Get()
  @ApiOperation({ summary: '获取球队列表' })
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取球队详情' })
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建球队' })
  create(@Headers('authorization') authHeader: string, @Body() body: any) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.teamsService.create(userId, body);
  }

  @Post(':id/join')
  @ApiBearerAuth()
  @ApiOperation({ summary: '申请加入球队' })
  join(@Headers('authorization') authHeader: string, @Param('id') id: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.teamsService.joinRequest(userId, id);
  }

  @Post(':id/leave')
  @ApiBearerAuth()
  @ApiOperation({ summary: '申请退出球队' })
  leave(@Headers('authorization') authHeader: string, @Param('id') id: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.teamsService.leaveRequest(userId, id);
  }

  @Get(':id/requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取球队申请列表' })
  getRequests(@Headers('authorization') authHeader: string, @Param('id') id: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.teamsService.getRequests(userId, id);
  }

  @Post(':id/requests/:requestId/audit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '审核申请' })
  auditRequest(
    @Headers('authorization') authHeader: string, 
    @Param('requestId') requestId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED' }
  ) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.teamsService.auditRequest(userId, requestId, body.status);
  }

  @Post(':id/admins')
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加管理员' })
  addAdmin(@Headers('authorization') authHeader: string, @Param('id') id: string, @Body() body: { userId: string }) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.teamsService.addAdmin(userId, id, body.userId);
  }

  @Delete(':id/admins/:adminId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '移除管理员' })
  removeAdmin(@Headers('authorization') authHeader: string, @Param('id') id: string, @Param('adminId') adminId: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.teamsService.removeAdmin(userId, id, adminId);
  }

  @Post(':id/transfer')
  @ApiBearerAuth()
  @ApiOperation({ summary: '转让球队' })
  transfer(@Headers('authorization') authHeader: string, @Param('id') id: string, @Body() body: { userId: string }) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.teamsService.transferFounder(userId, id, body.userId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '解散球队' })
  disband(@Headers('authorization') authHeader: string, @Param('id') id: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.teamsService.disband(userId, id);
  }

  @Post(':id') 
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新球队信息' })
  update(@Headers('authorization') authHeader: string, @Param('id') id: string, @Body() body: any) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.teamsService.update(id, userId, body);
  }
}
