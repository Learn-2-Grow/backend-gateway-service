import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('')
  async root(): Promise<any> {
    return await this.appService.root();
  }

  @Get('health')
  async health(): Promise<any> {
    return await this.appService.health();
  }
}
