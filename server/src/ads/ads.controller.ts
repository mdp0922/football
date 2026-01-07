import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AdsService } from './ads.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get()
  @ApiOperation({ summary: '获取首页广告' })
  findAll() {
    return this.adsService.findAll();
  }

  @Get('admin')
  @ApiOperation({ summary: '获取所有广告(管理员)' })
  findAllAdmin() {
    return this.adsService.findAllAdmin();
  }

  @Post()
  @ApiOperation({ summary: '创建广告' })
  create(@Body() body: any) {
    return this.adsService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新广告' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.adsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除广告' })
  delete(@Param('id') id: string) {
    return this.adsService.delete(id);
  }
}
