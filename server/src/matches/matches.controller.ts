import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Headers, UnauthorizedException } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

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

  @Get('registrations/all')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有联赛报名 (管理员)' })
  async getAllRegistrations(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.getAllRegistrations(userId);
  }

  @Put('registrations/:id/audit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '审核联赛报名' })
  async auditRegistration(@Param('id') id: string, @Body() body: { status: string, feedback?: string }, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.auditRegistration(userId, +id, body.status, body.feedback);
  }

  @Get('registrations/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: '导出联赛报名信息' })
  async exportRegistrations(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.exportRegistrations(userId);
  }

  @Get()
  @ApiOperation({ summary: '获取赛事列表' })
  findAll() {
    return this.matchesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取赛事详情' })
  findOne(@Param('id') id: string) {
    return this.matchesService.findOne(+id);
  }

  @Get(':id/my-registration')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的球队报名状态' })
  getMyRegistration(@Param('id') id: string, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.getMyLeagueRegistration(userId, +id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新赛事' })
  update(@Param('id') id: string, @Body() body: any, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.update(+id, userId, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除赛事' })
  remove(@Param('id') id: string, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.remove(+id, userId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建赛事/友谊赛' })
  create(@Body() body: any, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.create(userId, body);
  }

  @Post(':id/register')
  @ApiBearerAuth()
  @ApiOperation({ summary: '报名赛事' })
  register(@Param('id') id: string, @Body() body: any, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.register(userId, +id, body);
  }

  @Post(':id/cancel-registration')
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消报名' })
  cancelRegistration(@Param('id') id: string, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.cancelRegistration(userId, +id);
  }

  @Post(':id/league-register')
  @ApiBearerAuth()
  @ApiOperation({ summary: '联赛报名(球队)' })
  leagueRegister(@Param('id') id: string, @Body() body: any, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.leagueRegister(userId, +id, body.playerIds);
  }

  @Post(':id/auto-league-register')
  @ApiBearerAuth()
  @ApiOperation({ summary: '一键同步球队报名(队长/管理)' })
  autoLeagueRegister(@Param('id') id: string, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.autoLeagueRegister(userId, +id);
  }

  @Post(':id/distribute')
  @ApiBearerAuth()
  @ApiOperation({ summary: '智能分队 (管理员/发起人)' })
  distributeTeams(@Param('id') id: string, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.distributeTeams(+id, userId);
  }

  @Post(':id/add-player')
  @ApiBearerAuth()
  @ApiOperation({ summary: '手动添加球员 (球队友谊赛)' })
  addPlayer(@Param('id') id: string, @Body() body: { playerId: string, side: 'HOME' | 'AWAY' }, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.addPlayerToMatch(+id, userId, body.playerId, body.side);
  }

  @Post(':id/sync-team-players')
  @ApiBearerAuth()
  @ApiOperation({ summary: '同步球队所有成员 (球队友谊赛)' })
  syncTeamPlayers(@Param('id') id: string, @Body() body: { side: 'HOME' | 'AWAY' }, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.matchesService.syncTeamPlayers(+id, userId, body.side);
  }
}