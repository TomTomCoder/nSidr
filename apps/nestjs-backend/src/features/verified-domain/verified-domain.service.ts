import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { randomBytes, randomUUID } from 'crypto';
import { resolveTxt } from 'dns/promises';

export interface VerifiedDomainVo {
  id: string;
  spaceId: string;
  domain: string;
  dnsRecordName: string;
  dnsRecordValue: string;
  verifiedAt: string | null;
  createdTime: string;
}

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

@Injectable()
export class VerifiedDomainService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(spaceId: string, domain: string, createdBy: string): Promise<VerifiedDomainVo> {
    const normalized = domain.trim().toLowerCase();
    if (!DOMAIN_RE.test(normalized)) {
      throw new BadRequestException(`Invalid domain: ${domain}`);
    }
    const token = randomBytes(16).toString('hex');
    const row = await this.prismaService.verifiedDomain.create({
      data: {
        id: randomUUID(),
        spaceId,
        domain: normalized,
        verificationToken: token,
        dnsRecordName: `_teable-verify.${normalized}`,
        dnsRecordValue: `teable-verify=${token}`,
        createdBy,
      },
    });
    return this.toVo(row);
  }

  async list(spaceId: string): Promise<VerifiedDomainVo[]> {
    const rows = await this.prismaService.verifiedDomain.findMany({
      where: { spaceId },
      orderBy: { createdTime: 'desc' },
    });
    return rows.map((r) => this.toVo(r));
  }

  async verify(spaceId: string, id: string): Promise<VerifiedDomainVo> {
    const row = await this.prismaService.verifiedDomain.findFirst({
      where: { id, spaceId },
    });
    if (!row) throw new NotFoundException(`Verified domain ${id} not found`);
    if (row.verifiedAt) return this.toVo(row);

    let txts: string[][] = [];
    try {
      txts = await resolveTxt(row.dnsRecordName);
    } catch (err) {
      throw new BadRequestException(
        `DNS lookup failed for ${row.dnsRecordName}: ${(err as Error).message}`
      );
    }
    const flat = txts.flat();
    if (!flat.includes(row.dnsRecordValue)) {
      throw new BadRequestException(
        `TXT record at ${row.dnsRecordName} does not contain "${row.dnsRecordValue}"`
      );
    }
    const updated = await this.prismaService.verifiedDomain.update({
      where: { id },
      data: { verifiedAt: new Date() },
    });
    return this.toVo(updated);
  }

  async remove(spaceId: string, id: string): Promise<void> {
    await this.prismaService.verifiedDomain
      .deleteMany({ where: { id, spaceId } })
      .catch(() => undefined);
  }

  private toVo(r: {
    id: string;
    spaceId: string;
    domain: string;
    dnsRecordName: string;
    dnsRecordValue: string;
    verifiedAt: Date | null;
    createdTime: Date;
  }): VerifiedDomainVo {
    return {
      id: r.id,
      spaceId: r.spaceId,
      domain: r.domain,
      dnsRecordName: r.dnsRecordName,
      dnsRecordValue: r.dnsRecordValue,
      verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
      createdTime: r.createdTime.toISOString(),
    };
  }
}
