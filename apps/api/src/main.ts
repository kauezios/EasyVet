import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { configureHttpApp } from './common/http/configure-http-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureHttpApp(app);

  try {
    const authService = app.get(AuthService);
    await authService.ensureBootstrapUsers();
  } catch (error) {
    console.warn('Falha ao inicializar usuarios de bootstrap:', error);
  }

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
