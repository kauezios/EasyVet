import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureHttpApp } from './common/http/configure-http-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureHttpApp(app);
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
