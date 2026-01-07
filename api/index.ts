import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../server/src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();

const createNestServer = async (expressInstance) => {
  try {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressInstance),
    );
    app.enableCors({
      origin: '*',
      credentials: true,
    });
    app.setGlobalPrefix('api');
    await app.init();
  } catch (error) {
    console.error('NestJS App Init Error:', error);
    // Return error to client for debugging
    throw new Error(`NestJS Init Failed: ${error.message || error}`);
  }
};

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default async function handler(req, res) {
  try {
    if (!server.listeners('request').length) {
      await createNestServer(server);
    }
    server(req, res);
  } catch (err) {
    res.status(500).json({
      error: 'Server Initialization Failed',
      details: err.message,
      stack: err.stack
    });
  }
}
