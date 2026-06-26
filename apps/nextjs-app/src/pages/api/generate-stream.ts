import http from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: '1mb' },
    externalResolver: true,
  },
};

const BACKEND_PORT = Number(
  process.env.NEXTJS_BACKEND_PORT || process.env.BACKEND_PORT || '3002'
);

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  const { baseId, appId } = req.query as { baseId: string; appId: string };
  if (!baseId || !appId) {
    res.status(400).json({ error: 'Missing baseId or appId' });
    return;
  }
  const body = JSON.stringify(req.body);

  const options: http.RequestOptions = {
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: `/api/base/${baseId}/app/${appId}/generate-stream`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
    },
  };

  // Disable Nagle's algorithm so each chunk is flushed immediately
  (res as unknown as { socket?: { setNoDelay?: (v: boolean) => void } }).socket?.setNoDelay?.(true);

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 200, {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    proxyRes.on('data', (chunk: Buffer) => res.write(chunk));
    proxyRes.on('end', () => res.end());
    proxyRes.on('error', () => res.end());
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) res.status(502).json({ error: String(err) });
    else res.end();
  });

  res.on('close', () => proxyReq.destroy());
  proxyReq.write(body);
  proxyReq.end();
}
