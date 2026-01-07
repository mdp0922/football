import { Controller, Get, Put, Body, Headers, UnauthorizedException, Post, Param, Delete, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

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

  @Get('search')
  @ApiOperation({ summary: '搜索用户' })
  search(@Query('q') q: string) {
    return this.userService.search(q);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取个人信息' })
  getProfile(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.userService.getProfile(userId);
  }

  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新个人信息' })
  updateProfile(@Headers('authorization') authHeader: string, @Body() body: any) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.userService.updateProfile(userId, body);
  }

  @Put('auth')
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交实名认证' })
  submitAuth(@Headers('authorization') authHeader: string, @Body() body: any) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.userService.submitAuth(userId, body);
  }

  @Post('apply-cert')
  @ApiBearerAuth()
  @ApiOperation({ summary: '申请专业认证' })
  applyCert(@Headers('authorization') authHeader: string, @Body() body: { type: string, files: string[], level?: string, realName?: string, idCard?: string }) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.userService.applyCertification(userId, body.type, body.files, body.level, body.realName, body.idCard);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  async changePassword(@Headers('authorization') authHeader: string, @Body() body: any) {
    const userId = this.getUserIdFromToken(authHeader);
    try {
        await this.userService.changePassword(userId, body.oldPassword, body.newPassword);
        return { message: '密码修改成功' };
    } catch (e) {
        throw new UnauthorizedException(e.message || '修改失败');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定用户信息' })
  getUser(@Param('id') id: string) {
    return this.userService.getProfile(id);
  }

  @Delete()
  @ApiBearerAuth()
  @ApiOperation({ summary: '注销账户' })
  deleteAccount(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.userService.deleteAccount(userId);
  }
}
