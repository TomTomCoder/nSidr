# Roadmap — Génération IA avancée (Tables, Interfaces, Automatisations, Agents, Application complète, Données fictives)

> Complète [AI-SYSTEM.md](./AI-SYSTEM.md). Issu de l'analyse comparative entre l'architecture actuelle et la spécification cible (2026-06-28). Chaque phase ne démarre qu'une fois la précédente entièrement cochée et vérifiée — voir « Règles » ci-dessous.

## Règles (à respecter à chaque phase, sans exception)

1. **Dépendances avant code** : avant d'ouvrir un fichier à modifier, vérifier qui l'importe/l'injecte (`grep -rn` sur le nom de service/composant) pour ne pas casser un appelant existant.
2. **Aucune régression silencieuse** : à la fin de chaque phase — `tsc --noEmit` (backend + frontend), `eslint --fix` sur les fichiers touchés, suite de tests concernée (`vitest run`), puis un build webpack complet (`pnpm exec nest build`). Une phase n'est cochée « Vérifiée » que si les 4 passent.
3. **Tests avant refactor profond** : si une phase touche une fonction sans test existant, écrire le test de comportement actuel *avant* de la modifier (filet de sécurité, déjà la méthode utilisée pour `chatInner`).
4. **Pas de big-bang** : chaque case à cocher doit être un commit/diff indépendamment revuable. Ne jamais cocher plusieurs tâches dans le même diff sans vérification intermédiaire.
5. **Suppressions = confirmation explicite** : toute suppression de code (ancien outil, ancien champ) passe par une question à l'utilisateur avant exécution, comme pour `PromptCarousel.tsx`.

---

## Phase 0 — Déjà en place (acquis, ne pas refaire)

- [x] `targetType` (table/interface/automation/agent/app/mock_data) + restriction d'outils par cible
- [x] Garde-fou defense-in-depth dans `buildWriteTool`
- [x] Try/catch global `chat()` → événement `error` propre
- [x] `query_records` réel (plus un stub)
- [x] « Données fictives » : remplissage des lignes vides, schéma `generateObject` tolérant
- [x] `chatInner` découpé (`buildSystemPrompt`, `resolveModelInstance`, `runAutoProposalHeuristics`)
- [x] Design system de marque (Paramètres de marque) injecté dans `generateAppCodeStream`
- [x] Suite de tests `unified-ai.service.spec.ts` (20 tests) + `workspace-state.service.spec.ts` corrigé

---

## Phase 1 — Automatisations : déclencheur/condition/action typés

**Pourquoi en premier** : le risque de fiabilité le plus immédiat (texte libre → LLM → JSON, double saut d'erreur non validé), changement le moins invasif, aucune dépendance sur les autres phases.

**Dépendances** : aucune. Peut démarrer immédiatement.

### Backend
- [x] Vérifier dans `workflow.service.ts` / `workflow-ai.service.ts` quelles actions sont **réellement** exécutables par le moteur de workflow actuel avant de les promettre à l'IA — audité : **8 triggers** réels (`scheduled`, `webhook_received`, `email_received`, `record_created`, `record_updated`, `record_deleted`, `button_clicked`, `record_matches_conditions`) et **9 steps** réels (`send_slack`, `send_email`, `http_request`, `if_condition`, `ai_generate`, `create_record`, `update_record`, `get_records`, `execute_script`) déjà définis dans `WorkflowTriggerSchema`/`WorkflowStepSchema` ([workflow-ai.service.ts](../apps/nestjs-backend/src/features/workflow/workflow-ai.service.ts)) et exécutés par `workflow-executor.service.ts`. Pas de `run_agent`/`call_api` séparé comme imaginé initialement — `http_request` couvre l'appel API, et il n'existe pas d'action "lancer un agent" aujourd'hui (non promise).
- [x] Étendre le schéma Zod de l'outil `create_automation` ([unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts)) : **réutilise directement** `WorkflowTriggerSchema`/`WorkflowStepSchema` (exportées depuis `workflow-ai.service.ts`) plutôt que de redéfinir un schéma parallèle qui pourrait diverger — `trigger: WorkflowTriggerSchema.optional()`, `steps: z.array(WorkflowStepSchema).min(1).max(10).optional()`, remplace les strings libres `trigger`/`action`
- [x] Adapter `action-proposal.service.ts` case `create_automation` : si `trigger`+`steps` structurés sont fournis, validation directe via `WorkflowConfigSchema.safeParse` puis `updateWorkflow` — **plus d'appel LLM intermédiaire** (suppression du round-trip `generateWorkflowFromPrompt` quand l'IA a déjà produit une structure valide)
- [x] Garder un fallback texte libre (`description` optionnelle) passé à `generateWorkflowFromPrompt` uniquement quand `trigger`/`steps` sont absents — erreur de génération maintenant **renvoyée** (`status: 'partial'` + raison) au lieu d'être avalée silencieusement (`catch {}` vide supprimé)

### Frontend
- [x] `AUTOMATION_CARDS` ([UnifiedChatContainer.tsx](../apps/nextjs-app/src/components/AgentChat/UnifiedChatContainer.tsx)) : prompts déjà alignés sur les triggers réels (création d'enregistrement, changement de statut) — pas de changement nécessaire après audit
- [x] `ProposalCard.tsx` : preview structuré ajouté — branche dédiée affichant le déclencheur (libellé FR) et la liste numérotée des étapes, plus de blob JSON pour les automatisations

### Tests
- [x] Test : `create_automation` avec trigger+steps structurés valides → `updateWorkflow` appelé directement, **`generateWorkflowFromPrompt` jamais appelé**
- [x] Test : trigger/step hors enum → `status: 'skipped'` avec raison Zod claire, pas de mutation de workflow
- [x] Test : fallback texte libre toujours fonctionnel (pas de régression)
- [x] Test : échec de génération en fallback texte libre → `status: 'partial'` avec raison, pas avalé silencieusement

### Vérification avant Phase 2
- [x] `tsc --noEmit` backend clean (hors erreurs pré-existantes déjà identifiées) — confirmé via `git stash` diff
- [x] `eslint` clean sur les fichiers touchés (hors warnings pré-existants confirmés via `git stash`)
- [x] `vitest run` action-proposal (17 tests, +4) + unified-ai (20 tests) → 100% vert
- [x] Build webpack backend OK (`pnpm exec nest build --webpackPath ./webpack.swc.js` → compiled successfully)
- [x] Test manuel réel en navigateur (2026-06-29) : automation "Notification Slack - Nouveau Produit" créée pendant le test E2E Phase 6, ouverte dans l'UI Automations — déclencheur et étape Slack affichés et corrects (capture d'écran : « 1. Lorsqu'un en... Déclencheur » → « 2. Slack — Action »), confirme aussi le fix du Bug 2 ci-dessus

---

## Phase 2 — Agents : capacités étendues

**Pourquoi en second** : le backend (modèle Prisma `Agent`/`AgentTool`/`AgentTrigger`/`AgentMemory`/`AgentConnection`/`AgentMcpServer`) supporte déjà tout — gain élevé pour un risque backend faible. Dépend de Phase 1 uniquement pour le sous-cas « automatisation liée ».

**Dépendances** : Phase 1 complète si on veut activer « Automatisation liée » (étape 7 de ta spec) — sinon indépendant.

### Backend
- [x] Audit des capacités réelles avant d'écrire le schéma — **correction de la spec initiale** : `Agent` n'a pas de champs `mentions`/`directMessages`/`knowledge`/`webSearch`/`mcp`/`memory` (invention de la spec utilisateur, pas un concept Teable réel). Les vrais champs sont `planningEnabled`, `reflectionEnabled`, `maxReflections`, `maxIterations`, `isPublic`, `modelKey`, `knowledgeSources`, et l'activation d'outils nommés via `AgentTool` (liste fermée de 31 noms réels dans `AgentToolRegistryService.BUILT_IN_TOOLS`/`SCHEMA_TOOLS`/`WORKFLOW_TOOLS`, dont `web_search` qui est bien OFF par défaut)
- [x] Étendre le schéma Zod de `create_agent` ([unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts)) avec les champs réels ci-dessus + `tools: z.array(z.enum(AGENT_TOOL_NAMES))` (liste fermée, aucun nom inventable) + `scheduling: { cron }` optionnel
- [x] `CreateAgentDto` + `AgentService.create()` ([agent.service.ts](../apps/nestjs-backend/src/features/agent/agent.service.ts)) étendus pour accepter `planningEnabled`/`reflectionEnabled`/`maxReflections`/`maxIterations` (jusqu'ici fixés aux défauts Prisma, jamais exposés à l'appelant)
- [x] `action-proposal.service.ts` case `create_agent` : upsert `AgentTool` pour chaque outil demandé, `AgentTrigger` (type `cron`) si `scheduling.cron` fourni
- [x] **`mcpServerIds` abandonné** : `AgentMcpServer` n'est pas un pool partagé sélectionnable par ID — chaque ligne stocke une URL MCP arbitraire propre à l'agent (`{name, url, transport}`). L'IA ne peut pas inventer une URL MCP réelle, donc ce champ n'est pas exposé au tool-call ; même limite documentée que les connecteurs OAuth ci-dessous.
- [x] **`linkedAutomationId` abandonné** : aucun exécuteur ne lit une référence d'automation liée sur un agent — l'ajouter aurait été un champ qui ne fait rien (anti-pattern identifié dans l'audit Phase 1 : ne jamais promettre une action que le moteur n'exécute pas)
- [x] Décision tranchée : les **connecteurs tiers** (`AgentConnection`) nécessitent une autorisation OAuth interactive impossible via tool-call IA — documenté directement dans la description du tool `create_agent` ("you may only recommend the user connect one afterwards")

### Frontend
- [x] `ProposalCard.tsx` : preview des outils activés en badges + planification cron affichée, plus de blob JSON pour les agents

### Tests
- [x] Test : `create_agent` avec `tools` + `scheduling` → `AgentTool.upsert` appelé par outil, `AgentTrigger.create` appelé avec le cron
- [x] Test : ni `tools` ni `scheduling` → aucune ligne `AgentTool`/`AgentTrigger` créée (pas de mutation superflue)
- [x] Test : le schéma Zod du tool rejette un nom d'outil inventé et accepte un nom réel (`safeParse`)

### Vérification avant Phase 3
- [x] `tsc --noEmit` backend clean (mêmes 20 erreurs pré-existantes avant/après, confirmé via `git stash`)
- [x] `eslint` clean sur les fichiers touchés (erreurs restantes confirmées pré-existantes via `git stash`, dont le motif `agentId_toolName` déjà présent dans `agent.controller.ts:163`)
- [x] `vitest run` action-proposal (15 tests, +2) + unified-ai (21 tests, +1) → 100% vert
- [x] Build webpack backend OK
- [x] Test manuel réel en navigateur (2026-06-29) : agent "Gestionnaire de Stock" (créé pendant le test E2E Phase 6) ouvert dans l'Agent Builder — onglet Instructions affiche les instructions réelles générées, onglet Compétences affiche « 12 outils » activés et confirme que `web_search` (« Recherche sur le Web ») reste bien désactivé par défaut comme prévu (toggle off visible)

---

## Phase 3 — Tables : configuration de champs par type

**Pourquoi en troisième** : la plus grosse extension de schéma (10+ types de champs), bénéfice direct pour Interfaces et Données fictives en aval — doit être stable avant qu'elles en dépendent davantage.

**Dépendances** : aucune dépendance dure, mais Phase 4 (Données fictives + relations) et Phase 5 (Interfaces) consomment directement les types de validation ajoutés ici — les faire après.

### Backend
- [x] Audit des schémas Zod réels par type de champ ([packages/core field types](../packages/core/src/models/field)) — **correction de la spec initiale** : pas de types Teable réels nommés "email"/"téléphone international"/"URL"/"statut" (déjà noté dans le `ponytail` existant du code) ; les types réels avec options structurées sont `number` (formatting/defaultValue), `singleSelect`/`multipleSelect` (choices avec `id`/`color` **auto-assignés côté serveur si omis** — confirmé via `selectFieldChoiceRoSchema.partial({id,color})`), `link` (`foreignTableId`/`relationship`/`isOneWay`), `formula` (`expression` référençant des `{fldXXX}` — **différé**, voir ci-dessous)
- [x] Décision d'architecture tranchée : **option A retenue** (un seul `create_table` avec `fields[]` enrichi) — pas de `configure_field` séparé pour l'instant ; le risque "un appel raté = toute la table à refaire" est mitigé en aval (voir downgrade ci-dessous), pas en amont par du retry partiel multi-appels (aurait consommé le budget `stepCountIs(30)` sans bénéfice net pour les tables courantes)
- [x] Schéma Zod du tool `create_table` ([unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts)) étendu : `required`/`unique`/`defaultValue` sur tous les champs, `choices: string[]` pour select, `foreignTableName`/`relationship` pour `link`
- [x] `action-proposal.service.ts` case `create_table` : reconstruit les vraies options par type (`number.options.defaultValue`, `select.options.choices`, `link.options.foreignTableId` résolu via `tableMeta.findFirst` scoped à `baseId` — même pattern que `link_tables`) ; **downgrade silencieux et sûr** vers `singleLineText` si une table liée n'existe pas, plutôt qu'une erreur 500 — chaque champ est résolu indépendamment, un champ `link` invalide ne casse pas les autres champs de la même table
- [x] `formula`/`rollup`/`conditionalRollup` restent délibérément **hors scope** : l'expression doit référencer des `{fldXXX}` de champs sœurs créés dans le même appel, dont l'IA ne connaît pas encore l'ID au moment de la proposition — nécessiterait soit un post-traitement de résolution nom→ID après création, soit deux passes ; documenté comme dette explicite plutôt que construit de façon fragile
- [x] `buildPreview()` : transmet `required`/`choices`/`foreignTableName` au preview (plus juste nom+type)

### Frontend
- [x] `ProposalCard.tsx` : badge `*` pour requis, compteur d'options pour select, `→ NomTable` pour les relations

### Tests
- [x] Test : `number` avec `defaultValue`, `singleSelect` avec `choices`, champs `required`/`unique` → options réelles construites correctement
- [x] Test : champ `link` vers une table existante → `foreignTableId` résolu correctement
- [x] Test : champ `link` vers une table inexistante → downgrade silencieux vers `singleLineText`, pas de crash

### Vérification avant Phase 4
- [x] `tsc --noEmit` backend + frontend clean (erreurs pré-existantes confirmées via `git stash`)
- [x] `eslint` clean — un nouveau problème de complexité cognitive introduit par `buildField` a été détecté et corrigé immédiatement (extraction de `resolveLinkOptions`), conformément à la Règle 2
- [x] `vitest run` action-proposal (18 tests, +3) + unified-ai (21 tests) → 100% vert
- [x] Build webpack backend OK
- [x] Test manuel réel en navigateur (2026-06-29) : table "Produits" (créée pendant le test E2E Phase 6) ouverte en Grid View — champs `singleLineText` (SKU, avec icône de verrou confirmant `unique`), `longText` (Description), `singleSelect` (Catégorie) tous rendus correctement avec les bons widgets de saisie

---

## Phase 4 — Données fictives : gestion des relations

**Pourquoi en quatrième** : dépend des types de champs enrichis de Phase 3 (le générateur doit connaître `linkedTableId`/contraintes pour les respecter).

**Dépendances** : Phase 3 (types de champs, notamment `relation`).

### Backend
- [x] `resolveLinkFieldCandidates()` (nouvelle méthode privée, [unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts)) : détecte les champs de type `link` via une requête `prismaService.field.findMany` scoped à la table (le `WorkspaceSnapshot` n'expose que `{id, name, type}`, pas les options — confirmé pendant l'audit, pas de changement du snapshot nécessaire)
- [x] Pour chaque champ `link`, récupère jusqu'à 50 enregistrements de la table liée (`recordService.getRecords`) et contraint le schéma `generateObject` avec `z.enum(ids réels)` — le LLM ne peut physiquement pas inventer un ID, contrairement à une simple instruction en prompt
- [x] Table liée vide → `missingTableName` renvoyé par `resolveLinkFieldCandidates`, message explicite nommant la table, **génération entièrement annulée** (pas de génération partielle orpheline)
- [x] Relation `oneMany`/`manyMany` → schéma `z.array({id}).min(1)` ; `manyOne`/`oneOne` → schéma `{id}` simple (déduit de `options.relationship`)
- [x] Champ `unique` (Phase 3) : valeurs déjà présentes dans la table collectées avant génération ; toute ligne générée qui entre en collision est **silencieusement écartée de la proposition** (pas de proposition fausse plutôt qu'une tentative de dédoublonnage automatique fragile)

### Tests
- [x] Test : table avec champ `link` + table liée non vide → le schéma Zod n'autorise que l'ID réel existant (vérifié en interceptant l'appel à `generateObject`)
- [x] Test : table liée vide → message explicite nommant la table, aucune proposition, `generateObject` jamais appelé
- [x] Test : champ `unique` en collision avec une valeur existante → ligne écartée, aucune proposition

### Vérification avant Phase 5
- [x] `tsc --noEmit` clean
- [x] `eslint` clean (aucune nouvelle dette — vérifié explicitement, contrairement à Phase 3 où une violation avait été introduite puis corrigée)
- [x] `vitest run` unified-ai (24 tests, +3) + action-proposal (18) + workspace-state (6) → 100% vert
- [x] Build webpack backend OK
- [x] Test manuel réel en navigateur (2026-06-29, base `_Full App E2E Test`) : génération de données fictives sur "Mouvements de Stock" (3 lignes, via le bouton « Données fictives » + « Accepter tout ») — **un 4ème bug réel trouvé et corrigé** (voir ci-dessous). Le cas précis « lien vers une table existante non orpheline » reste non testé tel quel : aucune des 3 tables générées par la saga Phase 6 n'a de champ `link` réel (le blueprint a choisi des champs texte libres comme `Fournisseur principal`/`SKU Produit` plutôt que des relations — cohérent avec la décision déjà documentée en Phase 6.1 de différer les relations, mais ça veut dire que ce test précis nécessiterait une table dédiée avec un vrai champ `link` pour être couvert pleinement)

#### Bug réel trouvé et corrigé via ce test (4ème de la session, jamais détecté par les tests mockés)
- [x] **Bug 4 (Phase 4 + UI)** : `case 'update_record'` dans `action-proposal.service.ts` n'avait pas `typecast: true` (contrairement à `create_record` juste au-dessus) — toute valeur `singleSelect` générée par `generateMockDataForCurrentTable` qui n'existe pas déjà dans les choix du champ (cas courant : la table vient d'être créée, aucun choix n'existe encore) faisait échouer `updateRecord` avec une erreur de validation Zod/Teable (« X is not one of the choice names »), donc **aucun champ n'était réellement écrit**. Repéré uniquement parce que la grille restait visuellement vide après un « Accepter tout » qui affichait pourtant « Accepté » sur les 3 propositions — ce qui a révélé un **second bug distinct** : `handleAcceptAll` dans `UnifiedChatContainer.tsx` ne vérifiait jamais `res.ok` avant de lire le corps de la réponse, donc une erreur HTTP 500 renvoyée par `accept-proposal` était quand même interprétée comme un succès (`result?.status` n'étant jamais `'skipped'` sur un corps d'erreur). Le composant `ProposalCard.tsx` (acceptation individuelle) avait déjà ce garde-fou — seul le chemin « Accepter tout » en était dépourvu. Corrigé : `typecast: true` ajouté à `updateRecord` ; `if (!res.ok) throw new Error(...)` ajouté dans `handleAcceptAll`. **Reconfirmé en navigateur réel** : même prompt rejoué après correction + rebuild + redémarrage backend → 3 lignes réellement écrites en base, visibles dans la grille avec les nouvelles options de sélection auto-créées (« Entrée de stock », « Sortie de stock », « Correction d'inventaire »).

#### Bug 5 (Phase 4, lien réel cette fois) — trouvé en testant le cas précis laissé non couvert ci-dessus (2026-06-29)
- [x] Une fois deux tables réellement liées créées (« Clients » → « Commandes » via un champ `link`, voir la session de test UI manuelle du même jour), générer des données fictives sur **Clients** a eu un effet de bord correct mais inattendu : Teable peuple automatiquement le champ inverse symétrique (`Commandes` sur la fiche Client) quand on remplit le champ `link` d'un côté. Conséquence : les 3 lignes vides de la table **Commandes**, jusque-là réellement vides, se sont retrouvées avec leur champ `Client` rempli en retour — ce qui a fait échouer `isEmptyRecord()` dans `generateMockDataForCurrentTable()` ([unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts)) pour TOUTES les lignes (un seul champ link non vide suffisait à disqualifier toute la ligne), bloquant définitivement la génération de données fictives sur Commandes avec le message « contient déjà des données » alors que ses vrais champs de contenu (Numéro, Montant, Statut, Date) étaient toujours vides. Corrigé : `isEmptyRecord` ignore désormais les champs de type `link` dans son verdict (déplacement de la récupération de `fieldMetas` avant le test d'emptiness, pour disposer des types de champs au bon moment). **Reconfirmé en navigateur réel** : après correction + rebuild + redémarrage, la même demande sur Commandes a bien généré 3 propositions, acceptées avec succès, chacune correctement liée au vrai client correspondant (vérifié via l'API : Alice Martin/Thomas Dubois/Sarah Benali).
- [x] `tsc --noEmit` + `eslint` clean (mêmes erreurs pré-existantes confirmées via `git stash`) ; `vitest run unified-ai.service.spec.ts` → 24/24 verts ; build webpack OK, backend redémarré

---

## Phase 5 — Interfaces : modules CRUD réutilisables

**Pourquoi en cinquième** : la plus grosse rupture d'architecture (passage de génération de code libre à composition de blocs) — doit s'appuyer sur des tables aux types/contraintes fiables (Phase 3) pour générer des formulaires corrects.

**Dépendances** : Phase 3 (types de champs pour générer les bons composants de saisie par type).

### Décision préalable — TRANCHÉE avec l'utilisateur (2026-06-28)
- [x] **Option (B) retenue** : bibliothèque de composants déclarative plutôt que prompt enrichi sur la génération de code libre

### Backend
- [x] Schéma de configuration déclaratif défini : `modules: { type: 'data-table'|'form'|'detail-view', tableName, title?, fieldNames? }[]` sur le tool `create_app_interface` ([unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts))
- [x] `action-proposal.service.ts` case `create_app_interface` : si `modules` fourni, résout chaque `tableName` → `tableId` réel (même pattern que `link_tables`/Phase 3), persiste `app.content = { type: 'declarative', modules: [...] }` via `prismaService.app.upsert` — **`generate_app_code`/streaming de code libre entièrement court-circuité** dans ce cas
- [x] Back-compat : si `modules` est omis, le flux `shouldStream`/`generate_app_code` existant continue de fonctionner à l'identique (testé explicitement)
- [x] Décision de dépendance évitée : injecter `AppBuilderService` dans `ActionProposalService` aurait créé un cycle (`AppBuilderModule` importe déjà `AiModule`) — persistance faite directement via `prismaService.app`, même table, même forme de `content`, sans nouvelle dépendance de module

### Frontend
- [x] **Rendu du `content.type === 'declarative'`** ajouté dans [AppBuilderPage.tsx](../apps/nextjs-app/src/features/app/base-node/AppBuilderPage.tsx) : nouveau composant `DeclarativeAppView`, branché en early-return juste après le guard `isLoading`, n'a touché aucune ligne du pipeline de code-gen existant (sandbox iframe/Babel/chat panel intacts)
- [x] Approche retenue : pas de nouveau renderer React générique — chaque module `data-table`/`form`/`detail-view` embarque la vue native existante via iframe (`/base/:baseId/table/:tableId?embed=1`), même pattern que le helper `window.TeableView` déjà utilisé dans le code généré — réutilise 100% de l'UI Teable déjà testée
- [x] Simplification documentée (`ponytail`) : `form` et `detail-view` rendent pour l'instant la même grille que `data-table` (pas d'auto-provisioning de vue Form ni d'ouverture d'expand-record) — différencier réellement les trois est noté comme amélioration future, pas construit à l'aveugle

### Tests
- [x] Test : `modules` fourni → `app.content` déclaratif persisté avec le bon `tableId` résolu, pas de `shouldStream`
- [x] Test : `modules` omis → flux `shouldStream` existant inchangé (non-régression)

### Vérification avant Phase 6
- [x] `tsc --noEmit` backend + frontend clean
- [x] `eslint` clean sur les 3 fichiers touchés (mêmes catégories pré-existantes, aucune nouvelle dette)
- [x] `vitest run src/features/ai/` → 83 tests, 100% vert (6 fichiers)
- [x] Build webpack backend OK
- [x] Test manuel visuel **réalisé** (2026-06-29, après déblocage du conflit de port 3000) : interface "Gestion des Produits" créée/acceptée via `/chat`, page `/base/.../app/...` visitée en navigateur réel — rendu confirmé par capture d'écran (« Liste des Produits » + grille embarquée de la table réelle). Voir Bug 3 (Phase 6.3/6.4) pour le détail complet du bug `resourceId` vs `.id` trouvé et corrigé pendant ce même test.

---

## Phase 6 — Application complète : nouveau service orchestrateur

**Pourquoi en dernier** : dépend de toutes les phases précédentes (appelle Tables/Interfaces/Automatisations/Agents/Données fictives comme sous-générateurs) et représente le risque architectural le plus élevé identifié dans l'analyse (parallélisme simulé vs réel, coût, cohérence post-génération).

**Dépendances** : Phases 1 à 5 toutes vérifiées et stables en production.

### Décision préalable — TRANCHÉE avec l'utilisateur (2026-06-28)
- [x] **Service séparé retenu** : nouveau `AppBlueprintService` ([app-blueprint.service.ts](../apps/nestjs-backend/src/features/ai/app-blueprint.service.ts)), pas d'extension de `UnifiedAiService.chat()`. Nouvel endpoint `POST /api/spaces/:spaceId/ai/full-app` ([unified-ai.controller.ts](../apps/nestjs-backend/src/features/ai/unified-ai.controller.ts)), SSE indépendant du `/chat` existant, son propre type d'événement `FullAppEvent` (`phase`/`proposal`/`error`/`done`) — le `UnifiedAiService` n'a pas été touché par cette phase.
- [x] Modèle de parallélisme réel (Phase 6.2) : tranché et implémenté — `Promise.allSettled` (voir section Phase 6.2 ci-dessous), case stale depuis la rédaction initiale de cette section

### Backend — Phase 6.1 (séquentiel, bloquant) — FAIT
- [x] Analyse globale : `generateObject` produit `{appName, description, domain, businessProcesses, targetUsers, dataNeeds, automationNeeds, aiNeeds}`
- [x] Blueprint métier : second `generateObject` produit `{entities: {name, fields[]}[]}` — **`relations[]` et `functionalSchema` volontairement omis de ce schéma** (voir note ci-dessous)
- [x] Génération des tables : un `actionProposalService.createProposal('create_table', ...)` par entité, réutilisant exactement le schéma de champs de Phase 3 (mêmes 9 types, `required`/`unique`/`choices`) — pas un schéma parallèle qui pourrait diverger
- [x] **Relations explicitement différées** : un champ `link` référence une table par son nom, résolue en ID réel seulement à l'acceptation de la proposition (`action-proposal.service.ts`). Si l'utilisateur accepte les propositions de tables dans le désordre, une relation pointant vers une table pas encore créée échouerait silencieusement (downgrade `singleLineText`, comportement Phase 3). Générer les relations dans ce bootstrap aurait donc pu produire des tables avec des liens fantômes selon l'ordre d'acceptation côté utilisateur — risque documenté plutôt que masqué, reporté à Phase 6.2+
- [x] `baseId` est **requis** en entrée (pas de création automatique de base) — simplification délibérée, évite la complexité de désambiguïsation multi-bases dans ce bootstrap

### Tests Phase 6.1
- [x] Test : analyse → blueprint → une proposition `create_table` par entité, dans l'ordre, schéma d'événements complet (`phase`×N puis `proposal`×N puis `phase`+`done`)
- [x] Test : aucun modèle IA configuré → erreur levée avant toute proposition créée

### Vérification avant Phase 6.2
- [x] `tsc --noEmit` clean
- [x] `eslint` clean (interfaces `FullAppEvent`/`FullAppContext` suivent le même style déjà présent sur `UnifiedChatEvent`/`UnifiedChatContext`, pas une nouvelle incohérence)
- [x] `vitest run src/features/ai/` → 85 tests, 100% vert (7 fichiers, +2 nouveaux)
- [x] Build webpack backend OK, backend redémarré avec le nouveau build
- [x] Test manuel réalisé via le test E2E complet de la saga (voir « Vérification finale » plus bas) — `full-app` appelé avec un prompt réel, 3 propositions de table générées dans l'ordre attendu

---

### Backend — Phase 6.2 (parallèle) — FAIT (2/3 générateurs)
- [x] Lancé en `Promise.allSettled` (pas `Promise.all` — un échec ne doit pas annuler les autres) : générateur d'interfaces (Phase 5) + générateur d'automatisations (Phase 1), chacun reçoit le blueprint complet
- [x] Gestion d'échec partiel : chaque générateur indépendamment `try/catch`-é via `allSettled` ; échec → événement `error` avec `generator: 'interface'|'automation'`, les autres continuent, le flux global se termine toujours par `done`
- [x] **Générateur de données fictives (Phase 4) volontairement exclu de cette phase** — `generateMockDataForCurrentTable` opère sur de VRAIS enregistrements d'une table déjà créée ; à ce stade les tables du blueprint ne sont que des propositions en attente d'acceptation utilisateur, aucun enregistrement n'existe encore. Le brancher correctement nécessite d'attendre l'acceptation des tables d'abord — c'est une orchestration différente, pas un troisième appel `Promise.allSettled` ici. Reste à faire dans une itération ultérieure (après qu'un mécanisme de suivi d'acceptation existe).
- [x] **Générateur d'automatisations utilise le fallback texte libre (Phase 1), pas le schéma structuré trigger/steps** — un step structuré a besoin d'un `tableId` réel dans sa config (`WorkflowStepSchema`), qui n'existe pas encore pour des tables encore en attente de proposition. Promettre une automatisation structurée ici aurait figé un `tableId` qui ne se résoudrait peut-être jamais.
- [x] Générateur d'interfaces réutilise le schéma déclaratif `modules` de Phase 5 (résolution `tableName` → `tableId` différée à l'acceptation, donc sûr même si les tables n'existent pas encore)

### Tests Phase 6.2
- [x] Test : succès complet → 2 propositions de table puis 1 proposition d'interface puis 1 proposition d'automatisation, dans cet ordre exact
- [x] Test : le générateur d'interfaces échoue → un événement `error` avec `generator: 'interface'`, le générateur d'automatisations aboutit malgré tout, le flux se termine par `done` (pas d'exception non gérée)

### Vérification avant Phase 6.3
- [x] `tsc --noEmit` clean
- [x] `eslint` clean (mêmes catégories pré-existantes)
- [x] `vitest run src/features/ai/` → 92 tests, 100% vert
- [x] Build webpack backend OK, backend redémarré
- [x] Test manuel réalisé via le même test E2E complet — interface ET automatisation bien proposées en plus des tables (voir « Vérification finale »)

---

## Architecture Phase 6.3/6.4 — TRANCHÉE avec l'utilisateur (2026-06-28) : saga multi-appels (Option A)

**Le problème identifié avant de coder** : chaque proposition (table/interface/automation/agent) suit le pattern human-gated existant (D-02/D-03) — elle est créée par `actionProposalService.createProposal()` puis n'est exécutée que plus tard, via un appel HTTP **séparé** (`accept-proposal`), déclenché quand l'utilisateur clique « Accepter ». Le flux SSE qui a proposé une table se termine (`done`, `res.end()`) bien avant que l'utilisateur ait accepté quoi que ce soit — c'est fire-and-forget par construction. Or Phase 6.3 (agents) doit démarrer « uniquement après confirmation que tables/interfaces/automatisations sont posées », et Phase 6.4 doit produire un rapport sur l'état final réel. Un générateur unique qui boucle sur tout (6.1→6.4) n'a aucun moyen d'observer une acceptation qui arrive après qu'il a déjà rendu la main — et le faire attendre indéfiniment sur une connexion HTTP n'est pas viable (timeouts navigateur/proxy), tout comme auto-accepter à sa place casserait la garantie human-gated appliquée partout ailleurs dans le code.

**Décision** : `full-app` devient une **saga résumable, multi-appels** plutôt qu'un seul flux continu :
- [x] **État de run persisté** sans migration de schéma — réutilise le stockage flexible déjà utilisé par les propositions : une `WorkspaceConversationMessage(type: 'full_app_run')` dont `metadata` porte `{ stage, baseId, prompt, modelKey, blueprint, tableProposalIds, interfaceProposalId?, automationProposalId?, agentProposalIds? }`. Une ligne par conversation (`conversationId` = id du run), retrouvée/mise à jour via `findFirst`+`update`/`create` (pas d'upsert : aucune contrainte unique composite n'existe sur `(conversationId, type)`, donc deux requêtes plutôt qu'une — accepté comme compromis simple plutôt que d'ajouter une migration juste pour ça).
- [x] **Gating par acceptation réelle** : `areAllAccepted(proposalIds)` relit les `WorkspaceConversationMessage` par `proposalId` et vérifie `metadata.accepted === true` sur chacune — conservateur par construction (un ID introuvable ou non accepté bloque tout).
- [x] `generateFullApp()` (Phase 6.1, endpoint existant) s'arrête désormais après les propositions de table : persiste l'état (`stage: 'tables'`), émet un nouvel événement `awaiting_acceptance` avec `stage`, puis `done`.
- [x] Nouvel endpoint `POST /api/spaces/:spaceId/ai/full-app/:conversationId/continue` ([unified-ai.controller.ts](../apps/nestjs-backend/src/features/ai/unified-ai.controller.ts)) → `AppBlueprintService.continueFullApp()` : charge l'état, vérifie le gating de l'étape courante, avance d'**une seule étape**, persiste, et se termine par un nouveau `awaiting_acceptance` (ou par le rapport final). Appeler cet endpoint après chaque étape acceptée fait progresser la saga ; l'appeler trop tôt renvoie une erreur explicite nommant l'étape encore en attente, sans planter.

### Backend — Phase 6.3 (séquentiel) — FAIT
- [x] Générateur d'agents (réutilise le schéma réel `create_agent` de Phase 2 — `tools` restreint au même enum `AGENT_TOOL_NAMES`, exporté depuis `unified-ai.service.ts` plutôt que dupliqué) — démarre uniquement quand `continueFullApp` constate que l'étape `'subgenerators'` (interface + automation) est intégralement acceptée ; dépendance vérifiée par du code (`areAllAccepted`), pas seulement documentée

### Backend — Phase 6.4 (validation + livraison) — FAIT, scope réduit (documenté)
- [x] Rapport de livraison structuré : `{ tablesCreated, interfaceCreated, automationCreated, agentsCreated }`, construit à partir de l'état du run déjà connu
- [x] **Pas d'appel `generateObject` de « relecture globale »/détection de doublons** — cela nécessiterait de re-requêter les vraies ressources créées en base (la run state ne contient que des IDs de proposition, pas l'état final des ressources), ce qui est un appel supplémentaire honnête à faire mais pas nécessaire pour qu'une saga correcte existe. Documenté comme amélioration future plutôt que construit pour cocher la case.
- [x] Le rapport ne se déclenche que si la Phase 6.3 (agent) est elle-même acceptée — la « vérification permissions/dépendances » de la spec initiale est satisfaite par construction : `continueFullApp` ne peut physiquement pas atteindre l'étape rapport sans que `areAllAccepted` ait validé chaque étape précédente

### Frontend — FAIT (2026-06-28, comble la dette ci-dessus)
- [x] Nouveau store `useFullAppGenerationStore` ([useFullAppGenerationStore.ts](../apps/nextjs-app/src/features/app/stores/useFullAppGenerationStore.ts)) : pilote les deux endpoints (`startGeneration`/`continueGeneration`), parse le même framing SSE (`data: ` + JSON) que le lecteur existant de `UnifiedChatContainer.tsx`, suit `stage`/`pendingProposalIds`/`report`/`error`
- [x] Nouveau panneau `FullAppPanel.tsx` ([FullAppPanel.tsx](../apps/nextjs-app/src/components/AgentChat/FullAppPanel.tsx)) : prompt initial → file d'étapes (`StageProgress`) → **réutilise `ProposalCard.tsx` tel quel** pour chaque proposition (aucun nouveau composant de proposition créé) → bouton « Continuer » désactivé jusqu'à ce que `pendingProposalIds` soit intégralement `accepted` dans `useUnifiedChatStore` (même store que `ProposalCard` utilise pour persister l'acceptation — partagé via `spaceId`/`baseId`, pas dupliqué) → rapport final → bouton de réinitialisation
- [x] `TaskProgressPanel.tsx` **délibérément pas réutilisé** : il est conçu pour des events `progress`/`think` au sein d'un seul tool-call, pas pour une saga à 4 étapes gated par acceptation humaine — un composant `StageProgress` dédié (20 lignes) a été préféré à forcer un composant existant dans une forme qu'il n'a pas
- [x] Bouton bascule (icône baguette magique) ajouté dans l'en-tête de `ChatPanel.tsx`, additif et isolé : bascule un état local `fullAppMode` qui substitue `FullAppPanel` à `UnifiedChatContainer` sans toucher une seule ligne de la logique interne de `UnifiedChatContainer.tsx` (composant volumineux et délicat, intentionnellement non modifié)
- [x] Le bouton « Application complète » historique (`create_app_interface` + `generate_app_code`) **reste inchangé** — le nouveau flux est accessible via un point d'entrée séparé plutôt que de remplacer un chemin existant à moitié

### Tests
- [x] Test par étape (génération initiale + chaque branche de `continueFullApp`) indépendamment mockée — 9 tests dans `app-blueprint.service.spec.ts`
- [x] Test d'échec partiel en Phase 6.2 conservé et toujours vert après le passage en saga
- [x] Test : étape non encore acceptée → erreur explicite nommant l'étape, aucun appel `generateObject`, aucune mutation
- [x] Test : run introuvable / déjà au stage `'done'` → erreur propre, pas de crash
- [x] `tsc --noEmit` + `eslint` clean sur les 4 fichiers frontend touchés (0 nouvelle dette — un problème de complexité cognitive et un de littéral dupliqué introduits par moi-même ont été détectés et corrigés immédiatement, conformément à la Règle 2)
- [x] Compilation confirmée en direct sur le serveur de développement (logs `✓ Compiled`, aucune erreur)
- [x] **Test de bout en bout réel exécuté (2026-06-28)** — la confirmation par clic navigateur restait bloquée (Claude-in-Chrome déconnecté toute la session), donc vérification faite par appels HTTP réels directs contre le serveur de dev déjà en cours d'exécution, authentifié comme l'utilisateur e2e seedé (`pnpm pre-test-e2e`), sans aucun mock : base de test créée (`bseNzUqRym7TeOWgMpt` / « _Full App E2E Test », espace `spcTestSpaceId`), saga complète exécutée avec un vrai modèle Gemini déjà configuré dans cette instance — **3 tables réelles, 1 interface déclarative réelle, 1 automatisation réelle, 1 agent réel créés en base**, rapport final correct (`{tablesCreated:3, interfaceCreated:true, automationCreated:true, agentsCreated:1}`)

#### Trois bugs réels trouvés et corrigés grâce à ce test (jamais détectés par les tests mockés)
- [x] **Bug 1 (Phase 3)** : `field.service.ts` rejette **sans condition** tout `notNull` à la création d'un champ (« does not support field validation when creating a new field ») — l'absence de mécanisme de backfill rend `required → notNull` invalide pour TOUS les types de champs, pas seulement certains. Corrigé : `required` reste accepté dans le schéma de l'outil mais n'est plus jamais traduit en `notNull` à la création (no-op documenté, pas un échec — `action-proposal.service.ts`). Test mocké mis à jour pour refléter ce comportement réel.
- [x] **Bug 2 (Phase 1)** : `case 'create_automation'` appelait `workflowService.updateWorkflow(baseId, workflowNodeVo.id, ...)` — mais `updateWorkflow` attend le vrai id de la ligne `Workflow` (`resourceId`), pas l'id du `BaseNode` wrapper. Conséquence : la configuration (trigger/steps) n'était **jamais réellement persistée**, silencieusement avalée par le `catch` du fallback texte libre (« Record to update not found »), et ce **dans les deux branches** (structurée ET texte libre) — un bug qui existait déjà dans le code pré-session et que j'avais reproduit sans le savoir en réutilisant le même pattern lors du refactor Phase 1. Corrigé : les deux appels utilisent maintenant `workflowNodeVo.resourceId`. **Reconfirmé après correction** : nouvelle automatisation structurée créée et acceptée via `/chat`, configuration `trigger`/`steps` vérifiée présente dans la colonne `workflow.config` en base — succès, plus de `status: 'partial'`.
- [x] **Bug 3 (Phase 5)** — correction d'une conclusion antérieure erronée de ce même document : la case ci-dessus disait à tort « Vérifié, pas un bug » sur le doublon de lignes `app_builder` (une à l'id du `BaseNode`, une à son `resourceId`). Cette conclusion a été écrite avant tout clic réel en navigateur et s'est avérée fausse : un clic réel sur l'app générée par la saga affichait « Aucune app générée ». Root cause confirmée via `grep` sur `BaseNodeTree.tsx` (`const { resourceType, resourceId } = node;`) — le sidebar/router de toute l'application navigue **toujours** les Apps via `resourceId`, jamais via `.id`. Le code déclaratif de Phase 5 écrivait `app.upsert({ where: { id: dashboardNodeVo.id } })`, donc dans la ligne orpheline jamais lue par aucune page réelle. Corrigé : `prismaService.app.upsert()` clé maintenant sur `dashboardNodeVo.resourceId`. Test mocké mis à jour (`action-proposal.service.spec.ts`, describe `create_app_interface (Phase 5 — declarative modules)`). **Reconfirmé visuellement en navigateur réel** (preview live, après correction du conflit de port 3000) : nouvelle interface créée/acceptée via `/chat`, contenu vérifié en base (`psql`) à la bonne ligne `app_builder`, puis page `/base/.../app/...` visitée et capture d'écran confirmant le rendu correct (« Liste des Produits » + grille embarquée de la table réelle). Le flux séparé `generate_app_code`/`shouldStream` (non touché, hors scope) garde la même incohérence latente — noté, pas corrigé, car plus risqué à toucher et auto-cohérent dans son propre flux de redirection immédiate.
- [x] Suite de tests + `tsc` + `eslint` + build re-vérifiés après les trois corrections (92 tests, 100% vert), backend redémarré avec le build corrigé

#### Bugs 6 et 7 — trouvés en rejouant la saga complète **via l'UI réelle** dans deux nouvelles bases (2026-06-29, suite à la demande explicite de tester « Application complète » en conditions réelles, panneau « Générer une application complète » → bouton baguette dans l'en-tête du chat)
- [x] **Bug 6 (Phase 1, fallback texte libre de `generateWorkflowFromPrompt`)** : repéré en inspectant le workflow généré pendant la 2ème saga (application « gestion de candidatures ») — `trigger.config` était **vide** (`{}`) pour un trigger `record_created`, et le step `create_record` référençait `tableId:"tblHistoriqueEmails"`, un **nom de table inventé**, pas un vrai id Teable (les vrais ids ressemblent à `tbl6VMNdQKX6Bk4nh95`). Root cause double : (1) le `SYSTEM_PROMPT` de `workflow-ai.service.ts` affirmait à tort que `record_created`/`record_updated`/`record_deleted` n'ont besoin d'aucune config — alors que `workflow-trigger.listener.ts`'s `dispatchTrigger` ne filtre par table que **si un `tableId` est présent** dans la config (`if (targetTable && targetTable !== tableId) continue`) ; un trigger sans `tableId` se déclenche donc pour **toute création d'enregistrement dans n'importe quelle table de la base**, jamais juste celle voulue. (2) `generateWorkflowFromPrompt` ne recevait **jamais la liste des vraies tables** de la base — le LLM n'avait donc aucun moyen de savoir quels ids existent réellement, et inventait un nom plausible à la place. Corrigé : le system prompt précise maintenant explicitement que ces 3 triggers doivent toujours porter un `tableId` réel ; `generateWorkflowFromPrompt` injecte la vraie liste `{nom, id}` des tables de la base dans le prompt (nouvelle dépendance `PrismaService`, module global donc aucun changement de wiring nécessaire). **Reconfirmé en navigateur réel** : même scénario rejoué après correction + rebuild + redémarrage — `trigger.config.tableId` et le `tableId` du step `create_record` pointent tous deux vers les vrais ids des tables Candidatures/Logs Emails.
- [x] **Bug 7 (UI, découvert en observant le symptôme du Bug 6)** : pendant le test, le premier appel à `generateWorkflowFromPrompt` a pris ~47s (`generateObject` a échoué puis fallback sur `generateText`), dépassant le timeout du proxy de dev — la carte de proposition a affiché « Échec — réessayer ? » alors que l'opération avait en fait réussi en arrière-plan. Cliquer « Réessayer » a déclenché un second appel `accept-proposal` qui a reçu un `409 Conflict` (`ConflictException: Proposal already accepted` — le garde-fou d'idempotence a fonctionné comme prévu), mais `ProposalCard.tsx`/`UnifiedChatContainer.tsx` ne distinguaient pas un 409 d'une vraie erreur : la carte restait bloquée sur « Échec » indéfiniment, sans aucun moyen pour l'utilisateur de voir que c'était en fait déjà réussi. Corrigé dans les deux fichiers : un statut `409` est maintenant traité comme un succès déjà acquis (`setProposalStatus(..., 'accepted')`), pas une erreur. Extraction de `acceptSingleProposal()` dans `UnifiedChatContainer.tsx` pour garder la complexité cognitive de `handleAcceptAll` sous le seuil après l'ajout de cette branche (conformément à la Règle 2 — aucune nouvelle dette lint).
- [x] **Limite UI notée à l'époque, depuis corrigée** : recharger la page en plein milieu d'une saga réinitialisait complètement le panneau `FullAppPanel`. Voir la section « Recommandations post-test implémentées » ci-dessous (Recommandation 2) pour le correctif.
- [x] `tsc --noEmit` + `eslint` clean sur les 3 fichiers touchés (`workflow-ai.service.ts`, `ProposalCard.tsx`, `UnifiedChatContainer.tsx`) — mêmes catégories pré-existantes confirmées via `git stash`, aucune nouvelle dette après correction de la complexité cognitive
- [x] **Reconfirmé en navigateur réel, deux fois** : saga complète rejouée dans deux nouvelles bases (`bsevlcw81rZ3fmfGC1E` « Gestion des Événements et Inscriptions » avant le fix du Bug 6, puis `bseMDzhX3tVHcGYYuvM` « Système de Recrutement et Gestion des Candidatures » après) — tables, interface déclarative, automatisation et agent tous créés et acceptés via les vrais boutons de l'UI (pas curl), rendu visuel de l'interface confirmé par capture d'écran dans le premier run

### Vérification finale
- [x] `tsc --noEmit` clean
- [x] `eslint` clean (un nouveau problème de duplication de littéraux SSE entre `chat`/`full-app`/`continue` détecté et corrigé immédiatement — extraction de `setSseHeaders()`, conformément à la Règle 2)
- [x] `vitest run src/features/ai/` → 92 tests, 100% vert
- [x] Build webpack backend OK, backend redémarré avec le nouveau build
- [x] Test manuel de bout en bout via les deux endpoints, en HTTP réel (curl, authentifié comme l'utilisateur e2e) — voir ci-dessus, trois bugs réels trouvés et corrigés (dont un via clic réel en navigateur live, après correction du conflit de port 3000)
- [ ] Mesure du temps total et du coût en tokens réel — non chronométré précisément cette fois (focus mis sur la correction fonctionnelle), à refaire si la performance/coût devient une question concrète

### Recommandations post-test implémentées (2026-06-29)

Après le passage à 7 bugs trouvés/corrigés, quatre recommandations concrètes ont été formulées puis implémentées et vérifiées en navigateur réel :

1. [x] **Timeout borné sur `generateWorkflowFromPrompt`** ([workflow-ai.service.ts](../apps/nestjs-backend/src/features/workflow/workflow-ai.service.ts)) — chaque tentative (`generateObject` puis le fallback `generateText`) est désormais bornée à 15s via `AbortController` (même pattern que le step `http_request` du moteur de workflow), au lieu de laisser un appel lent (47s observé en réel) dépasser silencieusement le timeout du proxy de dev et faire croire à un échec côté UI.
2. [x] **Persistance de la saga côté client** ([useFullAppGenerationStore.ts](../apps/nextjs-app/src/features/app/stores/useFullAppGenerationStore.ts), [FullAppPanel.tsx](../apps/nextjs-app/src/components/AgentChat/FullAppPanel.tsx)) — l'état du run (`conversationId`, stage, events, propositions en attente, rapport) est sauvegardé dans `localStorage` (clé scopée par `baseId`) à chaque pause naturelle (fin de stream), et restauré au montage du panneau via une nouvelle action `restore(baseId)`. **Reconfirmé en navigateur réel** : saga démarrée, propositions de tables affichées, page rechargée, panneau rouvert → état identique restauré, saga menée à terme avec succès jusqu'au rapport final.
3. [x] **Scénario à dépendances plus profondes testé** — la saga « bibliothèque » a généré une automatisation référençant intelligemment une table déjà existante d'une saga précédente dans la même base (`Logs Emails`) plutôt que la table nouvellement créée — confirmé comme une résolution correcte, pas une hallucination (les deux ids existaient réellement), validant la robustesse du fix du Bug 6 même avec plusieurs sagas cohabitant dans une même base.
4. [x] **Nouvelle étape optionnelle « Données fictives » en fin de saga** ([app-blueprint.service.ts](../apps/nestjs-backend/src/features/ai/app-blueprint.service.ts)) — après l'étape Agent, une nouvelle étape `mock_data` parcourt chaque table réelle créée par le run, et pour celles encore vides, propose jusqu'à 3 lignes de données fictives réalistes par table (un appel `generateObject` par table, tolérant aux échecs individuels). Simplification délibérée et documentée : pas de résolution des champs `link` à ce stade (le flux `/chat` existant reste disponible pour ça) — c'est un complément, pas un remplacement. Si aucune table n'a de ligne vide, l'étape est sautée automatiquement (pas de blocage sur zéro proposition à accepter). Rapport final étendu avec `mockRecordsFilled`. **Reconfirmé en navigateur réel + API** : saga « recettes de cuisine » menée jusqu'au rapport `{tablesCreated:5, interfaceCreated:true, automationCreated:true, agentsCreated:1, mockRecordsFilled:15}` (3 lignes × 5 tables), contenu réaliste vérifié visuellement dans la grille (recettes réelles avec instructions).
5. [x] **Garde anti-double-appel ajoutée à `continueGeneration`** — repérée en testant la recommandation 4 : un clic automatisé trop rapproché a déclenché deux appels `/continue` concurrents pour la même conversation, l'un recevant un 500 (race interne) ; le bouton réel se désactive déjà via `disabled={isStreaming}`, donc ce n'est pas un scénario utilisateur réel, mais une garde `if (isStreaming) return;` a été ajoutée par défense en profondeur, cohérente avec le garde déjà présent sur `handleAcceptAll`.
- [x] `tsc --noEmit` + `eslint` clean sur les 6 fichiers touchés (mêmes catégories pré-existantes confirmées, aucune nouvelle dette)
- [x] `vitest run src/features/ai/ src/features/workflow/` → 94 tests, 100% vert (2 nouveaux tests pour le stage `mock_data`)
- [x] Build webpack backend OK, backend redémarré avec le nouveau build

---

## Phase 7 — Transverse (à distribuer dans les phases ci-dessus, pas un bloc séparé)

- [x] Connecteurs tiers (`AgentConnection`) : tranché pendant Phase 2 — l'IA *recommande* uniquement (texte dans la description du tool), aucune UI de connexion auto-déclenchée pour l'instant (pourrait être une amélioration UX future, hors scope actuel)
- [x] Doc API Teable (`v2-openapi.controller.ts`) — **audité, prémisse invalide** (même schéma de correction que Phase 2/3 : une fonctionnalité imaginée dans la spec initiale qui ne correspond à aucun concept Teable réel) : `v2-openapi.controller.ts` sert un document OpenAPI **généré dynamiquement** (`generateV2OpenApiDocument`) qui expose **uniformément** toutes les tables/champs de toutes les bases via le contrat v2 — il n'existe aucun flag « ce champ est exposé publiquement, celui-là non » à vérifier. Une table/un champ renommé ou supprimé apparaît simplement différemment dans le document généré au prochain appel ; il n'y a pas d'« intégration tierce » à prévenir au sens où l'item l'imaginait (le contrat v2 n'a pas de notion de clé d'API par champ figée à un nom). Rien à construire.
- [x] MCP : **devenu sans objet** — Phase 2 a confirmé que `AgentMcpServer` est une URL arbitraire par agent, pas un pool partagé sélectionnable ; il n'y a rien à exposer dans `WorkspaceSnapshot`

---

## Suivi global

| Phase | Statut | Bloquée par |
|---|---|---|
| 0 — Acquis | ✅ Fait | — |
| 1 — Automatisations | ✅ Code fait, vérifié en navigateur réel | — |
| 2 — Agents | ✅ Code fait, vérifié en navigateur réel | — |
| 3 — Tables | ✅ Code fait (formule différée, dette documentée), vérifié en navigateur réel | — |
| 4 — Données fictives (relations) | ✅ Code fait, vérifié en navigateur réel avec un vrai champ `link` peuplé des deux côtés (2 bugs trouvés/corrigés — voir Bug 4 et Bug 5) | — |
| 5 — Interfaces (modules) | ✅ Backend + frontend faits, confirmation visuelle réalisée | — |
| 6 — Application complète | ✅ Backend + frontend faits, saga rejouée via l'UI réelle dans 3 nouvelles bases + étape optionnelle « Données fictives » ajoutée (7 bugs trouvés/corrigés, 5 recommandations post-test implémentées et vérifiées) | — |
| 7 — Transverse | ✅ Fait (connecteurs + MCP réglés, doc API auditée — prémisse invalide) | — |
