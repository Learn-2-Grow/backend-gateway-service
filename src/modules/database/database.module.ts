import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { postgresConfig } from "src/common/config/database.config";
import { DatabaseService } from "./database.service";
import { IPostgressConfig } from "./interfaces/postgressConfig.interface";

@Global()

@Module(
    {
        imports: [ConfigModule],
        providers: [
            {
                provide: "POSTGRES_CONNECTION",
                useFactory: (configService: ConfigService) => {
                    const config: IPostgressConfig = postgresConfig(configService);
                    const connectionPool = new Pool(config)
                    return connectionPool;
                },
                inject: [ConfigService]
            },
            DatabaseService
        ],
        exports: ["POSTGRES_CONNECTION", DatabaseService],
    }
)
export class DatabaseModule { }