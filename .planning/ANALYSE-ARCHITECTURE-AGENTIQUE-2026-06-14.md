# Analyse de l'architecture agentique de Teable (2026-06-14)

Verdict : **oui, c'est réellement agentique** — pas un simple chatbot. C'est un agent
ReAct fonctionnel (boucle outils autonome, outils qui agissent sur le monde, mémoire
persistante/sémantique, autonomie via déclencheurs). Détails et limites ci-dessous.

## Les 5 piliers d'un vrai agent — état dans Teable

### 1. Boucle agentique (decide → act → observe → iterate) ✅
`apps/nestjs-backend/src/features/agent/agent-execution.service.ts`, `run()` (l.265) :
- `while (iterations < maxIterations)` (défaut 10) — la boucle d'agent canonique.
- Chaque tour : `generateText({ tools, stopWhen: stepCountIs(1) })` → le **LLM choisit**
  les outils (il n'est pas scripté).
- `executeToolCall()` exécute, puis le **résultat est réinjecté** dans `messages`
  (`role:'tool'`) → observé au tour suivant.
- **Terminaison décidée par le modèle** : `if (!toolCalls) break` (l.291) — il s'arrête
  quand il juge avoir fini, pas après N étapes fixes.
- Choix de design : la boucle est pilotée manuellement (un pas SDK à la fois) pour
  streamer les événements (`think`/`tool`/`text`), persister chaque message et gérer le
  HITL entre les pas.

### 2. Outils qui agissent réellement ✅
`executeToolCall()` (l.476) dispatch de vrais effets de bord :
- Données : `search_records`, `get_records`, `create_record`, `update_record`,
  `create_comment`, `create_table`, `create_field`, `create_view`, `create_app`.
- Externe : `read_unread_emails`, `search_emails` (via les intégrations OAuth — Gmail).
- Mémoire : `search_memory`, `get_memory`, `save_memory` (graphe d'entités).
- HITL : `request_human_approval`.
- MCP : outils agrégés depuis des serveurs MCP externes/plugins par agent
  (`mcp/mcp-client-aggregator.service.ts`) — et Teable est **lui-même un serveur MCP**
  (`mcp/teable-mcp-server.service.ts`), exposant ses capacités à d'autres agents.

### 3. Mémoire persistante + sémantique ✅
`agent-memory.service.ts` + graphe mémoire (migration `agent_memory_graph`) :
- Épisodique : `saveRecent()` après chaque run, **réinjecté dans le system prompt**
  (`getRecent` + `getPreferences`, l.196‑212) → contexte toujours présent.
- Sémantique : `search_memory` fait une recherche sur un graphe d'entités/relations
  extrait des documents de l'espace (RAG). `get_memory` renvoie entités + relations.

### 4. Autonomie (s'exécute sans prompt humain) ✅
`agent-trigger.service.ts` + `agent-scheduler.service.ts` + `agent-event.listener.ts` :
- `cron` (BullMQ) — exécution **planifiée**, sans humain.
- `mention` — déclenché par une mention dans un record (event bus).
- `dm` — message direct.
C'est le signal agentique fort : l'agent n'est pas seulement réactif à un chat, il agit
seul sur événement ou planning.

### 5. Garde-fous + HITL + robustesse ✅
- `agent-guardrail.service.ts` : valide les valeurs de champ contre le schéma avant
  écriture en base.
- HITL : `request_human_approval` suspend la boucle (`waiting_for_approval`, migration
  `add_approval_to_agent_conversation`).
- Multi-modèle : failover primaire→fallbacks sur erreurs 429/5xx (ARH‑01), via AI Gateway
  / Vercel AI SDK v6.
- Permissions : `agent-permission.guard.ts`.

## MISE À JOUR (2026-06-14, commit 648e5c5e2) — planification + réflexion AJOUTÉES
La limite #1 ci-dessous est désormais comblée : `agent-planner.service.ts` ajoute une
phase **plan-and-execute** (décomposition de l'objectif en plan/todo suivi, outil
`update_plan`) + une phase **réflexion/auto-critique** (l'agent se relit quand il se croit
fini ; si l'objectif n'est pas atteint et qu'il reste des réflexions, il continue),
bornée par `maxIterations` ET `maxReflections`. Fail-open (jamais de boucle infinie).
Flags `planningEnabled`/`reflectionEnabled`/`maxReflections` (par défaut activés). 11 tests.

## MISE À JOUR (2026-06-14, commit 99e707835) — multi-agent AJOUTÉ
La limite #2 est désormais comblée : pattern **orchestrateur → sous-agents**. Outils
`list_agents` + `delegate_to_agent` : un agent délègue une sous-tâche à un agent
spécialiste de la même base ; le sous-agent exécute sa propre boucle plan+réflexion et
renvoie son résultat (composable). Garde-fous : profondeur de délégation bornée (2),
pas d'auto-délégation, même base uniquement. 5 tests. **Teable est maintenant un agent
plan-and-execute + réflexion + multi-agents — niveau state-of-the-art.**

## Où c'est « agentique léger » — limites honnêtes (état initial)
1. ~~**Pas de planification explicite**~~ → **FAIT** (voir mise à jour ci-dessus).
2. **Mono-agent** : pas d'orchestration multi-agents ni de délégation à des sous-agents
   spécialisés (une seule boucle). Atténué par la capacité à consommer d'autres MCP.
3. **Borné à `maxIterations` (10 par défaut)** : une tâche longue peut être tronquée.
4. **Boucle SDK réimplémentée** : `stopWhen: stepCountIs(1)` + `execute: () => null`
   (no‑op) puis re‑dispatch externe — fonctionne, mais réécrit ce que la boucle native du
   SDK fait, donc plus de code à maintenir et les résultats d'outils du SDK sont ignorés.

## Conclusion
Sur l'échelle « chatbot → workflow LLM → agent ReAct → agent planifiant → multi-agents »,
Teable se situe solidement au niveau **agent ReAct outillé, autonome et mémoriel** —
clairement « agentique », au-delà d'un chatbot ou d'un workflow scripté. Les axes pour le
rendre « plus agentique » : ajouter une phase de planification/réflexion, lever/raffiner
la borne d'itérations, et éventuellement une orchestration multi-agents.
