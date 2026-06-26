# Documentation Teable — Fonctionnalités personnalisées

> Version : mai 2026  
> Stack : NestJS (backend) · Next.js (frontend) · PostgreSQL · Prisma

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [AI Chat & Build](#2-ai-chat--build)
3. [Champ AI (AI Field)](#3-champ-ai-ai-field)
4. [App Builder / Dashboard](#4-app-builder--dashboard)
5. [Automations](#5-automations)
6. [Domain Verification](#6-domain-verification)
7. [Relations entre tables (Link)](#7-relations-entre-tables-link)
8. [Authority Matrix](#8-authority-matrix)
9. [Architecture technique](#9-architecture-technique)
10. [Référence des fichiers modifiés](#10-référence-des-fichiers-modifiés)

---

## 1. Vue d'ensemble

Teable est une base de données sans code (no-code) construite sur PostgreSQL. Ce document décrit les fonctionnalités personnalisées implémentées au-dessus de la version open-source.

### Fonctionnalités ajoutées

| Fonctionnalité | Statut | Description |
|---|---|---|
| AI Chat | ✅ Actif | Chat IA contextuel sur vos données |
| AI Build | ✅ Actif | Création de tables par IA en langage naturel |
| AI Field | ✅ Actif | Champ qui génère des valeurs via IA |
| App Builder | ✅ Actif | Tableaux de bord personnalisés par base |
| Automations | ✅ Actif | Runs illimités, historique illimité |
| Domain Verification | ✅ Actif | Whitelist de domaines e-mail |
| Link (relations) | ✅ Natif | Relations one-way / two-way entre tables |
| Authority Matrix | 🔜 Prévu | Permissions granulaires par rôle |

---

## 2. AI Chat & Build

### Description

Le panneau AI est accessible depuis la barre latérale de chaque base. Il propose deux modes :

- **Chat** — posez des questions sur vos données en langage naturel
- **Build** — décrivez des tables à créer, l'IA les crée directement dans Teable

### Accès

Cliquez sur l'icône **AI** dans la barre latérale gauche de votre base. Le panneau s'ouvre à droite (380 px de large).

### Mode Chat

Posez n'importe quelle question sur vos données. L'IA répond en streaming.

**Raccourcis**
- `Enter` — envoyer le message
- `Shift+Enter` — saut de ligne
- Bouton ■ — arrêter la génération

### Mode Build

Décrivez la structure que vous souhaitez créer. Exemple :

```
Crée une table "Clients" avec les champs :
- Nom (texte)
- Email (texte)
- Date d'inscription (date)
- Statut (sélection unique : Actif, Inactif, Prospect)
```

L'IA génère un JSON structuré puis crée chaque table avec ses champs via l'API Teable. La progression s'affiche en temps réel dans le panneau.

### Modèle IA

Le modèle est configuré dans les paramètres d'instance (Admin > AI Configuration). Le modèle par défaut est défini via la variable `OPENROUTER_API_KEY` ou la configuration admin.

> **Note** : les modèles gratuits (ex. `minimax:free`) ne supportent pas le tool calling. Le mode Build utilise `generateText` + parsing JSON pour contourner cette limitation.

### Fichiers clés

| Fichier | Rôle |
|---|---|
| `apps/nextjs-app/src/features/app/components/chat-panel/ChatPanel.tsx` | Composant UI du panneau |
| `apps/nextjs-app/src/features/app/components/sidebar/useChatPanelStore.ts` | État ouvert/fermé |
| `apps/nestjs-backend/src/features/ai/ai.service.ts` | Service IA (chat + build stream) |
| `packages/openapi/src/ai/build-stream.ts` | Endpoint `POST /api/{baseId}/ai/build-stream` |

---

## 3. Champ AI (AI Field)

### Description

Le champ AI est un nouveau type de champ qui génère automatiquement des valeurs à partir des autres données de l'enregistrement, en utilisant un modèle de langage.

**Cas d'usage** : résumés, tags, scores, traductions, extraction d'informations.

### Création

1. Ajouter un nouveau champ dans une table
2. Sélectionner le type **AI Field** (icône baguette magique ✨)
3. Dans les options, rédiger le **prompt AI** :
   - Décrivez ce que vous souhaitez générer
   - Référencez les champs avec la syntaxe `{fieldId}` (ou utilisez `/` dans l'éditeur de prompt avancé)
4. Sauvegarder

### Options du champ

| Option | Description |
|---|---|
| `prompt` | Instructions pour le modèle IA |
| `sourceFieldIds` | Champs sources à inclure dans le contexte |

### Caractéristiques techniques

- **Type de valeur** : texte (`string`)
- **`isComputed`** : `false` (la valeur n'est pas calculée automatiquement à chaque modification — elle est générée à la demande)
- **`notNull`** : non supporté (valeur générée, pas saisie)
- **Affichage** : rendu comme un champ `SingleLineText` dans la grille

### Fichiers clés

| Fichier | Rôle |
|---|---|
| `packages/core/src/models/field/constant.ts` | `FieldType.Ai = 'ai'` |
| `packages/core/src/models/field/derivate/ai.field.ts` | Classe `AiFieldCore` + schéma zod |
| `apps/nestjs-backend/src/features/field/model/field-dto/ai-field.dto.ts` | DTO backend |
| `apps/nextjs-app/src/features/app/components/field-setting/options/AiFieldOptions.tsx` | UI des options |
| `packages/sdk/src/model/field/ai.field.ts` | Classe SDK `AiField` |
| `packages/sdk/src/hooks/use-field-static-getter.ts` | Icône + titre dans le sélecteur |

---

## 4. App Builder / Dashboard

### Description

L'App Builder permet de créer des tableaux de bord personnalisés au sein d'une base. Chaque dashboard est un **App** (type de ressource `BaseNodeResourceType.App`) dont le contenu est stocké en JSON dans le champ `content` du modèle Prisma `App`.

### Accès

Dans la barre latérale d'une base, cliquez sur **+ App** ou naviguez vers une App existante. L'URL est de la forme :

```
/base/{baseId}/{appId}
```

### Widgets disponibles

| Type | Description |
|---|---|
| `table` | Intégration d'une vue de table Teable |
| `text` | Bloc de texte libre (titre, description) |
| `chart` | Graphique (configuration à venir) |

### Interface

- **Grille de widgets** : glissez-déposez pour réorganiser
- **+ Ajouter** : ajoute un widget via le menu en haut
- **Supprimer** : bouton ✕ sur chaque widget
- **Sauvegarder** : bouton en haut à droite — persiste le JSON dans la base de données

### API backend

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/base/{baseId}/app/{appId}/content` | Récupère le contenu du dashboard |
| `PATCH` | `/api/base/{baseId}/app/{appId}/content` | Sauvegarde le contenu |

### Structure JSON du contenu

```json
{
  "widgets": [
    {
      "id": "widget-1",
      "type": "table",
      "title": "Clients",
      "tableId": "tblXXXXXXXXXXXXXX"
    },
    {
      "id": "widget-2",
      "type": "text",
      "title": "Notes",
      "content": "Bienvenue sur ce dashboard."
    }
  ]
}
```

### Fichiers clés

| Fichier | Rôle |
|---|---|
| `apps/nextjs-app/src/features/app/base-node/AppBuilderPage.tsx` | Page UI du dashboard |
| `apps/nextjs-app/src/pages/base/[baseId]/[[...slug]].tsx` | Route → `<AppBuilderPage />` |
| `apps/nestjs-backend/src/features/app-builder/app-builder.controller.ts` | Controller content API |
| `apps/nestjs-backend/src/features/app-builder/app-builder.service.ts` | `getAppContent` / `updateAppContent` |

---

## 5. Automations

### Description

Les automations permettent de déclencher des workflows automatiquement (sur événement, planification, etc.).

### Quotas

Cette instance est configurée sans limitation :

| Paramètre | Valeur |
|---|---|
| Runs par mois | **Illimité** |
| Historique des runs | **Illimité** |
| Fonctionnalité activée | ✅ Oui |

Ces valeurs sont définies dans `ENTERPRISE_USAGE` (`usage.controller.ts`) :

```typescript
maxNumAutomationRuns: 9_999_999_999,
maxAutomationHistoryDays: 9_999_999_999,
```

### Gestion des workflows

Un workflow est une ressource de type `BaseNodeResourceType.Workflow`. Il est stocké dans la table `workflow` (Prisma).

| Champ | Type | Description |
|---|---|---|
| `id` | `string` | Identifiant unique (préfixe `wfl`) |
| `name` | `string` | Nom du workflow |
| `baseId` | `string` | Base associée |
| `config` | `Json?` | Configuration des étapes |
| `isActive` | `boolean` | Actif / inactif |

### Page Automation

La page automation (`/base/{baseId}/workflow`) affiche :
- Badge **∞ aucun quota mensuel**
- Badge **historique illimité**
- Bouton **Créer une automation**

### Fichiers clés

| Fichier | Rôle |
|---|---|
| `apps/nextjs-app/src/features/app/automation/Pages.tsx` | Page UI |
| `apps/nestjs-backend/src/features/workflow/workflow.service.ts` | CRUD workflows |
| `apps/nestjs-backend/src/features/workflow/workflow.module.ts` | Module NestJS |
| `apps/nestjs-backend/src/features/base-node/base-node.service.ts` | Routing `Workflow` case |
| `apps/nestjs-backend/src/features/usage/usage.controller.ts` | Constante `ENTERPRISE_USAGE` |

---

## 6. Domain Verification

### Description

La vérification de domaine permet à l'administrateur de restreindre les invitations et inscriptions aux adresses e-mail appartenant à des domaines approuvés.

### Accès

**Admin** > **Paramètres** > section **Domain Verification**

### Fonctionnement

1. L'admin ajoute un domaine (ex. `monentreprise.com`)
2. Les invitations sont limitées aux adresses `@monentreprise.com`
3. L'admin peut supprimer un domaine à tout moment

### API

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/setting/domain-verification` | Liste des domaines autorisés |
| `POST` | `/api/setting/domain-verification` | Ajouter un domaine |
| `DELETE` | `/api/setting/domain-verification/{domain}` | Supprimer un domaine |

Les domaines sont stockés dans les paramètres d'instance sous la clé `allowedEmailDomains` (champ JSON dans la table `setting`).

### Fichiers clés

| Fichier | Rôle |
|---|---|
| `apps/nestjs-backend/src/features/setting/open-api/domain-verification.controller.ts` | Controller REST |
| `apps/nestjs-backend/src/features/setting/open-api/setting-open-api.module.ts` | Module (controller enregistré) |
| `apps/nextjs-app/src/features/app/blocks/admin/setting/components/DomainVerification.tsx` | Composant UI |
| `apps/nextjs-app/src/features/app/blocks/admin/setting/SettingPage.tsx` | Page admin (section insérée) |

---

## 7. Relations entre tables (Link)

### Description

Le champ **Link** crée une relation entre deux tables. C'est un type natif de Teable.

### Création

1. Ajouter un champ → type **Link**
2. Choisir la **table cible**
3. Choisir le **type de relation** :

| Type | Description |
|---|---|
| **One way** | Relation unidirectionnelle. Seule la table source a un champ lié. |
| **Two way** | Relation bidirectionnelle. Un champ miroir est créé dans la table cible. |

### Multiplicité

| Relation | Table source | Table cible |
|---|---|---|
| One-to-many | Un enregistrement → plusieurs cibles | — |
| Many-to-many | Plusieurs ↔ plusieurs | Champ symétrique |

### Utilisation

- Cliquez dans une cellule Link pour **sélectionner des enregistrements liés**
- Les champs **Rollup** et **Lookup** peuvent agréger des données depuis les enregistrements liés
- Les filtres et vues supportent les champs Link

---

## 8. Authority Matrix

### Description

La matrice d'autorité permet de configurer des permissions granulaires par rôle au niveau d'une base.

> ⚠️ **Statut** : Infrastructure de base en place (IDs, permissions, i18n, page stub). L'implémentation complète (migration DB, endpoints CRUD, UI fonctionnelle) est planifiée.

### Infrastructure existante

- ID generators : `generateAuthorityMatrixId()`, `generateAuthorityMatrixRoleId()`
- Permission action : `base|authority_matrix_config`
- Strings i18n : présents
- Page frontend : `apps/nextjs-app/src/features/app/blocks/AuthorityMatrix.tsx`
- Route : `/base/{baseId}/authority-matrix`

### À implémenter

- Migration Prisma : tables `authority_matrix` + `authority_matrix_role`
- Endpoints NestJS CRUD
- UI de gestion des rôles et permissions

---

## 9. Architecture technique

### Stack

```
┌─────────────────────────────────────────────────┐
│  Next.js 14 (App Router / Pages Router mixte)   │
│  React · TailwindCSS · shadcn/ui                │
└──────────────────────┬──────────────────────────┘
                       │ HTTP / REST + WebSocket
┌──────────────────────▼──────────────────────────┐
│  NestJS (backend)                               │
│  Prisma ORM · ShareDB · Bull (queues)           │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  PostgreSQL 15                                  │
│  __undo_log · workflow · app · dashboard · …    │
└─────────────────────────────────────────────────┘
```

### Packages du monorepo

| Package | Rôle |
|---|---|
| `packages/core` | Types, enums, validation zod (partagés frontend + backend) |
| `packages/sdk` | Hooks React, composants, modèles de champ |
| `packages/openapi` | Fonctions fetch typées (client API) |
| `packages/db-main-prisma` | Schéma Prisma + migrations |
| `packages/common-i18n` | Traductions (en, fr, ja, zh…) |
| `packages/v2/*` | Architecture v2 (DDD, CQRS, Kysely) — progressive migration |

### Système v2

Le backend migre progressivement vers une architecture v2 (Domain-Driven Design + CQRS). La création de champs et la mutation d'enregistrements passent déjà par v2 via `@UseV2Feature('createField')`.

Les types de champs doivent être enregistrés à la fois dans :
- `packages/core/src/models/field/constant.ts` (enum v1)
- `packages/v2/core/src/domain/table/fields/FieldType.ts` (tuple v2)

### Infrastructure undo/capture

Chaque table dynamique dispose d'un trigger PostgreSQL `__teable_undo_capture` qui capture les mutations dans `__undo_log`. Ce système supporte les opérations Undo/Redo.

La table `__undo_log` et la fonction `__teable_capture_undo_row()` sont créées par la migration `20260406000000_add_v2_undo_capture_infra`.

---

## 10. Référence des fichiers modifiés

### Core (partagé)

| Fichier | Modification |
|---|---|
| `packages/core/src/models/field/constant.ts` | `FieldType.Ai = 'ai'` |
| `packages/core/src/models/field/derivate/ai.field.ts` | Nouveau : `AiFieldCore` |
| `packages/core/src/models/field/derivate/index.ts` | Export `ai.field` |
| `packages/core/src/models/field/field.schema.ts` | `getOptionsSchema` + import |
| `packages/core/src/models/field/field-unions.schema.ts` | Union schemas + `aiFieldOptionsSchema` |
| `packages/core/src/models/field/options.schema.ts` | `safeParseOptions` case |
| `packages/core/src/models/field/cell-value-validation.ts` | `validateCellValue` case |

### SDK

| Fichier | Modification |
|---|---|
| `packages/sdk/src/model/field/ai.field.ts` | Nouveau : `AiField` |
| `packages/sdk/src/model/field/factory.ts` | `AiField` case |
| `packages/sdk/src/hooks/use-field-static-getter.ts` | `FieldType.Ai` → `MagicAi` icon |
| `packages/sdk/src/utils/fieldType.ts` | `FIELD_TYPE_ORDER` |
| `packages/sdk/src/utils/filterWithDefaultValue.ts` | Pass-through case |
| `packages/sdk/src/components/cell-value/CellValue.tsx` | Renderer map |
| `packages/sdk/src/components/grid-enhancements/hooks/use-grid-columns.tsx` | Read-only text cell |

### Backend NestJS

| Fichier | Modification |
|---|---|
| `apps/nestjs-backend/src/features/ai/ai.service.ts` | `generateBuildStream` (JSON + create tables) |
| `apps/nestjs-backend/src/features/field/model/field-dto/ai-field.dto.ts` | Nouveau : `AiFieldDto` |
| `apps/nestjs-backend/src/features/field/model/factory.ts` | `FieldType.Ai` case |
| `apps/nestjs-backend/src/features/app-builder/app-builder.service.ts` | `getAppContent` / `updateAppContent` |
| `apps/nestjs-backend/src/features/app-builder/app-builder.controller.ts` | Nouveau : content API |
| `apps/nestjs-backend/src/features/app-builder/app-builder.module.ts` | Controller enregistré |
| `apps/nestjs-backend/src/features/workflow/workflow.service.ts` | Nouveau : `WorkflowService` |
| `apps/nestjs-backend/src/features/workflow/workflow.module.ts` | Nouveau : `WorkflowModule` |
| `apps/nestjs-backend/src/features/base-node/base-node.service.ts` | Case `Workflow` |
| `apps/nestjs-backend/src/features/base-node/base-node.module.ts` | Import `WorkflowModule` |
| `apps/nestjs-backend/src/features/setting/open-api/domain-verification.controller.ts` | Nouveau |
| `apps/nestjs-backend/src/features/setting/open-api/setting-open-api.module.ts` | Controller enregistré |
| `apps/nestjs-backend/src/features/field/open-api/field-open-api-v2.service.ts` | Skip notNull/unique pour `Ai` |

### Frontend Next.js

| Fichier | Modification |
|---|---|
| `apps/nextjs-app/src/features/app/components/chat-panel/ChatPanel.tsx` | Mode Build streaming |
| `apps/nextjs-app/src/features/app/components/field-setting/FieldOptions.tsx` | Case `FieldType.Ai` |
| `apps/nextjs-app/src/features/app/components/field-setting/SelectFieldType.tsx` | `FieldType.Ai` dans les listes |
| `apps/nextjs-app/src/features/app/components/field-setting/options/AiFieldOptions.tsx` | Nouveau : UI options AI |
| `apps/nextjs-app/src/features/app/components/field-setting/useFieldTypeSubtitle.ts` | Case `FieldType.Ai` |
| `apps/nextjs-app/src/features/app/components/field-setting/field-ai-config/components/prompt-editor/PromptEditor.tsx` | Fix: refs stables pour `onChange`/`decorateFields` |
| `apps/nextjs-app/src/features/app/base-node/AppBuilderPage.tsx` | Nouveau : page dashboard |
| `apps/nextjs-app/src/features/app/base-node/index.ts` | Export `AppBuilderPage` |
| `apps/nextjs-app/src/features/app/automation/Pages.tsx` | Suppression gate enterprise |
| `apps/nextjs-app/src/features/app/blocks/admin/setting/components/DomainVerification.tsx` | Nouveau |
| `apps/nextjs-app/src/features/app/blocks/admin/setting/SettingPage.tsx` | Section Domain Verification |
| `apps/nextjs-app/src/pages/base/[baseId]/[[...slug]].tsx` | Route `App` → `AppBuilderPage` |

### V2 Core

| Fichier | Modification |
|---|---|
| `packages/v2/core/src/domain/table/fields/FieldType.ts` | `'ai'` dans `fieldTypeValues` |

### Prisma / DB

| Fichier | Modification |
|---|---|
| `packages/db-main-prisma/prisma/postgres/schema.prisma` | Modèle `Workflow` |
| DB (SQL direct) | Table `__undo_log` + index + séquence |

### OpenAPI (client)

| Fichier | Modification |
|---|---|
| `packages/openapi/src/ai/build-stream.ts` | Nouveau : `aiBuildStream()` |
| `packages/openapi/src/ai/index.ts` | Export `build-stream` |

### i18n

| Fichier | Modification |
|---|---|
| `packages/common-i18n/src/locales/en/sdk.json` | `"ai"` titre + description |

---

*Documentation générée le 9 mai 2026.*
