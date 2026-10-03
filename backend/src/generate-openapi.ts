import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { API_MODELS, MeDto } from './contracts/api.dto';
import { ApiResult } from './contracts/api-result.decorator';
import { MeController } from './auth/me.controller';

async function main() {
  // Add contract metadata externally, preserving the copied reference controller.
  ApiResult(MeDto)(
    MeController.prototype,
    'me',
    Object.getOwnPropertyDescriptor(MeController.prototype, 'me'),
  );
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'auth/login', method: RequestMethod.GET },
      { path: 'auth/callback', method: RequestMethod.GET },
      { path: 'auth/logout', method: RequestMethod.POST },
    ],
  });
  const config = new DocumentBuilder()
    .setTitle('Coding Arena')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: API_MODELS,
  });
  writeFileSync('openapi.json', JSON.stringify(document, null, 2) + '\n');
  await app.close();
}
void main();
