import type { parseDsnOrThrow } from '@httpx/dsn-parser';
export type IDsn = ReturnType<typeof parseDsnOrThrow>;
export declare enum DriverClient {
    Pg = "postgresql"
}
export declare function parseDsn(dsn: string): IDsn;
export declare function isParsableDsn(dsn: unknown): boolean;
