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
    // 兼容 Docker/Nginx 环境：如果经过了 Nginx 代理，host 可能是 api.example.com
    // 返回相对路径或绝对路径均可，推荐返回完整 URL
    return {
      url: `${protocol}://${host}/uploads/${file.filename}`,
    };
  }
}

