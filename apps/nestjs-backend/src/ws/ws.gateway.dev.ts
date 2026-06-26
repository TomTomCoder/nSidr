import http from 'http';
import type { AdaptableWebSocket } from '@an-epiphany/websocket-json-stream';
import { WebSocketJSONStream } from '@an-epiphany/websocket-json-stream';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import sockjs from 'sockjs';
import { RealtimeMetricsService } from '../share-db/metrics/realtime-metrics.service';
import { ShareDbService } from '../share-db/share-db.service';

@Injectable()
export class DevWsGateway implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(DevWsGateway.name);
  private sockjsServer: sockjs.Server | null = null;
  private httpServer: http.Server | null = null;
  private readonly activeConnections = new Set<sockjs.Connection>();

  constructor(
    private readonly shareDb: ShareDbService,
    private readonly configService: ConfigService,
    @Optional() private readonly realtimeMetrics?: RealtimeMetricsService
  ) {}

  onModuleInit() {
    // Realtime sync must never take down the whole API. If anything here throws (e.g. the
    // SockJS port is already bound after an unclean HMR reload), swallow it: REST/HTTP keeps
    // serving and only collaborative sync degrades, instead of failing Nest bootstrap so every
    // route returns 500.
    try {
      this.initSockjs();
    } catch (err) {
      this.logger.error(
        `DevWsGateway init failed — realtime sync disabled, REST unaffected: ${
          (err as Error).message
        }`
      );
    }
  }

  private initSockjs() {
    const port = this.configService.get<number>('SOCKET_PORT');

    // SockJS server configuration for collaborative data sync (similar to Airtable)
    // - transports: Only websocket and xhr-streaming (xhr-polling excluded for performance)
    // - response_limit: 1MB to handle large batch operations (table sync, bulk row updates)
    this.sockjsServer = sockjs.createServer({
      prefix: '/socket',
      transports: ['websocket', 'xhr-streaming'],
      response_limit: 2 * 1024 * 1024, // 2MB for large collaborative payloads
      log: (severity: string, message: string) => {
        if (severity === 'error') {
          this.logger.error(message);
        } else if (severity === 'info') {
          this.logger.log(message);
        } else {
          this.logger.debug(message);
        }
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention
    } as sockjs.ServerOptions & { transports: string[]; response_limit: number });

    this.sockjsServer.on('connection', this.handleConnection);

    // Create a standalone HTTP server for development
    this.httpServer = http.createServer();

    // Handle HTTP server errors
    this.httpServer.on('error', this.handleServerError);

    this.sockjsServer.installHandlers(this.httpServer);

    this.httpServer.listen(port, () => {
      this.logger.log(`DevWsGateway (SockJS) initialized, Port: ${port}`);
    });
  }

  private handleConnection = (conn: sockjs.Connection) => {
    if (!conn) return;

    this.activeConnections.add(conn);
    this.realtimeMetrics?.recordConnectionOpen();
    this.logger.log(`sockjs:on:connection (active: ${this.activeConnections.size})`);

    // Handle connection close to clean up tracking
    conn.on('close', () => {
      this.activeConnections.delete(conn);
      this.realtimeMetrics?.recordConnectionClose();
      this.logger.log(`sockjs:on:close (active: ${this.activeConnections.size})`);
    });

    try {
      const stream = new WebSocketJSONStream(conn as unknown as AdaptableWebSocket, {
        adapterType: 'sockjs-node',
      });

      // Get the request with full headers (including cookies)
      const request = this.getRequestFromConnection(conn);

      this.shareDb.listen(stream, request);
    } catch (error) {
      this.logger.error('Connection error', error);
      this.realtimeMetrics?.recordConnectionError();
      conn.write(JSON.stringify({ error }));
      conn.close();
      this.activeConnections.delete(conn);
    }
  };

  /**
   * Extract HTTP request from SockJS connection.
   *
   * SockJS transports provide request access differently:
   * - XHR (xhr-polling, xhr-streaming): Full request at _session.recv.request
   * - WebSocket: Request stored in faye-websocket driver at _session.recv.ws._driver._request
   *
   * @see https://github.com/sockjs/sockjs-node/blob/main/lib/transport/response-receiver.js
   * @see https://github.com/sockjs/sockjs-node/blob/main/lib/transport/websocket.js
   * @see https://github.com/faye/faye-websocket-node (uses websocket-driver internally)
   */
  private getRequestFromConnection(conn: sockjs.Connection): Request {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recv = (conn as any)?._session?.recv;

    // XHR transports: ResponseReceiver stores full request with cookies
    if (recv?.request) {
      return recv.request as Request;
    }

    // WebSocket transport: FayeWebsocket stores request in driver._request
    // Path: recv.ws (FayeWebsocket) -> _driver (Hybi/Base) -> _request (IncomingMessage)
    const wsRequest = recv?.ws?._driver?._request;
    if (wsRequest) {
      return wsRequest as Request;
    }

    // Fallback: use connection's url and headers (no cookies)
    this.logger.warn(
      `Could not find original request for connection (protocol: ${conn.protocol}), falling back to filtered headers`
    );
    return {
      url: conn.url || '/socket',
      headers: conn.headers || {},
    } as unknown as Request;
  }

  private handleServerError = (error: NodeJS.ErrnoException) => {
    // EADDRINUSE after an unclean reload: log a clear, actionable line instead of a raw stack,
    // and do NOT rethrow — the 'error' event handler keeps it from crashing the process.
    if (error?.code === 'EADDRINUSE') {
      this.logger.error(
        `SockJS port ${this.configService.get<number>(
          'SOCKET_PORT'
        )} already in use — realtime sync disabled. A stale dev backend is likely still running.`
      );
      return;
    }
    this.logger.error('HTTP server error', error?.stack);
  };

  async onModuleDestroy() {
    try {
      this.logger.log('Starting graceful shutdown...');

      // Terminate all active connections first
      for (const conn of this.activeConnections) {
        try {
          conn.close();
        } catch {
          // Ignore errors during connection close
        }
      }
      this.activeConnections.clear();

      await Promise.all([
        new Promise<void>((resolve) => {
          this.shareDb.close((err) => {
            if (err) {
              this.logger.error('ShareDb close error', err?.stack);
            } else {
              this.logger.log('ShareDb closed successfully');
            }
            resolve();
          });
        }),

        new Promise<void>((resolve) => {
          if (!this.httpServer) {
            resolve();
            return;
          }
          const server = this.httpServer;
          server.close((err) => {
            if (err) {
              this.logger.error('DevWsGateway close error', err?.stack);
            } else {
              this.logger.log('SockJS server closed successfully');
            }
            resolve();
          });
          // close() alone waits for live websocket/keep-alive connections to drain, which can
          // keep the port bound long enough for the next HMR reload to hit EADDRINUSE. Force
          // them shut so the port is released promptly. (Node 18.2+; optional-chained for older.)
          server.closeAllConnections?.();
        }),
      ]);

      // Clean up references
      this.sockjsServer = null;
      this.httpServer = null;

      this.logger.log('Graceful shutdown completed');
    } catch (err) {
      this.logger.error('Dev module close error: ' + (err as Error).message, (err as Error)?.stack);
    }
  }
}
