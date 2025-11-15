import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IClient } from 'src/common/interfaces/clients.interface';
import { ClientsRepository } from './clients.repository';
import { CreateClientsDto } from './dtos/create-clients.dto';
import { UpdateClientsDto } from './dtos/update-clients.dto';

/**
 * ClientsService - Business Logic Layer
 * Handles validation, error handling, and business rules
 */
@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private readonly clientsRepository: ClientsRepository) {}

  /**
   * Create a new client
   */
  async create(dto: CreateClientsDto): Promise<IClient> {
    this.logger.log(`Creating new client: ${dto.name}`);
    return this.clientsRepository.create(dto);
  }

  /**
   * Get all clients
   */
  async findAll(): Promise<IClient[]> {
    this.logger.log('Fetching all clients');
    return this.clientsRepository.findAll();
  }

  /**
   * Get client by ID
   * @throws NotFoundException if client doesn't exist
   */
  async findById(id: string): Promise<IClient> {
    this.logger.log(`Fetching client with ID: ${id}`);
    const client = await this.clientsRepository.findById(id);

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  /**
   * Update client by ID
   * @throws NotFoundException if client doesn't exist
   */
  async update(id: string, dto: UpdateClientsDto): Promise<IClient> {
    this.logger.log(`Updating client with ID: ${id}`);

    // Check if client exists first
    await this.findById(id);

    const updated = await this.clientsRepository.update(id, dto);

    if (!updated) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Delete client by ID
   * @throws NotFoundException if client doesn't exist
   */
  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting client with ID: ${id}`);

    // Check if client exists first
    await this.findById(id);

    const deleted = await this.clientsRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    this.logger.log(`Client with ID ${id} deleted successfully`);
  }

  /**
   * Get total count of clients
   */
  async getCount(): Promise<number> {
    return this.clientsRepository.count();
  }

  /**
   * Check if client exists
   */
  async exists(id: string): Promise<boolean> {
    return this.clientsRepository.exists(id);
  }

  // ==========================================
  // RAW SQL Methods (For Learning)
  // ==========================================

  /**
   * Get all clients using RAW SQL
   */
  async findAllRaw(): Promise<IClient[]> {
    this.logger.log('Fetching all clients with RAW SQL');
    return this.clientsRepository.findAllRaw();
  }

  /**
   * Get client by ID using RAW SQL
   */
  async findByIdRaw(id: string): Promise<IClient> {
    this.logger.log(`Fetching client with ID: ${id} using RAW SQL`);
    const client = await this.clientsRepository.findByIdRaw(id);

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  /**
   * Create client using RAW SQL
   */
  async createRaw(dto: CreateClientsDto): Promise<IClient> {
    this.logger.log(`Creating new client with RAW SQL: ${dto.name}`);
    return this.clientsRepository.createRaw(dto);
  }
}
