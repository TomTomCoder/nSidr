/**
 * Child process (fork) that owns the ONNX model.
 * Spawned with its own --max-old-space-size so ONNX heap is
 * completely separate from the main NestJS process.
 * Communicates via process.send / process.on('message').
 */
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipe: any = null;

async function init() {
  const { pipeline, env } = await import('@xenova/transformers');
  env.cacheDir = process.env.TRANSFORMERS_CACHE ?? './.transformers-cache';
  pipe = await pipeline('feature-extraction', MODEL_ID, { quantized: true });
  process.send?.({ type: 'ready' });
}

init().catch((err) => {
  process.send?.({ type: 'error', message: (err as Error).message });
  process.exit(1);
});

process.on('message', async (msg: { id: number; texts: string[] }) => {
  try {
    if (!pipe) throw new Error('Model not yet loaded');
    const output = await pipe(msg.texts, { pooling: 'mean', normalize: true });
    const raw = output.tolist();
    // Ensure 2D: [[f1,...,f384], ...]
    const embeddings: number[][] = Array.isArray(raw[0]) ? (raw as number[][]) : [raw as number[]];
    process.send?.({ id: msg.id, embeddings });
  } catch (err) {
    process.send?.({ id: msg.id, error: (err as Error).message });
  }
});
