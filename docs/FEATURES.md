# Fonctionnalités & dépendances

Liste des fonctionnalités de Teable (modules `apps/nestjs-backend/src/features/`) avec, pour chacune, les autres fonctionnalités dont elle dépend (imports de modules NestJS, extraits du code — graphe : 13 254 nœuds / 31 891 arêtes, `graphify-out/`).

Infrastructure transverse (utilisée partout, non répétée ci-dessous) : `db-provider` (abstraction SQL Postgres), `event-emitter` (bus d'événements), `queue` (jobs BullMQ/Redis), `performance-cache`, `share-db` (collaboration temps réel), Prisma, Redis.

## Cœur données (spreadsheet sur Postgres)

| Fonctionnalité | Rôle | Dépend de |
|---|---|---|
| **table** | Tables (CRUD, schéma) | calculation, field, record, view |
| **field** | Champs/colonnes typés | calculation |
| **record** | Lignes/enregistrements | attachments, calculation, table |
| **view** | Vues (grille, kanban, formulaire…) | calculation |
| **calculation** | Formules, champs calculés, liens | record |
| **aggregation** | Agrégats, group by, stats | record, table |
| **selection** | Copier/coller, sélection de plage | aggregation, canary, field, record |
| **graph** | Graphe de dépendances entre champs | calculation, field, record |
| **database-view** | Vues SQL matérialisées | calculation, record |
| **table-domain** | Logique domaine table (v2) | — |
| **integrity** | Vérification/réparation d'intégrité des liens | canary, field, v2 |
| **undo-redo** | Annuler/rétablir les opérations | field, record, v2, view |
| **v2** | Nouveau moteur d'opérations (CQRS) | attachments, share-db, undo-redo, view |

## Organisation & espaces

| Fonctionnalité | Rôle | Dépend de |
|---|---|---|
| **space** | Espaces de travail | auth, base, collaborator, invitation, setting |
| **base** | Bases (conteneur de tables) | attachments, collaborator, field, graph, invitation, notification, record, table, v2, view |
| **organization** | Organisations (EE) | — |
| **collaborator** | Membres et rôles | — |
| **invitation** | Invitations par lien/email | collaborator, mail-sender, setting, user |
| **pin** | Épingler bases/espaces | — |
| **trash** | Corbeille / restauration | attachments, base, field, record, space, table, user, v2, view |
| **template** | Modèles de bases | attachments, base |
| **dashboard** | Tableaux de bord | base, collaborator |

## Auth & sécurité

| Fonctionnalité | Rôle | Dépend de |
|---|---|---|
| **auth** | Sessions, login, OIDC/SAML | access-token, user |
| **user** | Comptes utilisateurs | attachments, setting |
| **access-token** | Jetons API personnels | — |
| **oauth** | Serveur OAuth (apps tierces) | access-token |
| **oauth-integration** | Connexions OAuth sortantes (Gmail, GitHub…) | — |
| **user-integration** | Intégrations par utilisateur | oauth-integration |
| **authority-matrix** | Matrice de permissions | — |
| **field-permission** | Permissions par champ | auth |
| **verified-domain** | Domaines vérifiés (EE) | — |
| **audit-log** | Journal d'audit (EE) | — |

## IA & automatisation

| Fonctionnalité | Rôle | Dépend de |
|---|---|---|
| **ai** | Config LLM, génération, embeddings | agent, base-node, field, record, table, view, workflow, setting |
| **agent** | Agents autonomes (MCP, outils) | ai, app-builder, dashboard, doc-search, field, record, table, view, workflow |
| **chat** | Chat IA dans l'UI | — |
| **workflow** | Workflows événementiels (triggers/actions) | ai, auth, mail-sender, record |
| **automation** (frontend) | UI de construction des workflows | workflow |
| **doc-search** | Recherche sémantique / RAG sur documents | ai, external-connection, worker |
| **app-builder** | Génération d'apps par IA | ai |
| **base-node** | Nœuds d'app (pages, ressources) | app-builder, auth, canary, dashboard, field, table, workflow |

## Partage & collaboration

| Fonctionnalité | Rôle | Dépend de |
|---|---|---|
| **share** | Partage public de vues | aggregation, auth, collaborator, field, record, selection, view |
| **base-share** | Partage public de bases | auth, base, field, view |
| **comment** | Commentaires sur enregistrements | attachments, notification, record, share-db |
| **notification** | Notifications in-app + email | mail-sender, share-db, user |

## Données entrantes/sortantes

| Fonctionnalité | Rôle | Dépend de |
|---|---|---|
| **import** | Import CSV/Excel (streaming) | attachments, field, notification, record, table, v2 |
| **export** | Export CSV | field, record |
| **attachments** | Fichiers joints (S3/local) | auth, share |
| **external-connection** | Connexions Postgres externes | — |
| **base-sql-executor** | Exécution SQL brute sur une base | — |

## Plugins & extension

| Fonctionnalité | Rôle | Dépend de |
|---|---|---|
| **plugin** | Registre de plugins | access-token, attachments, external-connection, user |
| **plugin-panel** | Panneaux de plugins dans les vues | base, collaborator |
| **plugin-context-menu** | Plugins de menu contextuel | collaborator |

## Plateforme & exploitation

| Fonctionnalité | Rôle | Dépend de |
|---|---|---|
| **setting** | Paramètres d'instance (admin) | — |
| **mail-sender** | Envoi d'emails (SMTP) | setting |
| **health** | Endpoints de santé | — |
| **monitoring** | Métriques / observabilité | event-emitter, queue |
| **usage** | Quotas et limites (EE) | — |
| **canary** | Feature flags / déploiement progressif | setting |
| **data-loader** | Batching de lectures (DataLoader) | — |
| **builtin-assets-init** | Assets par défaut au démarrage | attachments |
| **model** | Registre des modèles LLM | — |
| **next** | Serveur du frontend Next.js | — |

Frontend (`apps/nextjs-app`) : reflète ces fonctionnalités via le SDK (`packages/sdk`) et l'API OpenAPI (`packages/openapi`) ; la logique métier partagée est dans `packages/core` (formules dans `packages/formula`).
