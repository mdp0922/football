import { Controller, Get, Post, Delete, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { CommunityService } from './community.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Community')
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

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

  @Get('posts')
  @ApiOperation({ summary: '获取动态列表' })
  findAll() {
    return this.communityService.findAll();
  }

  @Post('posts')
  @ApiBearerAuth()
  @ApiOperation({ summary: '发布动态' })
  create(
    @Body() body: { content: string; images: string[] },
    @Headers('authorization') authHeader: string,
  ) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.communityService.create(userId, body.content, body.images || []);
  }

  @Post('posts/:id/like')
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞/取消点赞' })
  like(@Param('id') id: number, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.communityService.like(userId, id);
  }

  @Post('posts/:id/comments')
  @ApiBearerAuth()
  @ApiOperation({ summary: '评论' })
  comment(@Param('id') id: number, @Body() body: { content: string; replyToId?: string }, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.communityService.comment(userId, id, body.content, body.replyToId);
  }

  @Delete('posts/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除动态' })
  delete(@Param('id') id: number, @Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.communityService.delete(userId, id);
  }
}
