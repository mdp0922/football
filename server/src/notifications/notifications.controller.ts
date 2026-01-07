import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取消息列表' })
  findAll(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.notificationsService.findAll(userId);
  }

  @Get('unread-count')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取未读消息数' })
  getUnreadCount(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post(':id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: '标记已读' })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('read-all')
  @ApiBearerAuth()
  @ApiOperation({ summary: '全部已读' })
  markAllAsRead(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.notificationsService.markAllAsRead(userId);
  }
}
