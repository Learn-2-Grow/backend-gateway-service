import { Clients } from '@prisma/client';

// Export Prisma type as our main interface
// export type IClient = Clients;
export interface IClient extends Clients {}
