import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateClientsDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any> | null;
}
