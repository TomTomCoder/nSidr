import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IExternalConnectionConfig } from '../external-connection.service';
import { QdrantConnectorService } from './qdrant-connector.service';
import { REQUIRED_VECTOR_DIM } from './vector-connector.interface';

// A minimal fake of the @qdrant/js-client-rest QdrantClient surface we use.
interface FakeClient {
  getCollection: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
}

const makeClient = (over: Partial<FakeClient> = {}): FakeClient => ({
  getCollection: vi.fn(),
  query: vi.fn(),
  ...over,
});

const baseConfig: IExternalConnectionConfig = {
  url: 'http://qdrant.example.com:6333',
  apiKey: 'k',
  collection: 'docs',
};

describe('QdrantConnectorService', () => {
  let client: FakeClient;

  beforeEach(() => {
    client = makeClient();
  });

  const make = (config = baseConfig) =>
    // Inject the fake client via the test-only factory override.
    new QdrantConnectorService(config, client as never);

  describe('validate()', () => {
    it('passes when the collection vector size == 1536', async () => {
      client.getCollection.mockResolvedValue({
        config: { params: { vectors: { size: REQUIRED_VECTOR_DIM, distance: 'Cosine' } } },
      });
      const svc = make();
      await expect(svc.validate()).resolves.toBeUndefined();
      expect(client.getCollection).toHaveBeenCalledWith('docs');
    });

    it('rejects fast with a clear error when the vector size != 1536', async () => {
      client.getCollection.mockResolvedValue({
        config: { params: { vectors: { size: 768, distance: 'Cosine' } } },
      });
      const svc = make();
      await expect(svc.validate()).rejects.toThrow(/1536/);
      await expect(svc.validate()).rejects.toThrow(/768/);
    });

    it('reads vector size from a named-vector map shape too', async () => {
      // Qdrant returns a map keyed by vector name when named vectors are configured.
      client.getCollection.mockResolvedValue({
        config: {
          params: { vectors: { default: { size: REQUIRED_VECTOR_DIM, distance: 'Cosine' } } },
        },
      });
      const svc = make();
      await expect(svc.validate()).resolves.toBeUndefined();
    });

    it('throws a clear error when collection metadata is missing vector size', async () => {
      client.getCollection.mockResolvedValue({ config: { params: {} } });
      const svc = make();
      await expect(svc.validate()).rejects.toThrow(/vector size/i);
    });
  });

  describe('search()', () => {
    it('queries by embedding and maps points into DocSearchResult', async () => {
      client.query.mockResolvedValue({
        points: [
          {
            id: 'pt-1',
            score: 0.92,
            payload: { content: 'hello world', docId: 'doc-9', title: 'Greeting' },
          },
        ],
      });
      const svc = make();
      const out = await svc.search([0.1, 0.2, 0.3], 5);

      expect(client.query).toHaveBeenCalledWith('docs', {
        query: [0.1, 0.2, 0.3],
        limit: 5,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        with_payload: true,
      });
      expect(out).toEqual([
        {
          chunkId: 'pt-1',
          docId: 'doc-9',
          docTitle: 'Greeting',
          chunkContent: 'hello world',
          score: 0.92,
        },
      ]);
    });

    it('coerces numeric ids and falls back when payload fields are absent', async () => {
      client.query.mockResolvedValue({
        points: [{ id: 42, score: 0.5, payload: { text: 'fallback content' } }],
      });
      const svc = make();
      const out = await svc.search([0.1], 3);
      expect(out[0].chunkId).toBe('42');
      expect(out[0].chunkContent).toBe('fallback content');
      expect(out[0].docId).toBe('42');
      expect(out[0].score).toBe(0.5);
    });

    it('returns an empty array when the store has no hits', async () => {
      client.query.mockResolvedValue({ points: [] });
      const svc = make();
      await expect(svc.search([0.1], 5)).resolves.toEqual([]);
    });
  });
});
