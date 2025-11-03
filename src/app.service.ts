import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  async health() {
    const health = {
      message: "Server is running....!!!"
    }
    return health
  }
}
