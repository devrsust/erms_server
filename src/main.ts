import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService)

  app.setGlobalPrefix('api');

  const origins = configService.get("TRUSTED_ORIGINS")?.split(",") ?? [];
  console.log('CORS allowed origins:', origins);
  app.enableCors({
   origin: origins,
   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
   credentials: true,
   allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const config = new DocumentBuilder()
    .setTitle('Electronic Records Management Api Documentation')
    .setDescription("A RBAC with privilege and actions management API template")
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 6000);
}
bootstrap();
