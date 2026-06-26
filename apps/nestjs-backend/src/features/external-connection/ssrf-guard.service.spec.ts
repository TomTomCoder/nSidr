import * as dns from 'dns';
import { SsrfGuardService, SsrfBlockedError } from './ssrf-guard.service';

// reused in multiple tests to avoid sonarjs/no-duplicate-string lint error
const privateIpSample = '192.168.1.1';

// Helper to mock dns resolution
const mockResolve = (addresses: string[]) => {
  vi.spyOn(dns.promises, 'resolve4').mockResolvedValue(addresses as dns.ResolveOptions[]);
  vi.spyOn(dns.promises, 'resolve6').mockResolvedValue([] as dns.ResolveOptions[]);
};

const mockResolveV6 = (v4: string[], v6: string[]) => {
  vi.spyOn(dns.promises, 'resolve4').mockResolvedValue(v4 as dns.ResolveOptions[]);
  vi.spyOn(dns.promises, 'resolve6').mockResolvedValue(v6 as dns.ResolveOptions[]);
};

const mockResolveFail = () => {
  vi.spyOn(dns.promises, 'resolve4').mockRejectedValue(
    Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })
  );
  vi.spyOn(dns.promises, 'resolve6').mockRejectedValue(
    Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })
  );
};

describe('SsrfGuardService', () => {
  let service: SsrfGuardService;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EXTERNAL_DB_HOST_ALLOWLIST;
    service = new SsrfGuardService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('IP literals — blocked ranges', () => {
    it('rejects loopback 127.0.0.1 (no DNS needed)', async () => {
      await expect(service.assertHostAllowed('127.0.0.1')).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects loopback 127.x.x.x', async () => {
      await expect(service.assertHostAllowed('127.0.0.2')).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects IPv6 loopback ::1', async () => {
      await expect(service.assertHostAllowed('::1')).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects private 10.0.0.1', async () => {
      await expect(service.assertHostAllowed('10.0.0.1')).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects private 192.168.1.1', async () => {
      await expect(service.assertHostAllowed(privateIpSample)).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects private 172.16.0.1', async () => {
      await expect(service.assertHostAllowed('172.16.0.1')).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects private 172.31.255.255', async () => {
      await expect(service.assertHostAllowed('172.31.255.255')).rejects.toThrow(SsrfBlockedError);
    });

    it('allows 172.32.0.1 (just above private range)', async () => {
      // 172.32.0.1 is NOT in 172.16-31 range — it's public
      // But it's an IP literal, so no DNS lookup
      await expect(service.assertHostAllowed('172.32.0.1')).resolves.toBeUndefined();
    });

    it('rejects cloud metadata 169.254.169.254', async () => {
      await expect(service.assertHostAllowed('169.254.169.254')).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects link-local 169.254.1.1', async () => {
      await expect(service.assertHostAllowed('169.254.1.1')).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects IPv6 private fc00::1', async () => {
      await expect(service.assertHostAllowed('fc00::1')).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects IPv6 private fd00::1', async () => {
      await expect(service.assertHostAllowed('fd00::1')).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects IPv6 link-local fe80::1', async () => {
      await expect(service.assertHostAllowed('fe80::1')).rejects.toThrow(SsrfBlockedError);
    });
  });

  describe('Hostname resolution', () => {
    it('rejects "localhost" hostname resolving to 127.0.0.1', async () => {
      mockResolve(['127.0.0.1']);
      await expect(service.assertHostAllowed('localhost')).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects hostname resolving to private IP (DNS rebinding)', async () => {
      mockResolve(['10.0.0.5']);
      await expect(service.assertHostAllowed('evil.attacker.com')).rejects.toThrow(
        SsrfBlockedError
      );
    });

    it('rejects if ANY resolved address is private (DNS rebinding multi-address)', async () => {
      mockResolveV6(['8.8.8.8', '10.0.0.1'], []);
      await expect(service.assertHostAllowed('rebind.attacker.com')).rejects.toThrow(
        SsrfBlockedError
      );
    });

    it('allows hostname resolving to public IPs', async () => {
      mockResolve(['8.8.8.8']);
      await expect(service.assertHostAllowed('example.com')).resolves.toBeUndefined();
    });

    it('rejects hostname that cannot be resolved', async () => {
      mockResolveFail();
      await expect(service.assertHostAllowed('nonexistent.example.invalid')).rejects.toThrow(
        SsrfBlockedError
      );
    });
  });

  describe('Allowlist via EXTERNAL_DB_HOST_ALLOWLIST', () => {
    it('allows a listed hostname even if DNS would not resolve publicly', async () => {
      process.env.EXTERNAL_DB_HOST_ALLOWLIST = 'my-internal-qdrant.corp,other-host.corp';
      service = new SsrfGuardService();
      mockResolve(['10.0.0.50']); // private IP, would normally be blocked
      await expect(service.assertHostAllowed('my-internal-qdrant.corp')).resolves.toBeUndefined();
    });

    it('rejects a hostname NOT in the allowlist when allowlist is set', async () => {
      process.env.EXTERNAL_DB_HOST_ALLOWLIST = 'allowed.corp';
      service = new SsrfGuardService();
      mockResolve(['8.8.8.8']);
      await expect(service.assertHostAllowed('notallowed.corp')).rejects.toThrow(SsrfBlockedError);
    });

    it('does not bypass SSRF guard for IP literals even if listed', async () => {
      // IP literals in allowlist are still subject to IP range check
      process.env.EXTERNAL_DB_HOST_ALLOWLIST = '127.0.0.1';
      service = new SsrfGuardService();
      // The allowlist shortcircuits hostname check — IP literal loopback is always blocked
      await expect(service.assertHostAllowed('127.0.0.1')).rejects.toThrow(SsrfBlockedError);
    });
  });

  describe('SsrfBlockedError properties', () => {
    it('has a meaningful message', async () => {
      try {
        await service.assertHostAllowed(privateIpSample);
        fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SsrfBlockedError);
        expect((e as SsrfBlockedError).message).toContain(privateIpSample);
      }
    });
  });
});
