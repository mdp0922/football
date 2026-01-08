import { Controller, Post, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  @Post()
  @ApiOperation({ summary: '上传文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const protocol = req.protocol;
    const host = req.get('host');
    // 返回相对路径，让浏览器自动处理域名和端口
    // 这样可以避免因 Nginx 代理或 Docker 网络导致的 Host 不一致问题
    return {
      url: `/uploads/${file.filename}`,
    };
  }
}

