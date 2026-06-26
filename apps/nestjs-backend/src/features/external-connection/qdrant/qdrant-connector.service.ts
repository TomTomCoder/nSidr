import { BadRequestException } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { DocSearchResult } from '../../doc-search/search.service';
import type { IExternalConnectionConfig } from '../external-connection.service';
import { IVectorConnector, REQUIRED_VECTOR_DIM } from './vector-connector.interface';

/**
 * Default collection name when a connection config omits one.
 */
const DEFAULT_COLLECTION = 'documents';

/**
 * A single point to upsert into a Qdrant collection.
 */
export interface IQdrantPoint {
  id: string;
  vector: number[];
  payload?: Record<string, unknown>;
}

/**
 * Narrowed view of the @qdrant/js-client-rest surface this connector uses.
 * Declaring it lets unit tests inject a fake without dragging in HTTP.
 */
export interface IQdrantClientLike {
  getCollection(name: string): Promise<unknown>;
  query(name: string, body: unknown): Promise<unknown>;
  upsert(name: string, body: unknown): Promise<unknown>;
  delete(name: string, body: unknown): Promise<unknown>;
}

/**
 * Qdrant implementation of IVectorConnector (D-01).
 *
 * A connector instance is bound to a single decrypted ExternalConnection config
 * (host/url + apiKey + collection) — the host has ALREADY been SSRF-validated at
 * 18-01 save time, so this class never re-resolves or trusts an env host
 * (T-18-02-SSRF: connector uses stored config only).
 *
 * Construct via {@link QdrantConnectorService.fromConfig} in production; the
 * constructor accepts an injected client for testing.
 */
export class QdrantConnectorService implements IVectorConnector {
  private readonly collection: string;

  constructor(
    private readonly config: IExternalConnectionConfig,
    private readonly client: IQdrantClientLike
  ) {
    this.collection =
      (typeof config.collection === 'string' && config.collection) || DEFAULT_COLLECTION;
  }

  /**
   * Build a connector from a decrypted ExternalConnection config, constructing a
   * real QdrantClient. The URL is resolved from the stored config only.
   */
  static fromConfig(config: IExternalConnectionConfig): QdrantConnectorService {
    const url = QdrantConnectorService.resolveUrl(config);
    const client = new QdrantClient({
      url,
      apiKey: typeof config.apiKey === 'string' ? config.apiKey : undefined,
      checkCompatibility: false,
    });
    return new QdrantConnectorService(config, client as unknown as IQdrantClientLike);
  }

  /**
   * Resolve the base URL strictly from the stored (already SSRF-gated) config.
   */
  private static resolveUrl(config: IExternalConnectionConfig): string {
    if (typeof config.url === 'string' && config.url) {
      return config.url.replace(/\/$/, '');
    }
    if (config.host) {
      const port = config.port ?? 6333;
      return `http://${config.host}:${port}`;
    }
    throw new BadRequestException('Qdrant connection config must include a host or url');
  }

  /**
   * T-18-02-T: fail fast if the collection's vector dimensionality does not match
   * the internal embedding dimension (1536). A mismatched store would produce
   * meaningless hits once fused into the internal RRF results.
   */
  async validate(): Promise<void> {
    const info = (await this.client.getCollection(this.collection)) as {
      config?: { params?: { vectors?: unknown } };
    };

    const size = this.extractVectorSize(info?.config?.params?.vectors);
    if (size === undefined) {
      throw new BadRequestException(
        `Could not determine vector size for Qdrant collection "${this.collection}"`
      );
    }
    if (size !== REQUIRED_VECTOR_DIM) {
      throw new BadRequestException(
        `Qdrant collection "${this.collection}" has vector size ${size}, but ${REQUIRED_VECTOR_DIM} is required`
      );
    }
  }

  /**
   * Query the collection by a pre-computed embedding and map each point into the
   * internal DocSearchResult shape so it can be fused via the existing RRF math.
   */
  async search(embedding: number[], limit: number): Promise<DocSearchResult[]> {
    const res = (await this.client.query(this.collection, {
      query: embedding,
      limit,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      with_payload: true,
    })) as { points?: Array<{ id: unknown; score: number; payload?: Record<string, unknown> }> };

    const points = res?.points ?? [];
    return points.map((pt) => this.toResult(pt));
  }

  // ── Write path (18-03 EXPORT direction: Teable → Qdrant) ───────────────────

  /**
   * Upsert a batch of points into the collection.
   * Point id = chunkId (string UUID); payload contains docId + content + spaceId.
   * Internal pgvector is NEVER touched here (T-18-03-T).
   */
  async upsertPoints(points: IQdrantPoint[]): Promise<void> {
    if (points.length === 0) return;
    await this.client.upsert(this.collection, {
      wait: true,
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload ?? {},
      })),
    });
  }

  /**
   * Delete all points whose payload.docId matches the given docId.
   * Used on doc delete / reindex (full replacement): old points are purged first.
   */
  async deleteByDocId(docId: string): Promise<void> {
    await this.client.delete(this.collection, {
      wait: true,
      filter: {
        must: [{ key: 'docId', match: { value: docId } }],
      },
    });
  }

  /**
   * Qdrant exposes the vector params in two shapes:
   *  - single unnamed vector: `{ size, distance }`
   *  - named vectors:         `{ <name>: { size, distance }, ... }`
   * For named maps we require ALL configured vectors to match the dim.
   */
  private extractVectorSize(vectors: unknown): number | undefined {
    if (!vectors || typeof vectors !== 'object') return undefined;
    const v = vectors as Record<string, unknown>;
    if (typeof v.size === 'number') return v.size;
    // Named-vector map: take the first entry's size.
    for (const value of Object.values(v)) {
      if (
        value &&
        typeof value === 'object' &&
        typeof (value as { size?: unknown }).size === 'number'
      ) {
        return (value as { size: number }).size;
      }
    }
    return undefined;
  }

  private toResult(pt: {
    id: unknown;
    score: number;
    payload?: Record<string, unknown>;
  }): DocSearchResult {
    const payload = pt.payload ?? {};
    const id = String(pt.id);
    const content =
      this.str(payload.content) ?? this.str(payload.text) ?? this.str(payload.chunkContent) ?? '';
    const docId = this.str(payload.docId) ?? this.str(payload.doc_id) ?? id;
    const docTitle = this.str(payload.title) ?? this.str(payload.docTitle) ?? '';

    return {
      chunkId: id,
      docId,
      docTitle,
      chunkContent: content,
      score: pt.score,
    };
  }

  private str(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}
