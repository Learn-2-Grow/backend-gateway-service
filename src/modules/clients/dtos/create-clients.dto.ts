import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateClientsDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any> | null;
}
