# L'IA dans Teable — fonctionnement

> Documentation du système d'IA côté backend (`apps/nestjs-backend/src/features/ai`) et de son intégration frontend (`apps/nextjs-app`). Dernière mise à jour : 2026-06-27.

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
        1. charge/crée la conversation (Prisma)
        2. WorkspaceStateService.getSnapshot(spaceId)
              → bases ▸ tables ▸ fields (IDs), intégrations, agentTriggers
        3. construit le system prompt (snapshot inclus, tronqué à 12000 char)
        4. AiService.getAIConfig + getModelInstance → instance LLM
        5. generateText({ model, tools, stopWhen: stepCountIs(30) })
        6. itère result.steps → yield d'événements SSE
```

### Le snapshot = contexte de l'IA

À **chaque** message, `WorkspaceStateService.getSnapshot()` fournit l'état complet de l'espace (toutes les bases/tables/champs **avec leurs IDs**, intégrations, déclencheurs d'agents). C'est ainsi que l'IA connaît `tableId`/`baseId` sans les demander à l'utilisateur. La requête est une seule requête Prisma imbriquée (anti-N+1).

### `activeBaseId` gagne toujours

Pour toute opération d'écriture, la base actuellement ouverte par l'utilisateur (`ctx.activeBaseId`) **écrase** le choix du modèle. Cela évite que l'IA écrive dans la mauvaise base. Voir `buildWriteTool` dans [unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts).

### Boucle d'outils

`generateText` est appelé avec `stopWhen: stepCountIs(30)` : le modèle peut enchaîner jusqu'à 30 étapes d'appels d'outils dans un seul tour (ex. `create_table` → `create_table` → `link_tables`).

### Événements SSE (`UnifiedChatEvent`)

```ts
type: 'text_chunk' | 'tool_result' | 'proposal' | 'done' | 'error'
```

- `text_chunk` — texte de l'assistant
- `tool_result` — résultat d'un **read tool**
- `proposal` — une écriture proposée (`{ proposalId, action, preview }`)
- `done` / `error` — fin / erreur

---

## 2. Read tools vs Write tools — le cœur de la sécurité

Les outils sont enregistrés dans `chat()` ([unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts)). Le nom des outils d'écriture est listé dans le set `WRITE_TOOLS`.

|  | **Read tools** | **Write tools** (`WRITE_TOOLS`) |
|---|---|---|
| Exemples | `get_workspace_state`, `query_records` | `create_table`, `create_field`, `create_view`, `create_record`, `update_record`, `link_tables`, `create_base`, `create_folder`, `create_app_interface`, `create_automation`, `create_agent`, `generate_app_code`, `delete_field`, `rename_table`, `rename_field` |
| Effet | s'exécutent **immédiatement**, renvoient les données | **ne mutent rien** : créent une *proposition* persistée |
| Retour | données brutes | `{ __type: 'proposal', proposalId, action, preview }` |

`buildWriteTool(toolName, description, params)` est l'usine commune : elle résout `baseId`/noms, construit un *preview*, appelle `ActionProposalService.createProposal()` (qui **persiste** la proposition sans écrire en base métier), et renvoie l'objet `proposal`.

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

Composants principaux ([apps/nextjs-app/src/components/AgentChat/](../apps/nextjs-app/src/components/AgentChat/)) :

- `UnifiedChatContainer.tsx` / `ChatContainer.tsx` — conteneur, gère le flux SSE
- `ChatPanel.tsx` ([features/app/components/chat-panel](../apps/nextjs-app/src/features/app/components/chat-panel/ChatPanel.tsx)) — panneau latéral
- `MessageList.tsx` / `MessageItem.tsx` — affichage des messages
- `ProposalCard.tsx` — carte « Accepter / Refuser » d'une proposition (labels FR par action dans `ACTION_LABELS`)
- `ToolExecutionCard.tsx` — affichage de l'exécution des read tools
- `ConversationHistory.tsx` — historique
- `ChatInput.tsx`, `PromptCarousel.tsx`, `TemplateSuggestionCards.tsx` — saisie & suggestions

---

## 6. Étendre le système — ajouter une action d'écriture

Exemple concret (suivre le patron de `create_view`) :

1. **Déclarer l'outil** dans `writeTools` de [unified-ai.service.ts](../apps/nestjs-backend/src/features/ai/unified-ai.service.ts) via `buildWriteTool(name, description, zodSchema)`.
2. **Ajouter le nom** au set `WRITE_TOOLS` (sinon l'outil mute directement au lieu de proposer).
3. **Ajouter un cas** dans `buildPreview()` (ce que voit l'utilisateur dans la `ProposalCard`).
4. **Ajouter le cas d'exécution** dans `executeAction()` de [action-proposal.service.ts](../apps/nestjs-backend/src/features/ai/action-proposal.service.ts), qui route vers le service Teable réel.
5. **Câbler la DI** : importer le module du service cible dans [unified-ai.module.ts](../apps/nestjs-backend/src/features/ai/unified-ai.module.ts) + injecter le service dans `ActionProposalService`.
6. **Label frontend** : ajouter une entrée dans `ACTION_LABELS` de `ProposalCard.tsx`.
7. **(Optionnel)** ligne de guidage dans le system prompt + test unitaire dans [action-proposal.service.spec.ts](../apps/nestjs-backend/src/features/ai/action-proposal.service.spec.ts).

---

## En une phrase

> Un agent qui reçoit l'état complet de l'espace, appelle des outils en boucle (jusqu'à 30 étapes), mais où **toute mutation est une proposition gatée par l'humain** avant d'atteindre les services Teable réels — tandis qu'un second service (`AiService`) fournit des générations IA ponctuelles (vues, schémas, workflows, code).
