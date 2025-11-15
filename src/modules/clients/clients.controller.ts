import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IClient } from 'src/common/interfaces/clients.interface';
import { ClientsService } from './clients.service';
import { CreateClientsDto } from './dtos/create-clients.dto';
import { UpdateClientsDto } from './dtos/update-clients.dto';

/**
 * ClientsController - REST API endpoints for clients management
 * Base route: /clients
 *
 * Following RESTful API naming standards (plural resource names)
 */
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * Create a new client
   * POST /clients
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateClientsDto): Promise<IClient> {
    return this.clientsService.create(dto);
  }

  /**
   * Get all clients
   * GET /clients
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<IClient[]> {
    return this.clientsService.findAll();
  }

  /**
   * Get client by ID
   * GET /clients/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<IClient> {
    return this.clientsService.findById(id);
  }

  /**
   * Update client by ID
   * PATCH /clients/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientsDto,
  ): Promise<IClient> {
    return this.clientsService.update(id, dto);
  }

  /**
   * Delete client by ID
   * DELETE /clients/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.clientsService.delete(id);
  }

  /**
   * Get total count of clients
   * GET /clients/stats/count
   */
  @Get('stats/count')
  @HttpCode(HttpStatus.OK)
  async getCount(): Promise<{ count: number }> {
    const count = await this.clientsService.getCount();
    return { count };
  }

  // ==========================================
  // RAW SQL Endpoints (For Learning)
  // ==========================================

  /**
   * Get all clients using RAW SQL
   * GET /clients/raw/all
   */
  @Get('raw/all')
  @HttpCode(HttpStatus.OK)
  async findAllRaw(): Promise<IClient[]> {
    return this.clientsService.findAllRaw();
  }

  /**
   * Get client by ID using RAW SQL
   * GET /clients/raw/:id
   */
  @Get('raw/:id')
  @HttpCode(HttpStatus.OK)
  async findOneRaw(@Param('id', ParseUUIDPipe) id: string): Promise<IClient> {
    return this.clientsService.findByIdRaw(id);
  }

  /**
   * Create client using RAW SQL
   * POST /clients/raw
   */
  @Post('raw')
  @HttpCode(HttpStatus.CREATED)
  async createRaw(@Body() dto: CreateClientsDto): Promise<IClient> {
    return this.clientsService.createRaw(dto);
  }
}
