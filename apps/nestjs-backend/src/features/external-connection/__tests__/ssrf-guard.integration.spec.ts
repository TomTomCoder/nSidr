/**
 * ssrf-guard.integration.spec.ts
 *
 * Cross-cutting SSRF guard integration assertions.
 *
 * Covers:
 * (a) Private / loopback / link-local IP literals are blocked (T-18-06-SSRF)
 * (b) Cloud metadata IP 169.254.169.254 is blocked
 * (c) DNS-rebinding host that resolves to a private IP is blocked
 * (d) A hostname resolving to a public IP is allowed
 * (e) An allowlisted hostname bypasses DNS-range check (private corp host)
 * (f) IP literal in allowlist is still range-checked (cannot bypass via allowlist)
 */
import * as dns from 'dns';
import { SsrfGuardService, SsrfBlockedError } from '../ssrf-guard.service';

const mockDns = (v4: string[], v6: string[] = []) => {
  vi.spyOn(dns.promises, 'resolve4').mockResolvedValue(v4 as dns.ResolveOptions[]);
  vi.spyOn(dns.promises, 'resolve6').mockResolvedValue(v6 as dns.ResolveOptions[]);
};

describe('SsrfGuardService — cross-cutting integration', () => {
  let guard: SsrfGuardService;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EXTERNAL_DB_HOST_ALLOWLIST;
    guard = new SsrfGuardService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('(a) blocked IP ranges — loopback / private / link-local', () => {
    it.each([
      ['127.0.0.1', 'loopback'],
      ['127.0.0.2', 'loopback whole /8'],
      ['::1', 'IPv6 loopback'],
      ['10.0.0.1', 'RFC1918 10.x'],
      ['10.255.255.255', 'RFC1918 10.x boundary'],
      ['172.16.0.1', 'RFC1918 172.16-31.x'],
      ['172.31.255.255', 'RFC1918 172.31.x boundary'],
      ['192.168.0.1', 'RFC1918 192.168.x'],
      ['fc00::1', 'IPv6 Unique Local fc00::/7'],
      ['fd00::1', 'IPv6 Unique Local fd00::/7'],
      ['fe80::1', 'IPv6 link-local fe80::/10'],
    ])('rejects %s (%s)', async (ip) => {
      await expect(guard.assertHostAllowed(ip)).rejects.toThrow(SsrfBlockedError);
    });
  });

  describe('(b) cloud metadata IP 169.254.169.254', () => {
    it('rejects the AWS/GCP metadata endpoint IP literal', async () => {
      await expect(guard.assertHostAllowed('169.254.169.254')).rejects.toThrow(SsrfBlockedError);
    });

    it('error message identifies the link-local range', async () => {
      await expect(guard.assertHostAllowed('169.254.169.254')).rejects.toThrow(/169\.254/);
    });
  });

  describe('(c) DNS-rebinding — hostname resolves to private IP', () => {
    it('rejects a host that resolves to a private IP', async () => {
      mockDns(['10.0.0.5']);
      await expect(guard.assertHostAllowed('evil.rebind.example')).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects when ANY resolved address is private (multi-address rebinding)', async () => {
      // One public IP plus one private — the private one must cause rejection.
      mockDns(['8.8.8.8', '192.168.1.1']);
      await expect(guard.assertHostAllowed('dual-stack.rebind.example')).rejects.toThrow(
        SsrfBlockedError
      );
    });
  });

  describe('(d) public hostname is allowed', () => {
    it('passes a hostname resolving to a public IP', async () => {
      mockDns(['8.8.8.8']);
      await expect(guard.assertHostAllowed('qdrant.example.com')).resolves.toBeUndefined();
    });

    it('allows 172.32.0.1 (just above private 172.16-31 range)', async () => {
      // This IP is NOT in 172.16.0.0/12 — it is a public IP literal.
      await expect(guard.assertHostAllowed('172.32.0.1')).resolves.toBeUndefined();
    });
  });

  describe('(e) allowlist — corp host with private IP is allowed', () => {
    it('allows a listed hostname that would resolve to a private IP', async () => {
      process.env.EXTERNAL_DB_HOST_ALLOWLIST = 'qdrant.corp.internal,postgres.corp.internal';
      guard = new SsrfGuardService();
      // DNS mock returns a private IP but allowlist short-circuits the check.
      mockDns(['10.5.0.10']);
      await expect(guard.assertHostAllowed('qdrant.corp.internal')).resolves.toBeUndefined();
    });

    it('rejects a hostname NOT in the allowlist when allowlist is set', async () => {
      process.env.EXTERNAL_DB_HOST_ALLOWLIST = 'allowed.corp';
      guard = new SsrfGuardService();
      mockDns(['8.8.8.8']);
      await expect(guard.assertHostAllowed('not-in-list.corp')).rejects.toThrow(SsrfBlockedError);
    });
  });

  describe('(f) IP literal in allowlist is still range-checked', () => {
    it('rejects loopback IP even when set in allowlist env', async () => {
      // IP literals take the direct assertIpAllowed path — allowlist does not apply to them.
      process.env.EXTERNAL_DB_HOST_ALLOWLIST = '127.0.0.1';
      guard = new SsrfGuardService();
      await expect(guard.assertHostAllowed('127.0.0.1')).rejects.toThrow(SsrfBlockedError);
    });
  });

  describe('SsrfBlockedError properties', () => {
    it('is instanceof SsrfBlockedError and Error', async () => {
      const err = await guard.assertHostAllowed('127.0.0.1').catch((e) => e);
      expect(err).toBeInstanceOf(SsrfBlockedError);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('SsrfBlockedError');
    });

    it('message contains the blocked host', async () => {
      const err = await guard.assertHostAllowed('169.254.169.254').catch((e) => e);
      expect((err as SsrfBlockedError).message).toContain('169.254.169.254');
    });
  });
});
