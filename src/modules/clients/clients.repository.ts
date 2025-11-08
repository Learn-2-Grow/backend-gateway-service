import { Injectable, Logger } from "@nestjs/common";
import { IClient } from "src/common/interfaces/clients.interface";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClientsDto } from "./dtos/create-clients.dto";
import { UpdateClientsDto } from "./dtos/update-clients.dto";

/**
 * ClientsRepository - Data Access Layer
 * 
 * This repository demonstrates TWO approaches:
 * 1. Prisma Client Methods (Type-safe, recommended)
 * 2. Raw SQL Queries (For learning and complex queries)
 * 
 * Following PostgreSQL best practices with plural naming
 */
@Injectable()
export class ClientsRepository {
    private readonly logger = new Logger(ClientsRepository.name);

    constructor(private readonly prisma: PrismaService) { }

    // ==========================================
    // METHOD 1: Using Prisma Client (Recommended)
    // ==========================================

    /**
     * Find all clients using Prisma Client
     * Type-safe and auto-completion friendly
     */
    async findAll(): Promise<IClient[]> {
        this.logger.log('Finding all clients with Prisma Client');
        return this.prisma.clients.findMany({
            orderBy: { created_at: 'desc' }
        });
    }

    /**
     * Find client by ID using Prisma Client
     */
    async findById(id: string): Promise<IClient | null> {
        this.logger.log(`Finding client by ID: ${id} with Prisma Client`);
        return this.prisma.clients.findUnique({
            where: { id }
        });
    }

    /**
     * Create client using Prisma Client
     */
    async create(data: CreateClientsDto): Promise<IClient> {
        this.logger.log(`Creating client with Prisma Client: ${data.name}`);
        const payload = {
            name: data.name,
            metadata: data.metadata
        }
        const result = await this.prisma.clients.create({ data: payload });
        return result;
    }

    /**
     * Update client using Prisma Client
     */
    async update(id: string, data: UpdateClientsDto): Promise<IClient | null> {
        this.logger.log(`Updating client ID: ${id} with Prisma Client`);

        try {
            return await this.prisma.clients.update({
                where: { id },
                data: {
                    ...(data.name && { name: data.name }),
                    ...(data.metadata !== undefined && { metadata: data.metadata })
                }
            });
        } catch (error) {
            if (error.code === 'P2025') {
                // Record not found
                return null;
            }
            throw error;
        }
    }

    /**
     * Delete client using Prisma Client
     */
    async delete(id: string): Promise<boolean> {
        this.logger.log(`Deleting client ID: ${id} with Prisma Client`);

        try {
            await this.prisma.clients.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            if (error.code === 'P2025') {
                // Record not found
                return false;
            }
            throw error;
        }
    }

    /**
     * Check if client exists using Prisma Client
     */
    async exists(id: string): Promise<boolean> {
        const count = await this.prisma.clients.count({
            where: { id }
        });
        return count > 0;
    }

    /**
     * Count total clients using Prisma Client
     */
    async count(): Promise<number> {
        return this.prisma.clients.count();
    }

    // ==========================================
    // METHOD 2: Using Raw SQL Queries (For Learning)
    // ==========================================

    /**
     * Find all clients using RAW SQL
     * Good for learning SQL and complex queries
     */
    async findAllRaw(): Promise<IClient[]> {
        this.logger.log('Finding all clients with RAW SQL');

        const result = await this.prisma.$queryRaw<IClient[]>`
            SELECT id, name, metadata, created_at, updated_at
            FROM clients
            ORDER BY created_at DESC
        `;

        return result;
    }

    /**
     * Find client by ID using RAW SQL
     */
    async findByIdRaw(id: string): Promise<IClient | null> {
        this.logger.log(`Finding client by ID: ${id} with RAW SQL`);

        const result = await this.prisma.$queryRaw<IClient[]>`
            SELECT id, name, metadata, created_at, updated_at
            FROM clients
            WHERE id = ${id}
        `;

        return result[0] || null;
    }

    /**
     * Create client using RAW SQL
     */
    async createRaw(data: CreateClientsDto): Promise<IClient> {
        this.logger.log(`Creating client with RAW SQL: ${data.name}`);

        const result = await this.prisma.$queryRaw<IClient[]>`
            INSERT INTO clients (name, metadata)
            VALUES (${data.name}, ${data.metadata ? JSON.stringify(data.metadata) : null}::jsonb)
            RETURNING id, name, metadata, created_at, updated_at
        `;

        return result[0];
    }

    /**
     * Update client using RAW SQL
     */
    async updateRaw(id: string, data: UpdateClientsDto): Promise<IClient | null> {
        this.logger.log(`Updating client ID: ${id} with RAW SQL`);

        // Build dynamic SQL (be careful with SQL injection in production!)
        const updates: string[] = [];
        const values: any[] = [];

        if (data.name !== undefined) {
            updates.push('name = $1');
            values.push(data.name);
        }

        if (data.metadata !== undefined) {
            updates.push(`metadata = $${values.length + 1}::jsonb`);
            values.push(data.metadata ? JSON.stringify(data.metadata) : null);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        // Use executeRaw for updates with returning
        const query = `
            UPDATE clients
            SET ${updates.join(', ')}, updated_at = NOW()
            WHERE id = $${values.length + 1}
            RETURNING id, name, metadata, created_at, updated_at
        `;

        values.push(id);

        const result = await this.prisma.$queryRawUnsafe(query, ...values) as IClient[];

        return result[0] || null;
    }

    /**
     * Delete client using RAW SQL
     */
    async deleteRaw(id: string): Promise<boolean> {
        this.logger.log(`Deleting client ID: ${id} with RAW SQL`);

        const result = await this.prisma.$executeRaw`
            DELETE FROM clients
            WHERE id = ${id}
        `;

        return result > 0;
    }

    /**
     * Complex query example using RAW SQL
     * Find clients with specific metadata key
     */
    async findByMetadataKey(key: string): Promise<IClient[]> {
        this.logger.log(`Finding clients with metadata key: ${key} using RAW SQL`);

        const result = await this.prisma.$queryRaw<IClient[]>`
            SELECT id, name, metadata, created_at, updated_at
            FROM clients
            WHERE metadata ? ${key}
            ORDER BY created_at DESC
        `;

        return result;
    }

    /**
     * Transaction example using Prisma
     * Create multiple clients atomically
     */
    async createMultiple(clients: CreateClientsDto[]): Promise<IClient[]> {
        this.logger.log(`Creating ${clients.length} clients in transaction`);

        return this.prisma.$transaction(
            clients.map(client =>
                this.prisma.clients.create({
                    data: {
                        name: client.name,
                        metadata: client.metadata
                    }
                })
            )
        );
    }
}
