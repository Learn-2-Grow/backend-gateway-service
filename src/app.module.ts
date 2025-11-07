import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidator } from './common/validators/env.validator';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: envValidator,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
