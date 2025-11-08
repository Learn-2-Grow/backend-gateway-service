import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum ServerEnvironment {
  Development = 'development',
  Production = 'production',
}

export class EnvironmentVariables {
  // Application
  @IsEnum(ServerEnvironment)
  NODE_ENV: ServerEnvironment = ServerEnvironment.Development;

  @IsNumber()
  @Min(1000)
  @Max(65535)
  PORT: number = 3000;

  // Database
  @IsString()
  DATABASE_HOST: string = 'localhost';

  @IsNumber()
  DATABASE_PORT: number = 5432;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  // // Redis
  // @IsString()
  // @IsOptional()
  // REDIS_HOST?: string = 'localhost';

  // @IsNumber()
  // @IsOptional()
  // REDIS_PORT?: number = 6379;

  // @IsString()
  // @IsOptional()
  // REDIS_PASSWORD?: string;

  // // JWT
  // @IsString()
  // JWT_SECRET: string;

  // @IsString()
  // @IsOptional()
  // JWT_EXPIRATION?: string = '1h';

  // // AWS
  // @IsString()
  // @IsOptional()
  // AWS_REGION?: string = 'us-east-1';

  // @IsString()
  // @IsOptional()
  // AWS_ACCESS_KEY_ID?: string;

  // @IsString()
  // @IsOptional()
  // AWS_SECRET_ACCESS_KEY?: string;
}

export function envValidator(config: Record<string, unknown>) {
  const validatedConfig: EnvironmentVariables = plainToInstance(
    EnvironmentVariables,
    config,
    {
      enableImplicitConversion: true,
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors?.length > 0) {
    throw new Error(errors?.toString());
  }
  return validatedConfig;
}
