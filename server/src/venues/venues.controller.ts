import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';

@ApiTags('Venues')
@Controller('venues')
export class VenuesController {
  constructor(
    private readonly venuesService: VenuesService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private async checkAdmin(authHeader: string) {
    if (!authHeader) throw new UnauthorizedException('未登录');
    const token = authHeader.replace('Bearer ', '');
    try {
      const userId = Buffer.from(token, 'base64').toString('utf-8');
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        throw new ForbiddenException('权限不足');
      }
      return user;
    } catch (e) {
      throw new UnauthorizedException('无效 Token');
    }
  }

  @Get()
  @ApiOperation({ summary: '获取场地列表' })
  findAll() {
    return this.venuesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取场地详情' })
  findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建场地 (管理员)' })
  async create(@Headers('authorization') authHeader: string, @Body() body: any) {
    await this.checkAdmin(authHeader);
    return this.venuesService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新场地 (管理员)' })
  async update(@Headers('authorization') authHeader: string, @Param('id') id: string, @Body() body: any) {
    await this.checkAdmin(authHeader);
    return this.venuesService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除场地 (管理员)' })
  async remove(@Headers('authorization') authHeader: string, @Param('id') id: string) {
    await this.checkAdmin(authHeader);
    return this.venuesService.remove(id);
  }
}
