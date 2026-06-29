# L'IA dans Teable — fonctionnement

> Documentation du système d'IA côté backend (`apps/nestjs-backend/src/features/ai`) et de son intégration frontend (`apps/nextjs-app`). Dernière mise à jour : 2026-06-28 (audit de stabilité).
>
> Pour l'évolution vers une génération avancée (Tables/Interfaces/Automatisations/Agents/Application complète/Données fictives), voir [AI-GENERATION-ROADMAP.md](./AI-GENERATION-ROADMAP.md) — plan en phases avec dépendances et critères de stabilité.

## Vue d'ensemble

Teable embarque **deux sous-systèmes d'IA distincts** :

| Sous-système | Service | Rôle |
|---|---|---|
| **Chat agentique** | `UnifiedAiService` | Assistant conversationnel qui crée/modifie tables, champs, vues, enregistrements, automatisations, agents, apps — via des **outils** et un **cycle de proposition gaté par l'humain**. |
| **Helpers IA ponctuels** | `AiService` | Fonctions one-shot, sans conversation : génération de config de vue, de schéma de table, de workflow, régénération de cellule, analyse d'import, génération de code d'app. Appelées par des endpoints/UI dédiés. |

Le tout repose sur le **Vercel AI SDK** (`generateText` / `streamText`, `tool()`, `stepCountIs`). Les modèles et providers LLM sont **configurés par base**.

---

## 1. Le chat agentique (`UnifiedAiService`)

Fichiers clés :
- [unified-ai.controller.ts](../apps/nestjs-backend/src/features/ai/unified-ai.controller.ts) — endpoints HTTP/SSE
- [unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts) — orchestration, outils, streaming
- [action-proposal.service.ts](../apps/nestjs-backend/src/features/ai/action-proposal.service.ts) — propositions + exécution
- [workspace-state.service.ts](../apps/nestjs-backend/src/features/ai/workspace-state.service.ts) — snapshot de l'espace

### Endpoints

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/spaces/:spaceId/ai/chat` | Conversation (réponse **SSE**, `text/event-stream`) |
| `POST` | `/api/spaces/:spaceId/ai/accept-proposal` | Exécute une proposition acceptée (JSON) |
| `GET` | `/api/spaces/:spaceId/ai/conversations` | Liste des conversations |
| `GET` | `/api/spaces/:spaceId/ai/conversations/:conversationId` | Détail d'une conversation |

### Flux d'un message

```
Frontend (ChatPanel)
   │  POST /ai/chat   (Server-Sent Events)
   ▼
UnifiedAiController.chat()
   └─► UnifiedAiService.chat(ctx)            [AsyncGenerator<UnifiedChatEvent>]
        └─► try { yield* chatInner(ctx, state) } catch → yield {type:'error'} + message sauvegardé
              1. charge/crée la conversation (Prisma)            — state.conversationId mémorisé ici
              2. WorkspaceStateService.getSnapshot(spaceId)
                    → bases ▸ tables ▸ fields (IDs), intégrations, agentTriggers
              3. buildSystemPrompt(ctx, snapshot)                 — system prompt, tronqué à 12000 char
              4. resolveModelInstance(ctx, snapshot)               — throw si pas de base/modèle (capturé par chat())
              5. branche mock_data ? generateMockDataForCurrentTable(...) : suite normale
              6. generateText({ model, tools, stopWhen: stepCountIs(30) })
              7. itère result.steps → yield d'événements SSE
              8. runAutoProposalHeuristics(ctx, result, conversationId) — mock records/interface/link_tables auto
```

`chat()` est un **wrapper try/catch** autour de `chatInner()` : toute exception non gérée (Prisma, provider LLM, `RecordService`…) devient un événement `error` propre + un message assistant sauvegardé, plutôt que de remonter brute jusqu'au contrôleur. `resolveModelInstance` et les heuristiques post-traitement sont des méthodes privées dédiées — extraites de l'ancien monolithe `chat()` (complexité cognitive 61 → 26 sur `chatInner`) pour limiter le risque de régression silencieuse à chaque évolution.

### Le snapshot = contexte de l'IA

À **chaque** message, `WorkspaceStateService.getSnapshot()` fournit l'état complet de l'espace (toutes les bases/tables/champs **avec leurs IDs**, intégrations, déclencheurs d'agents). C'est ainsi que l'IA connaît `tableId`/`baseId` sans les demander à l'utilisateur. La requête est une seule requête Prisma imbriquée (anti-N+1).

### `activeBaseId` gagne toujours

Pour toute opération d'écriture, la base actuellement ouverte par l'utilisateur (`ctx.activeBaseId`) **écrase** le choix du modèle. Cela évite que l'IA écrive dans la mauvaise base. Voir `buildWriteTool` dans [unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts).

### Boucle d'outils

`generateText` est appelé avec `stopWhen: stepCountIs(30)` : le modèle peut enchaîner jusqu'à 30 étapes d'appels d'outils dans un seul tour (ex. `create_table` → `create_table` → `link_tables`).

### Cible explicite (`targetType`) — la bulle de chat unifiée

Le panneau de chat (`UnifiedChatContainer.tsx`) n'a plus d'onglets « Demander » / « Agents » disjoints : **une seule interface**, avec sous le champ de saisie des boutons de cible explicite qui précisent l'intention avant même que le modèle ne lise le texte libre :

| Bouton | `targetType` envoyé | Outils autorisés |
|---|---|---|
| Table | `table` | `create_table`, `create_field`, `create_view`, `link_tables`, `create_record` |
| Interface | `interface` | `create_app_interface` |
| Automation | `automation` | `create_automation` |
| Agent | `agent` | `create_agent` |
| Application complète | `app` | `create_app_interface`, `generate_app_code` |
| Données fictives | `mock_data` | *(aucun — branche dédiée, voir ci-dessous)* |
| *(aucun bouton sélectionné)* | `undefined` | tous les write tools — comportement historique, le modèle déduit l'intention du texte |

Le mapping est défini par `TARGET_TYPE_TOOLS` dans [unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts). Quand `ctx.targetType` est défini :

1. **Filtrage à l'enregistrement** : seuls les outils listés pour cette cible sont passés au modèle (`tools = {...readTools, ...allowedWriteTools}`) — le modèle ne *peut pas* appeler un outil hors cible, il n'existe pas dans son schéma.
2. **Defense-in-depth** : chaque `buildWriteTool` revérifie `TARGET_TYPE_TOOLS[ctx.targetType].includes(toolName)` au début de son `execute` et renvoie une `clarification` sinon — au cas où l'enregistrement dériverait un jour (renommage d'outil, oubli de mise à jour du mapping).
3. **System prompt** : une ligne `targetTypeHint` rappelle explicitement au modèle la cible choisie, en complément du filtrage (la contrainte technique prime, ce n'est qu'un renfort).
4. **Effet de bord corrigé** : l'auto-proposition d'une interface après `create_table` (voir § snapshot/auto-propositions) est désactivée dès que `targetType` est défini et différent de `interface`/`app` — sinon choisir « Table » produisait quand même une proposition « Créer une interface » non désirée.

### Cas spécial : « Données fictives » (`targetType: 'mock_data'`)

Cette cible ne passe **pas** par la boucle d'outils générique : `chat()` la détecte juste après la résolution du modèle et délègue à `generateMockDataForCurrentTable()`, qui fait tout en code déterministe :

```
ctx.pageContext.tableId  (la table actuellement affichée, transmise par le frontend)
   │
   ▼
résout la table dans le snapshot
   │
   ▼
RecordService.getRecords(tableId, { take: 50, fieldKeyType: Name, ignoreViewQuery: true })
   │
   ▼
ne garde que les lignes vides (tous les champs null/undefined/'') — max 3
   │
   ├─ aucune ligne vide → message texte « contient déjà des données », rien n'est proposé
   │
   ▼
generateObject({ schema: champs typés, min(1)/max(N) — pas .length(N) strict, prompt: contexte + message utilisateur })
   │
   ▼
min(générées, lignes vides) propositions `update_record` (preview + proposalId), comme tout autre write tool
```

Le frontend transmet `pageContext: { tableId, tableName }` (issu de `useTable()` dans `ChatPanel.tsx`) **uniquement** quand `targetType === 'mock_data'`. Sans table ouverte, l'IA répond qu'elle a besoin qu'une table soit affichée — elle ne devine jamais la table depuis le texte libre pour cette cible.

**Durcissement (audit 2026-06-28)** :
- `take: 50` (au lieu de 5) — un échantillon trop petit pouvait conclure à tort « table déjà remplie » si les premières lignes étaient pleines mais des lignes vides existaient plus loin.
- Le schéma Zod de `generateObject` utilise `.min(1).max(N)` plutôt qu'un `.length(N)` strict — un LLM qui renvoie un tableau de longueur différente ne fait plus planter tout le tour de conversation (exception Zod non rattrapée). Le code ne propose que `min(lignes générées, lignes vides)` mises à jour, sans halluciner les manquantes.
- Couvert par 4 tests dédiés dans `unified-ai.service.spec.ts` (table non ouverte, table déjà pleine, génération normale, désaccord de longueur LLM).

### Événements SSE (`UnifiedChatEvent`)

```ts
type: 'text_chunk' | 'tool_result' | 'proposal' | 'done' | 'error'
```

- `text_chunk` — texte de l'assistant. ⚠️ le backend ne renseigne jamais de champ `role` sur ces événements ; côté frontend, `MessageItem.tsx` traite tout `text_chunk`/`text` dont `role !== 'user'` comme un message assistant (un `text_chunk` reçu depuis le flux SSE ne peut, par construction, être qu'une réponse du serveur).
- `tool_result` — résultat d'un **read tool**
- `proposal` — une écriture proposée (`{ proposalId, action, preview }`)
- `done` / `error` — fin / erreur

---

## 2. Read tools vs Write tools — le cœur de la sécurité

Les outils sont enregistrés dans `chatInner()` ([unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts)) sous deux objets littéraux distincts, `readTools` et `writeTools` — la distinction se fait **structurellement** (deux objets séparés), pas via un registre central.

|  | **Read tools** | **Write tools** |
|---|---|---|
| Exemples | `get_workspace_state`, `query_records` | `create_table`, `create_field`, `create_view`, `create_record`, `update_record`, `link_tables`, `create_base`, `create_folder`, `create_app_interface`, `create_automation`, `create_agent`, `generate_app_code`, `delete_field`, `rename_table`, `rename_field` |
| Effet | s'exécutent **immédiatement**, renvoient les données | **ne mutent rien** : créent une *proposition* persistée |
| Retour | données brutes | `{ __type: 'proposal', proposalId, action, preview }` |

`buildWriteTool(toolName, description, params)` est l'usine commune : elle vérifie d'abord la cohérence avec `targetType` (defense-in-depth, voir §1), résout `baseId`/noms, construit un *preview*, appelle `ActionProposalService.createProposal()` (qui **persiste** la proposition sans écrire en base métier), et renvoie l'objet `proposal`.

`query_records(tableId, query?)` interroge réellement `RecordService.getRecords` (jusqu'à 20 enregistrements, recherche plein-texte si `query` est fourni) — il ne renvoie plus systématiquement `[]` comme avant l'audit du 2026-06-28 ; une erreur (table supprimée, ID invalide) est absorbée localement et renvoie `[]` plutôt que de faire échouer tout le tour de conversation.

---

## 3. Le cycle proposer → accepter

**Aucune écriture n'est appliquée tant que l'utilisateur n'a pas accepté.**

```
chat() yield {type:'proposal'}
   └─► Frontend affiche <ProposalCard> (Accepter / Refuser)
            │ clic « Accepter »
            ▼
POST /ai/accept-proposal
   └─► ActionProposalService.acceptProposal(proposalId, userId)
         ├─ vérifie que la proposition n'est pas déjà acceptée (ConflictException)
         ├─ résout baseId manquant (conversation → spaceId → 1ʳᵉ base)
         └─► executeAction(action, args)        [le switch d'actions]
                └─► services Teable réels :
                    ViewOpenApiService, FieldOpenApiService,
                    RecordOpenApiService, BaseNodeService, WorkflowService, AgentService…
```

### Actions exécutables (`executeAction`)

`create_table`, `create_folder`, `create_app_interface`, `create_automation`, `create_agent`, `create_base`, `create_field`, **`create_view`**, `link_tables`, `delete_field`, `rename_table`, `rename_field`, `create_record`, `update_record`, `generate_app_code`.

> Un échec d'exécution marque la proposition `executionFailed`, ce qui autorise un « Réessayer ».

### Focus : `create_view`

`create_view` ([action-proposal.service.ts](../apps/nestjs-backend/src/features/ai/action-proposal.service.ts)) couvre les **7 entrées** du menu « + » du frontend ([AddView.tsx](../apps/nextjs-app/src/features/app/blocks/table/table-header/AddView.tsx)) :

| `type` demandé | Comportement (identique au frontend) |
|---|---|
| `grid` / `gallery` / `kanban` / `calendar` / `gantt` / `form` | `ViewOpenApiService.createView({ type, name })` direct |
| `ai` | `AiService.generateViewConfig(baseId, tableId, prompt)` → crée une **vue native** avec `filter`/`sort`/`columnMeta` générés |
| `ai` sans `prompt` | renvoie `{ status: 'skipped' }` en demandant le prompt |
| type inconnu | renvoie `{ status: 'skipped' }` |

> ⚠️ Il n'existe pas de `ViewType` « AI » dans Teable. L'enum `ViewType` ([packages/core](../packages/core/src/models/view/constant.ts)) ne contient que : `Grid, Gallery, Kanban, Calendar, Form, Gantt, Plugin`. La « vue AI » est une **vue native dont la configuration est générée par l'IA** — c'est exactement ce que fait le bouton « Générer avec l'IA ».

---

## 4. Helpers IA ponctuels (`AiService`)

[ai.service.ts](../apps/nestjs-backend/src/features/ai/ai.service.ts) — utilisés hors chat agentique, souvent en streaming direct vers une `Response` :

| Méthode | Rôle |
|---|---|
| `generateViewConfig(baseId, tableId, prompt)` | Config de vue native depuis une description (utilisé par le chat **et** par le bouton « Générer avec l'IA ») |
| `generateTableCreationStream(...)` | Génération de schéma de table |
| `generateWorkflowConfig(...)` | Config d'automatisation |
| `generateImportAnalysis(...)` | Analyse d'un fichier importé |
| `generateAppCodeStream(...)` | Génération de code d'app |
| `generateForField(...)` / `generateText(...)` | Génération au niveau champ/cellule |
| `embed(...)` / `getEmbeddingModelInstance(...)` | Embeddings |

### Modèles & configuration

- `getModelInstance(modelKey, llmProviders)` instancie le modèle via le **Vercel AI SDK**.
- `getAIConfig(baseId)` / `getAIConfigBySpaceId(spaceId)` renvoient la config (`llmProviders`, `chatModel.lg` / `chatModel.sm`).
- La config est **scopée par base** : chaque base peut avoir ses propres providers LLM. Le chat agentique utilise la **première base de l'espace comme proxy** pour résoudre la config.
- `getModelTags` / `getGatewayModelPricing` / `fetchGatewayModelsFromApi` gèrent la passerelle de modèles (catalogue, tarifs, tags).

---

## 5. Frontend

⚠️ **Deux surfaces de chat coexistent**, branchées sur deux backends différents — ce n'est pas un seul composant unifié malgré le nom :

| Surface | Composants | Backend | Contexte d'usage |
|---|---|---|---|
| **Panneau base** | `UnifiedChatContainer.tsx`, `MessageItem.tsx` | `POST /api/spaces/:spaceId/ai/chat` (`UnifiedAiService`) | Panneau latéral d'une base (`ChatPanel.tsx`). Porte les boutons `targetType` (Table/Interface/Automation/Agent/Application/Données fictives). |
| **Agent dédié** | `ChatContainer.tsx`, `ChatInput.tsx`, `MessageList.tsx` | `POST /api/agent/:id/run` | Pages `/agent/[id]` et `/base/[baseId]/agent/[agentId]` — fait tourner un agent **déjà créé** (triggers, plan-and-execute). |

Conséquence concrète : les boutons `targetType` et « Données fictives » **n'existent pas** sur la surface agent dédié — `MessageItem.tsx` gère d'ailleurs deux types d'événements en union (`AgentRunEvent` legacy + `UnifiedChatEvent`) pour pouvoir s'afficher dans les deux contextes. À garder en tête avant de supposer qu'une évolution du panneau base s'applique partout.

Autres composants ([apps/nextjs-app/src/components/AgentChat/](../apps/nextjs-app/src/components/AgentChat/)) :

- `ChatPanel.tsx` ([features/app/components/chat-panel](../apps/nextjs-app/src/features/app/components/chat-panel/ChatPanel.tsx)) — panneau latéral, fournit `pageContext` (table actuellement affichée)
- `ProposalCard.tsx` — carte « Accepter / Refuser » d'une proposition (labels FR par action dans `ACTION_LABELS`)
- `ToolExecutionCard.tsx` — affichage de l'exécution des read tools
- `ConversationHistory.tsx` — historique

> `PromptCarousel.tsx` et `TemplateSuggestionCards.tsx` ont été supprimés le 2026-06-28 (audit) : aucun import nulle part dans le code, confirmés orphelins avant suppression.

---

## 6. Étendre le système — ajouter une action d'écriture

Exemple concret (suivre le patron de `create_view`) :

1. **Déclarer l'outil** dans `writeTools` de [unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts) via `buildWriteTool(name, description, zodSchema)` — il est automatiquement traité comme write tool (créé une proposition) du simple fait d'être dans cet objet, sans registre séparé à mettre à jour.
2. **Si l'outil doit être restreint par `targetType`** : ajouter son nom à l'entrée correspondante de `TARGET_TYPE_TOOLS`.
3. **Ajouter un cas** dans `buildPreview()` (ce que voit l'utilisateur dans la `ProposalCard`).
4. **Ajouter le cas d'exécution** dans `executeAction()` de [action-proposal.service.ts](../apps/nestjs-backend/src/features/ai/action-proposal.service.ts), qui route vers le service Teable réel.
5. **Câbler la DI** : importer le module du service cible dans [unified-ai.module.ts](../apps/nestjs-backend/src/features/ai/unified-ai.module.ts) + injecter le service dans `ActionProposalService`.
6. **Label frontend** : ajouter une entrée dans `ACTION_LABELS` de `ProposalCard.tsx`.
7. **(Optionnel)** ligne de guidage dans le system prompt + test unitaire dans [action-proposal.service.spec.ts](../apps/nestjs-backend/src/features/ai/action-proposal.service.spec.ts) et [unified-ai.service.spec.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.spec.ts).

---

## En une phrase

> Un agent qui reçoit l'état complet de l'espace, appelle des outils en boucle (jusqu'à 30 étapes), mais où **toute mutation est une proposition gatée par l'humain** avant d'atteindre les services Teable réels — tandis qu'un second service (`AiService`) fournit des générations IA ponctuelles (vues, schémas, workflows, code).
