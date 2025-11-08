import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsRepository } from './clients.repository';
import { ClientsService } from './clients.service';

/**
 * ClientsModule - Feature module for clients management
 *
 * Following NestJS module standards with plural naming
 */
@Module({
  controllers: [ClientsController],
  providers: [ClientsService, ClientsRepository],
  exports: [ClientsService],
})
export class ClientsModule {}
