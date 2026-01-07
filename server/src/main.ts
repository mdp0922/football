import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { ValidationPipe } from '@nestjs/common';

// Polyfill for global.crypto in Node.js < 19
if (!global.crypto) {
  // @ts-ignore
  global.crypto = crypto;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Set global prefix
  app.setGlobalPrefix('api');

  // Enable ValidationPipe
  // app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('龙里足协管理系统 API')
    .setDescription('Longli Football Association Management System API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
