import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';

@Injectable()
export class LinkExtractorService {
  constructor(private readonly prisma: PrismaService) {}

  async extractLinks(content: string, docId: string, spaceId: string): Promise<void> {
    const links: Array<{
      fromDocId: string;
      toDocId?: string;
      toUrl?: string;
      linkText: string;
      linkType: 'internal' | 'external';
    }> = [];

    // [[wiki links]]
    const wikiRegex = /\[\[([^\]]+)\]\]/g;
    let match: RegExpExecArray | null;
    while ((match = wikiRegex.exec(content)) !== null) {
      const title = match[1].trim();
      const targetDoc = await this.prisma.importedDoc.findFirst({
        where: { spaceId, title: { equals: title, mode: 'insensitive' } },
        select: { id: true },
      });
      links.push({
        fromDocId: docId,
        toDocId: targetDoc?.id,
        linkText: title,
        linkType: 'internal',
      });
    }

    // [text](url) markdown links
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = mdLinkRegex.exec(content)) !== null) {
      const [, text, href] = match;
      const isExternal = href.startsWith('http://') || href.startsWith('https://');
      if (isExternal) {
        links.push({ fromDocId: docId, toUrl: href, linkText: text, linkType: 'external' });
      } else {
        const targetDoc = await this.prisma.importedDoc.findFirst({
          where: { spaceId, title: { equals: href, mode: 'insensitive' } },
          select: { id: true },
        });
        links.push({
          fromDocId: docId,
          toDocId: targetDoc?.id,
          linkText: text,
          linkType: 'internal',
        });
      }
    }

    if (links.length > 0) {
      await this.prisma.docLink.createMany({ data: links, skipDuplicates: true });
    }
  }
}
