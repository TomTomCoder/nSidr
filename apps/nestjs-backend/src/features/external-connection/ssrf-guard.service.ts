import * as dns from 'dns';
import * as net from 'net';
import { Injectable } from '@nestjs/common';

export class SsrfBlockedError extends Error {
  constructor(host: string, reason: string) {
    super(`SSRF guard blocked host "${host}": ${reason}`);
    this.name = 'SsrfBlockedError';
    Object.setPrototypeOf(this, SsrfBlockedError.prototype);
  }
}

/**
 * SsrfGuardService — mandatory SSRF protection gate.
 *
 * Every outbound connection path (Qdrant, Postgres, any future connector)
 * MUST call assertHostAllowed(host) BEFORE opening a socket.
 *
 * Blocked ranges:
 *   - Loopback:         127.0.0.0/8, ::1
 *   - Private (RFC1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 *   - Private IPv6:     fc00::/7 (fc00:: to fdff::)
 *   - Link-local IPv4:  169.254.0.0/16 (includes cloud metadata 169.254.169.254)
 *   - Link-local IPv6:  fe80::/10
 *
 * Optional allowlist: EXTERNAL_DB_HOST_ALLOWLIST (comma-separated hostnames).
 * When set, only listed hostnames are permitted (IP literals are still range-checked).
 *
 * DNS rebinding mitigation: ALL resolved addresses are checked — if any resolved
 * address falls in a blocked range, the host is rejected.
 */
@Injectable()
export class SsrfGuardService {
  private readonly allowlist: Set<string> | null;

  constructor() {
    const raw = process.env.EXTERNAL_DB_HOST_ALLOWLIST;
    if (raw && raw.trim()) {
      this.allowlist = new Set(
        raw
          .split(',')
          .map((h) => h.trim().toLowerCase())
          .filter(Boolean)
      );
    } else {
      this.allowlist = null;
    }
  }

  /**
   * Assert that `host` is allowed for outbound connection.
   * Throws SsrfBlockedError if the host is in a blocked range.
   *
   * @param host - hostname or IP literal (without port)
   */
  async assertHostAllowed(host: string): Promise<void> {
    // Always block IP literals in dangerous ranges, regardless of allowlist
    if (net.isIPv4(host) || net.isIPv6(host)) {
      this.assertIpAllowed(host, host);
      return;
    }

    // Hostname: check allowlist first
    if (this.allowlist !== null) {
      const normalised = host.toLowerCase();
      if (!this.allowlist.has(normalised)) {
        throw new SsrfBlockedError(host, 'host is not in the EXTERNAL_DB_HOST_ALLOWLIST allowlist');
      }
      // Allowlisted hostname — skip IP range checks
      return;
    }

    // No allowlist: resolve hostname and validate all returned addresses
    const addresses = await this.resolveAllAddresses(host);
    for (const addr of addresses) {
      this.assertIpAllowed(host, addr);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Resolve a hostname to all IPv4 and IPv6 addresses.
   * Throws SsrfBlockedError if DNS resolution fails entirely.
   */
  private async resolveAllAddresses(host: string): Promise<string[]> {
    const results: string[] = [];

    const v4 = dns.promises.resolve4(host).catch((err: NodeJS.ErrnoException) => {
      if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') return [];
      return Promise.reject(err);
    });

    const v6 = dns.promises.resolve6(host).catch((err: NodeJS.ErrnoException) => {
      if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') return [];
      return Promise.reject(err);
    });

    let v4Addrs: string[];
    let v6Addrs: string[];
    try {
      [v4Addrs, v6Addrs] = await Promise.all([v4, v6]);
    } catch {
      throw new SsrfBlockedError(host, 'DNS resolution failed');
    }

    results.push(...v4Addrs, ...v6Addrs);

    if (results.length === 0) {
      throw new SsrfBlockedError(host, 'DNS resolution returned no addresses');
    }

    return results;
  }

  /**
   * Check a single resolved IP address against all blocked ranges.
   * Throws SsrfBlockedError if the address is in a blocked range.
   */
  private assertIpAllowed(host: string, ip: string): void {
    if (net.isIPv4(ip)) {
      this.assertIpv4Allowed(host, ip);
    } else if (net.isIPv6(ip)) {
      this.assertIpv6Allowed(host, ip);
    }
    // Unknown format — allow (should not happen in practice)
  }

  private assertIpv4Allowed(host: string, ip: string): void {
    const octets = ip.split('.').map(Number);
    const [a, b, c, d] = octets;

    // Loopback: 127.0.0.0/8
    if (a === 127) {
      throw new SsrfBlockedError(host, `${ip} is a loopback address`);
    }

    // Private RFC1918: 10.0.0.0/8
    if (a === 10) {
      throw new SsrfBlockedError(host, `${ip} is in RFC1918 private range 10.0.0.0/8`);
    }

    // Private RFC1918: 172.16.0.0/12 (172.16 – 172.31)
    if (a === 172 && b >= 16 && b <= 31) {
      throw new SsrfBlockedError(host, `${ip} is in RFC1918 private range 172.16.0.0/12`);
    }

    // Private RFC1918: 192.168.0.0/16
    if (a === 192 && b === 168) {
      throw new SsrfBlockedError(host, `${ip} is in RFC1918 private range 192.168.0.0/16`);
    }

    // Link-local: 169.254.0.0/16 (includes cloud metadata 169.254.169.254)
    if (a === 169 && b === 254) {
      throw new SsrfBlockedError(
        host,
        `${ip} is a link-local/cloud-metadata address (169.254.0.0/16)`
      );
    }

    // Suppress unused variable warning
    void c;
    void d;
  }

  private assertIpv6Allowed(host: string, ip: string): void {
    // Expand the IPv6 address for reliable prefix checking
    const expanded = this.expandIpv6(ip);
    if (!expanded) return; // failed to parse — allow

    // Loopback: ::1
    if (expanded === '0000:0000:0000:0000:0000:0000:0000:0001') {
      throw new SsrfBlockedError(host, `${ip} is an IPv6 loopback address (::1)`);
    }

    // Parse first two bytes (first group) for prefix checks
    const firstGroup = parseInt(expanded.slice(0, 4), 16);

    // Private (Unique Local): fc00::/7 — covers fc00:: to fdff::
    // First byte: 0xfc (11111100) or 0xfd (11111101) — i.e. byte & 0xfe === 0xfc
    const firstByte = (firstGroup >> 8) & 0xff;
    if ((firstByte & 0xfe) === 0xfc) {
      throw new SsrfBlockedError(host, `${ip} is in IPv6 private range fc00::/7`);
    }

    // Link-local: fe80::/10 — fe80 to febf
    // First 10 bits: 1111111010 => first byte 0xfe, second byte high 2 bits = 10 (0x80 to 0xbf)
    const secondByte = firstGroup & 0xff;
    if (firstByte === 0xfe && (secondByte & 0xc0) === 0x80) {
      throw new SsrfBlockedError(host, `${ip} is an IPv6 link-local address (fe80::/10)`);
    }
  }

  /**
   * Expand an IPv6 address to its full 8-group hex form.
   * Returns null on parse failure.
   */
  private expandIpv6(ip: string): string | null {
    try {
      // Remove brackets if present
      const clean = ip.replace(/^\[|\]$/g, '');

      // Handle :: expansion
      const parts = clean.split('::');
      if (parts.length > 2) return null;

      const left = parts[0] ? parts[0].split(':') : [];
      const right = parts[1] ? parts[1].split(':') : [];
      const missing = 8 - left.length - right.length;
      const middle = Array(missing).fill('0000');

      const all = [...left, ...middle, ...right];
      if (all.length !== 8) return null;

      return all.map((g) => g.padStart(4, '0').toLowerCase()).join(':');
    } catch {
      return null;
    }
  }
}
