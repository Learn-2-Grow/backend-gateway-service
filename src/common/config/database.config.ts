import { ConfigService } from '@nestjs/config';
import { IPostgressConfig } from 'src/modules/database/interfaces/postgressConfig.interface';

export const postgresConfig = (
  configService: ConfigService,
): IPostgressConfig => {
  const config: IPostgressConfig = {
    // type: 'postgres',
    host: configService.get('DATABASE_HOST'),
    port: parseInt(configService.get('DATABASE_PORT') || '5432', 10),
    user: configService.get('DATABASE_USER'),
    password: configService.get('DATABASE_PASSWORD'),
    database: configService.get('DATABASE_NAME'),
  };

  return config;
};
