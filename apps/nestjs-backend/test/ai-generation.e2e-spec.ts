/* Real e2e test of the 6 AI generations (Table, Interface, Automation, Agent, App, Mock Data),
 * twice each, against the configured LLM. Boots the real app via initApp() + seeded test user.
 * Run: pnpm -F @teable/backend test-e2e (needs the e2e seed for the test user).
 * Requires node@22 (see scripts/launch-local.sh) and the vitest-e2e dedupe fix. */
// Skip the base-sql-executor read-only-role creation (needs Postgres CREATEROLE, absent on dev DBs).
process.env.DISABLE_PRE_SQL_EXECUTOR_CHECK = 'true';
import { axios, createSpace, deleteSpace, createBase, createTable } from '@teable/openapi';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { initApp } from './utils/init-app';

describe('AI generation — real e2e (each target x2)', () => {
  let app: any;
  let spaceId = '';
  let baseId = '';
  let tableId = '';
  const summary: any[] = [];

  beforeAll(async () => {
    const ctx = await initApp();
    app = ctx.app;
    const space = (await createSpace({ name: 'AItest' + Date.now() })).data;
    spaceId = space.id;
    baseId = (await createBase({ spaceId, name: 'AItestbase' })).data.id;
    tableId = (await createTable(baseId, { name: 'Contacts' })).data.id;
  }, 120000);

  afterAll(async () => {
    if (spaceId) { try { await deleteSpace(spaceId); } catch { /* noop */ } }
    console.log('AIGEN_SUMMARY ' + JSON.stringify(summary));
    await app?.close();
  });

  const targets = () => [
    { key: 'table', prompt: 'Cree une table Fournisseurs avec des champs Nom, Email, Ville.' },
    { key: 'interface', prompt: 'Cree une interface de suivi pour la table Contacts.' },
    { key: 'automation', prompt: 'Cree une automatisation qui envoie un email a la creation d un enregistrement.' },
    { key: 'agent', prompt: 'Cree un agent qui repond aux questions sur cette base.' },
    { key: 'app', prompt: 'Cree une petite application de gestion de contacts.' },
    { key: 'mock_data', prompt: 'Remplis quelques lignes de donnees fictives.', pageContext: { tableId, tableName: 'Contacts' } },
  ];

  const run = async (t: any) => {
    let raw = '';
    try {
      const res = await axios.post(`/spaces/${spaceId}/ai/chat`,
        { message: t.prompt, baseId, activeBaseId: baseId, targetType: t.key, pageContext: t.pageContext },
        { responseType: 'text', timeout: 110000, headers: { Accept: 'text/event-stream' } });
      raw = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    } catch (e: any) {
      raw = 'HTTP_ERR ' + (e?.response?.status || '') + ' ' + (typeof e?.response?.data === 'string' ? e.response.data.slice(0, 300) : e?.message);
    }
    const hasError = /"type"\s*:\s*"error"/.test(raw) || raw.startsWith('HTTP_ERR');
    const nProp = (raw.match(/"type"\s*:\s*"proposal"/g) || []).length;
    const nText = (raw.match(/"type"\s*:\s*"text/g) || []).length;
    const errSnip = hasError ? (raw.match(/"type"\s*:\s*"error"[^}]*}/)?.[0] || raw.slice(0, 300)) : '';
    return { target: t.key, ok: !hasError, nProp, nText, errSnip };
  };

  for (const t of targets()) for (const n of [1, 2]) {
    it(`${t.key} run ${n}`, async () => {
      const r = await run(t);
      summary.push(r);
      console.log(`AIGEN ${t.key} run${n} ` + JSON.stringify(r));
      expect(r.ok, JSON.stringify(r)).toBe(true);
    }, 120000);
  }
});
