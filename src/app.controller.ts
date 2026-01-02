import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import {
  IAppHealthResponse,
  IAppRootResponse,
} from './common/interfaces/app.interface';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('')
  async root(): Promise<IAppRootResponse> {
    return await this.appService.root();
  }

  @Get('health')
  async health(): Promise<IAppHealthResponse> {
    // return health status
    return await this.appService.health();
  }
}
