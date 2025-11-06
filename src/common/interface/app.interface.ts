export interface IAppRootResponse {
    message: string;
}

export interface IAppHealthResponse {
    status: string;
    message: string;
    timestamp: string;
    service: {
        name: string;
        version: string;
        environment: string;
    };
    uptime: {
        milliseconds: number;
        seconds: number;
        formatted: string;
    };
    system: {
        nodeVersion: string;
        platform: string;
        architecture: string;
        pid: number;
    };
    memory: {
        heapUsed: string;
        heapTotal: string;
        rss: string;
        external: string;
    };
}
