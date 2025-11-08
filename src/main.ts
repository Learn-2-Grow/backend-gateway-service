import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function logStartup(port: number, startupStartTime: bigint): void {
  const startupEndTime = process.hrtime.bigint();
  const totalStartupTime = Number(startupEndTime - startupStartTime) / 1000000;

  // Enhanced startup banner with advanced features
  const nodeVersion = process.version;
  const platform = process.platform;
  const arch = process.arch;
  const memoryUsage = process.memoryUsage();
  const memoryMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
  const env = process.env.NODE_ENV || 'development';
  const startTime = new Date().toLocaleString();

  console.log('\n');
  console.log(
    '╔═══════════════════════════════════════════════════════════════════════════════════╗',
  );
  console.log(
    '║                                                                                   ║',
  );
  console.log(
    '║  ⚡  LEARN2GROW - BACKEND GATEWAY SERVICE  ⚡                                            ║',
  );
  console.log(
    '║  ------------------------------------------------------------------------------   ║',
  );
  console.log(
    `║    🟢 STATUS:   RUNNING             🌐  PORT: ${port.toString().padEnd(30)}      ║`,
  );
  console.log(
    `║    ⏱️  STARTUP:  ${totalStartupTime?.toFixed(2)}ms${' '.repeat(17 - totalStartupTime?.toFixed(2).length)} 🕐  STARTED: ${startTime.padEnd(27)}      ║`,
  );
  console.log(
    `║    💻 ENV:      ${env.toUpperCase().padEnd(19)} 🏗️   NODE: ${nodeVersion.padEnd(31)}     ║`,
  );
  console.log(
    `║    🖥️  PLATFORM: ${platform.padEnd(20)}🏛️   ARCH: ${arch.padEnd(31)}     ║`,
  );
  console.log(
    `║    💾 MEMORY:   ${memoryMB}MB${' '.repeat(17 - memoryMB.length)} 🎯  ENDPOINT: http://localhost:${port}${' '.repeat(9 - port.toString().length)}      ║`,
  );
  console.log(
    '║                                                                                   ║',
  );
  console.log(
    '╚═══════════════════════════════════════════════════════════════════════════════════╝',
  );
  console.log('\n');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 4000;
  const startupStartTime = process.hrtime.bigint();

  await app.listen(port);
  logStartup(port, startupStartTime);
}
bootstrap();
