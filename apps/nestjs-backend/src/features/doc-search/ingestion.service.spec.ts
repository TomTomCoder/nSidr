import { describe, it, expect, beforeEach } from 'vitest';
import { DocIngestionService } from './ingestion.service';

interface ChunkResult {
  content: string;
  startOffset: number;
  endOffset: number;
  tokenCount: number;
}

// chunkContent is private and dependency-free; exercise it directly via a typed accessor.
type ChunkAccessor = { chunkContent(text: string): ChunkResult[] };

describe('DocIngestionService.chunkContent (markdown-aware)', () => {
  let chunk: (text: string) => ChunkResult[];

  beforeEach(() => {
    const service = new DocIngestionService({} as never, {} as never, {} as never);
    chunk = (text) => (service as unknown as ChunkAccessor).chunkContent(text);
  });

  it('splits on markdown headings, keeping each section intact', () => {
    const md = [
      '# Title',
      'Intro paragraph.',
      '',
      '## Alpha',
      'Alpha body paragraph.',
      '',
      '## Beta',
      'Beta body paragraph.',
    ].join('\n');

    const chunks = chunk(md);
    // Small doc → one chunk per heading section.
    expect(chunks.length).toBe(3);
    expect(chunks[0].content).toContain('# Title');
    expect(chunks[1].content).toContain('## Alpha');
    expect(chunks[2].content).toContain('## Beta');
    // Heading bodies stay with their heading.
    expect(chunks[1].content).toContain('Alpha body');
    expect(chunks[2].content).toContain('Beta body');
  });

  it('never emits a chunk above the hard cap (≈1800 tokens / ~1350 words)', () => {
    const giant = Array.from({ length: 5000 }, (_, i) => `word${i}`).join(' ');
    const chunks = chunk(`# Big\n\n${giant}`);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.tokenCount).toBeLessThanOrEqual(1800);
    }
  });

  it('packs small paragraphs together up to the target size', () => {
    const md = ['## Section', '', 'Para one.', '', 'Para two.', '', 'Para three.'].join('\n');
    const chunks = chunk(md);
    // All small paragraphs in one section fit a single chunk.
    expect(chunks.length).toBe(1);
    expect(chunks[0].content).toContain('Para one.');
    expect(chunks[0].content).toContain('Para three.');
  });

  it('produces valid, ordered, non-empty offsets', () => {
    const md = '# A\n\nfirst body\n\n## B\n\nsecond body\n\n## C\n\nthird body';
    const chunks = chunk(md);
    for (const c of chunks) {
      expect(c.content.trim().length).toBeGreaterThan(0);
      expect(c.startOffset).toBeGreaterThanOrEqual(0);
      expect(c.endOffset).toBeGreaterThan(c.startOffset);
      expect(c.tokenCount).toBeGreaterThan(0);
    }
  });

  it('handles a degenerate single-line document', () => {
    const chunks = chunk('just one line with no structure at all');
    expect(chunks.length).toBe(1);
    expect(chunks[0].content).toContain('just one line');
  });

  it('returns no chunks for empty or whitespace-only input', () => {
    expect(chunk('')).toEqual([]);
    expect(chunk('   \n\n  \t ')).toEqual([]);
  });
});
