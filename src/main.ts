import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    validateCustomDecorators: true,
    stopAtFirstError: false,
    exceptionFactory: (errors) => {
      const messages = errors.map(error => ({
        property: error.property,
        value: error.value,
        constraints: error.constraints,
      }));
      return new BadRequestException({
        message: '입력값 검증 실패',
        errors: messages,
      });
    },
  }));

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Trading System')
    .setDescription('API documentation for the Game-like Trading System')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
