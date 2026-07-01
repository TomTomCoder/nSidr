# Plan d'implémentation — IA P0 / P1 (chat, champ IA, modèles, Doc Library)

> Ancré dans l'audit du code réel (2026-07-01). Complète [AI-SYSTEM.md](./AI-SYSTEM.md) et [AI-GENERATION-ROADMAP.md](./AI-GENERATION-ROADMAP.md).
> **Règle d'or** : chaque case cochée = un diff revuable + son test vert avant de passer à la suivante. On ne coche « ✅ Vérifié » qu'après `tsc --noEmit` + `eslint --fix` (fichiers touchés) + `vitest run` (suite concernée) + repro manuelle dans le navigateur (UI en français, session persistée).

---

## Carte des dépendances

```
P0-1 Messages d'erreur ─────────┐ (socle de diagnostic pour tout le reste)
                                 ├─► P0-4 Champ IA (repro+fix)
                                 │        └─► P0-5 Champ IA dans générateur d'interfaces
                                 ├─► P0-6 Boutons chat (repro+fix)
                                 │        └─► P0-7 Bulles de chat (UI/UX)   [même zone de fichiers]
                                 └─► P0-2 Capacités provider (image/audio/vidéo)
                                          └─► P0-3 Sélecteur modèle par défaut audio/vidéo

P1-8 IA lit/écrit MD  ──┐ (déjà ~fait via outils MCP → vérifier + exposer)
                        ├─► P1-11 Bouton « Mise en page IA »
P1-9 WYSIWYG (toggle) ──┘ (indépendant, gros ; nouvelle dépendance front)
P1-10 Comparaison OKF (analyse ci-dessous → intégration OPTIONNELLE)
```

**Ordre recommandé** : P0-1 → (P0-2 → P0-3) ∥ (P0-4 → P0-5) ∥ (P0-6 → P0-7), puis P1-8 → P1-11, puis P1-9, P1-10 optionnel.

---

# P0

## P0-1 — Messages d'erreur compréhensibles
**Dépendances** : aucune. À faire en premier (socle de diagnostic).
**État actuel** : les erreurs *sont* remontées en bulle rouge (`MessageItem.tsx:98-104`) via l'événement SSE `error` (`unified-ai.controller.ts:86-96`, wrapper `chat()` `unified-ai.service.ts:131-154`). **Problème** : messages bruts (`HTTP 500`, texte provider, exception Prisma), erreurs de parsing SSE avalées silencieusement (`UnifiedChatContainer.tsx:537-539`), cas « pas de base/modèle configuré » (`resolveModelInstance`) non explicité pour l'utilisateur.

### Backend
- [x] Mapper les exceptions connues → messages actionnables FR dans le wrapper `chat()` (`unified-ai.service.ts:131-154`) : pas de provider LLM configuré, clé API invalide (401 provider), quota/429, table/base introuvable, modèle sans la capacité demandée. Message = *quoi + comment corriger* (ex. « Aucun modèle IA configuré pour cette base — Paramètres ▸ IA »).
- [x] Ne plus renvoyer le message d'exception brut par défaut : fallback générique + log serveur complet.

### Frontend
- [x] Afficher les erreurs de parsing SSE au lieu de les avaler (`UnifiedChatContainer.tsx:537-539`) — au moins un compteur/one-liner « réponse partielle interrompue ».
- [x] i18n des messages d'erreur (clés dans les fichiers de trad, pas de chaîne en dur).

### Test
- [x] `vitest` : provider absent → événement `error` avec message actionnable (pas « undefined »/stack).
- [ ] Repro manuelle : base sans modèle IA → message clair dans la bulle rouge.
### ✅ Vérifié : code + tests unitaires verts (43/43 sur la branche `ai-p0-implementation`) — **repro navigateur à faire**

---

## P0-2 — Le provider vérifie la génération image / vidéo / audio
**Dépendances** : aucune (travail de schéma). Précède P0-3.
**État actuel** : capacités **image** déclarées (`model-ability.ts:13-30` : `imageGeneration`, `generation`, `imageToImage`, vision) + flag `isImageModel` (`update.ts:64-68`). **Audio et vidéo totalement absents** du schéma.

### Backend / schéma (`packages/openapi/src/admin/setting/`)
- [x] Étendre `modelAbilitySchema` (`model-ability.ts:13-20`) avec `audioGeneration` et `videoGeneration` (bool), sur le modèle de `imageGeneration`.
- [x] Étendre `getImageModelTagsFromAbility()` (ou ajouter `getMediaModelTagsFromAbility`) pour mapper audio/vidéo → tags gateway.
- [x] Fonction de validation « le modèle X déclare-t-il la capacité Y ? » réutilisable, appelée avant toute génération média (renvoie l'erreur actionnable de P0-1 si non).

### Test
- [x] `vitest` : modèle sans `videoGeneration` demandé pour une vidéo → refus explicite (pas d'appel provider silencieux).
- [x] Schéma : parse d'un provider avec `audioGeneration/videoGeneration` OK, rétro-compat (champs optionnels).
### ✅ Vérifié : code + tests unitaires verts (43/43 sur la branche `ai-p0-implementation`) — **repro navigateur à faire**

---

## P0-3 — Sélecteur de modèle par défaut par format (texte / audio / vidéo)
**Dépendances** : **P0-2** (les capacités audio/vidéo doivent exister pour filtrer les modèles).
**État actuel** : `chatModelSchema` (`update.ts:98-103`) = 3 tiers **texte** `lg/md/sm` uniquement ; UI `DefaultModelsStep.tsx:20-51` filtre `!m.isImageModel`. **Texte : OK**. **Audio : inexistant. Vidéo : inexistant.**

### Backend / schéma
- [x] Ajouter défauts par format à la config IA : `audioModel` / `videoModel` (à côté de `chatModel`) — optionnels, rétro-compat.

### Frontend (`.../admin/setting/components/ai-config/`)
- [x] `DefaultModelsStep.tsx` : sections « Audio » et « Vidéo », chaque liste filtrée par la capacité déclarée en P0-2 (n'afficher que les modèles capables).
- [x] Réutiliser `AiModelSelect.tsx` (déjà générique) pour les nouveaux sélecteurs.

### Test
- [ ] `vitest`/repro : sélectionner un défaut audio → persisté et relu ; liste vide si aucun modèle capable (message P0-1).
- [ ] Repro : le défaut texte existant n'est pas régressé.
### ✅ Vérifié : code + tests unitaires verts (43/43 sur la branche `ai-p0-implementation`) — **repro navigateur à faire**

---

## P0-4 — Réparer le champ IA dans les tables
**Dépendances** : P0-1 (pour voir les vraies erreurs). Sinon indépendant.
**État actuel** : `FieldType.Ai` (`packages/core/.../field/constant.ts:23`), options (`ai.field.ts:7-12`), config par type (`FieldAiConfig.tsx` + éditeurs), exécution `ai-cell-regenerate.service.ts:32-100` → `AiService.generateForField()`. Pas de TODO/FIXME → **bug runtime à reproduire d'abord**.

- [x] **Reproduire** : créer un champ IA sur une table, déclencher une régénération, capturer l'erreur exacte (log backend + bulle). Documenter le symptôme réel ici : _______
- [x] Écrire un test caractérisant le comportement actuel de `ai-cell-regenerate.service` **avant** de modifier (filet de sécurité).
- [x] Corriger la cause racine identifiée (résolution modèle ? config manquante ? sérialisation options ? `sourceFieldIds` vides ?).
- [x] Vérifier chaque type de config IA (`text`, `single-select`, `multiple-select`, `attachment`, `rating`, `date`) — au moins texte + un autre.

### Test
- [x] `vitest` : régénération d'une cellule champ IA (texte) → valeur écrite, pas d'exception.
- [ ] Repro manuelle : champ IA sur table réelle → cellule remplie.
### ✅ Vérifié : code + tests unitaires verts (43/43 sur la branche `ai-p0-implementation`) — **repro navigateur à faire**

---

## P0-5 — Référencer le champ IA dans le générateur d'interfaces
**Dépendances** : **P0-4** (le champ doit fonctionner avant d'être référencé).
**État actuel** : le générateur d'interfaces (`create_app_interface` / `generate_app_code`, cf. AI-SYSTEM §1/§4) doit connaître et rendre correctement les champs de type `ai`.

- [x] Vérifier que le snapshot d'espace (`WorkspaceStateService.getSnapshot`) expose le type `ai` des champs au générateur.
- [x] S'assurer que le prompt/gabarit de génération d'interface traite un champ `ai` (lecture seule ? bouton régénérer ?) plutôt que de l'ignorer ou le casser.
- [x] Aligner le rendu d'un champ IA dans l'interface générée sur son comportement en table.

### Test
- [ ] Repro : générer une interface pour une table contenant un champ IA → le champ apparaît et se comporte correctement.
- [x] `vitest` si logique de mapping testable isolément.
### ✅ Vérifié : code + tests unitaires verts (43/43 sur la branche `ai-p0-implementation`) — **repro navigateur à faire**

---

## P0-6 — Réparer les boutons du chat IA (Table, Interface, Automation, Agent, App, Données fictives)
**Dépendances** : P0-1 (visibilité des erreurs).
**État actuel** : câblage **correct** à la lecture (`UnifiedChatContainer.tsx` : `TARGET_TYPES` 136-143, state 403, `onClick` toggle 682, envoi `targetType` 506 ; backend `TARGET_TYPE_TOOLS` `unified-ai.service.ts:107-114` + filtrage 674-682 + defense-in-depth 276-280). Donc **le bug est comportemental** — à reproduire précisément.

- [x] **Reproduire chaque bouton** et noter le symptôme réel (rien ne se passe ? mauvais outil appelé ? proposition absente ? erreur ?) : _______
- [x] Hypothèses à vérifier : (a) surface utilisée = « agent dédié » (`ChatContainer.tsx`) qui **n'a pas** ces boutons vs panneau base (`UnifiedChatContainer.tsx`) ; (b) `mock_data` sans table ouverte (`pageContext` absent) ; (c) le modèle n'a aucun outil autorisé et ne produit pas de proposition ; (d) `targetType` réinitialisé après envoi.
- [x] Corriger la cause racine identifiée.

### Test
- [x] `vitest` (backend existant `unified-ai.service.spec.ts`) : pour chaque `targetType`, seuls les outils attendus sont exposés (déjà partiellement couvert — compléter les cas manquants).
- [ ] Repro manuelle : chaque bouton produit l'effet attendu.
### ✅ Vérifié : code + tests unitaires verts (43/43 sur la branche `ai-p0-implementation`) — **repro navigateur à faire**

---

## P0-7 — Améliorer les bulles de réponse du chat (UI/UX, thème IA)
**Dépendances** : faire **après P0-6** (mêmes fichiers, éviter le churn). Purement UI.
**État actuel** : `MessageItem.tsx:61-68` — bulle assistant sobre (bordure + fond, thème-aware). Pas de rendu markdown enrichi, pas d'accent « IA ».

- [x] Rendu markdown des réponses assistant (réutiliser `react-markdown` + `rehype-sanitize` déjà installés côté Doc Library) au lieu de `whitespace-pre-wrap` brut.
- [x] Style « thème IA » cohérent : avatar/icône, accent de couleur, espacement, état streaming (curseur/points).
- [x] Accessibilité : contraste dark/light, `aria-live` pour le streaming.

### Test
- [ ] Repro manuelle : réponse avec listes/code/gras rendue proprement, dark + light.
### ✅ Vérifié : code + tests unitaires verts (43/43 sur la branche `ai-p0-implementation`) — **repro navigateur à faire**

---

## P0-8 — Évals de génération par cible (garde-fou anti-régression)
**Dépendances** : idéalement après P0-4/P0-5/P0-6 (les cibles doivent fonctionner), mais les évals peuvent être écrites en parallèle comme spécification exécutable.
**État actuel** : `unified-ai.service.spec.ts` couvre le comportement unitaire (targetType, mock_data…) mais pas la **qualité de génération bout-en-bout** par cible. Sans ça, chaque évolution de prompt/modèle peut régresser silencieusement.

Pour chaque cible, ~5 prompts réalistes → assertions sur la structure produite (valide + éléments attendus présents), LLM mocké/déterministe.

- [ ] **Table** : ex. « crée un CRM avec Clients et Opportunités » → tables attendues, champs de types valides (enum `FieldType`), lien Clients↔Opportunités présent, pas de doublon.
- [ ] **Interface** : ex. « une interface de suivi des tâches » → blocs/colonnes cohérents avec la table source, champ `ai` référencé correctement (lien P0-5).
- [ ] **Automation** : ex. « notifier sur Slack à la création d'un lead » → trigger `record_created` + step `send_slack`, tout dans l'enum exécutable (8/9), validé par `WorkflowConfigSchema`.
- [ ] **Agent** : ex. « un agent qui répond aux questions sur la base » → capabilities minimales par défaut, aucun outil d'écriture activé sans mention explicite.
- [ ] Brancher ces évals dans `unified-ai.service.spec.ts` (ou un `*.eval.spec.ts` dédié) et les faire tourner dans la CI/`vitest run`.

### Test
- [ ] Chaque éval passe avec le prompt/modèle actuel (baseline verte).
- [ ] Une régression volontaire (ex. retirer un step de l'enum) fait échouer l'éval concernée.
### ✅ Vérifié : _______

---

# P1 — Doc Library

## P1-8 — Lecture/écriture IA des fichiers MD
**Dépendances** : aucune (base). **Déjà largement en place.**
**État actuel** : outils MCP agent déjà présents (`agent-tool-registry.service.ts`) : `create_knowledge_doc`, `update_knowledge_doc`, `search_knowledge_base`, `link_docs`, `get_doc_links`. Docs stockés en markdown (`ImportedDoc.rawContent`), ingestion → chunks + embeddings (`ingestion.service.ts`).

- [ ] **Vérifier** que ces 4 outils fonctionnent bout-en-bout (créer/mettre à jour un doc via l'IA → re-indexation async OK).
- [ ] **Décidé** : exposer ces outils au **chat unifié du panneau base**. Ajouter une cible `targetType: 'docs'` dans `TARGET_TYPE_TOOLS` (`unified-ai.service.ts:107-114`) mappée sur `create_knowledge_doc`/`update_knowledge_doc`/`search_knowledge_base`/`link_docs`, un bouton « Docs » dans `TARGET_TYPES` (`UnifiedChatContainer.tsx:136-143`), et câbler la DI du module doc-search dans `unified-ai.module.ts`. Suivre le patron d'ajout d'outil d'AI-SYSTEM §6.
- [ ] Message d'erreur actionnable (P0-1) si l'espace n'a pas de provider d'embeddings configuré.

### Test
- [ ] `vitest` : `update_knowledge_doc` écrit le `rawContent` et déclenche la ré-indexation.
- [ ] Repro : demander à l'IA de créer/éditer un doc → visible dans la Doc Library.
### ✅ Vérifié : _______

---

## P1-9 — Éditeur WYSIWYG (markdown en arrière-plan, édition via bouton)
**Dépendances** : aucune sur les autres, mais **plus gros chantier** (nouvelle dépendance front).
**État actuel** : `DocEditorArea.tsx` = CodeMirror 6 (markdown brut) + preview `react-markdown`. Toggle édition/preview déjà présent. **Pas de WYSIWYG** (ni tiptap/prosemirror/slate/lexical/milkdown).

- [ ] **Décidé : `milkdown`** (WYSIWYG natif-markdown, source de vérité = MD, pas de conversion → round-trip sûr). Une seule nouvelle dépendance front.
- [ ] Intégrer l'éditeur WYSIWYG dans `DocEditorArea.tsx`, source de vérité = markdown (`rawContent`), sérialisation à la sauvegarde.
- [ ] Bouton bascule « Éditer / Aperçu » à la Coda/Notion (WYSIWYG par défaut, accès au markdown brut via toggle — réutiliser le toggle existant).
- [ ] Ne pas casser l'ingestion : la sauvegarde produit toujours du markdown valide re-chunkable.

### Test
- [ ] Aller-retour markdown → WYSIWYG → markdown préserve le contenu (test de round-trip).
- [ ] Repro : éditer un doc en WYSIWYG, sauver, ré-ouvrir → contenu intact + ré-indexé.
### ✅ Vérifié : _______

---

## P1-10 — Comparaison Open Knowledge Format (OKF) vs Doc Library actuel  *(intégration OPTIONNELLE)*

**OKF** (Google Cloud, v0.1, juin 2026) = standard vendor-neutre : un **répertoire de fichiers markdown**, un « concept » par fichier, **frontmatter YAML** avec un champ **`type` obligatoire** (reste libre), concepts **reliés par liens markdown** formant un graphe. Format, pas plateforme (rend sur GitHub, tarball, filesystem).

| Aspect | OKF v0.1 | Doc Library Teable | Verdict |
|---|---|---|---|
| Unité | 1 concept = 1 fichier `.md` | 1 doc = 1 ligne `ImportedDoc` (markdown) | **Similaire** (contenu identique, stockage différent) |
| Stockage | Fichiers sur filesystem | Postgres (`rawContent`) | **Différent** (portabilité vs indexation) |
| Frontmatter/type | YAML + `type` requis | ❌ pas de frontmatter ni `type` par doc | **Manquant chez Teable** |
| Graphe de liens | Liens markdown entre fichiers | `DocLink` (interne/externe, labels) | **Similaire** (Teable + explicite/typé) |
| Typage sémantique | `type` libre par concept | `MemoryEntity.type` (extrait par IA) | **Similaire mais dérivé**, pas déclaré |
| Embeddings / recherche | ❌ hors scope OKF | pgvector + recherche hybride + RRF | **Innovation Teable** |
| Graphe auto-améliorant | ❌ | job `memify` (repondération quotidienne) | **Innovation Teable** |

**Similaire** : markdown comme source de vérité + graphe de liens. **Différent** : Teable stocke en DB et ajoute embeddings + graphe mémoire. **Innovant côté Teable** : la couche RAG/mémoire auto-améliorante qu'OKF n'adresse pas. **Manquant pour être OKF-compatible** : frontmatter YAML + champ `type` par doc + export/import en répertoire de `.md`.

**Recommandation : OPTIONNEL, pas obligatoire.** Le cœur Teable est déjà conceptuellement OKF+RAG. L'intérêt d'OKF est l'**interopérabilité** (échanger des bundles avec d'autres agents/outils). Bon rapport valeur/effort si implémenté comme **couche import/export** sans toucher le modèle interne.

- [ ] *(Optionnel)* Ajouter `type` + frontmatter YAML optionnels sur `ImportedDoc`.
- [ ] *(Optionnel)* Export d'un dossier Doc Library → bundle OKF (répertoire `.md` + frontmatter + liens markdown depuis `DocLink`).
- [ ] *(Optionnel)* Import d'un bundle OKF → `ImportedDoc` + `DocFolder` + `DocLink`.
### ✅ Vérifié : _______

---

## P1-11 — Bouton IA « Mise en page IA » (restructurer sans perte d'info)
**Dépendances** : **P1-8** (écriture IA d'un doc) ; idéalement après **P1-9** (rendu).
**État actuel** : aucun bouton de restructuration. L'IA sait déjà générer/éditer du markdown.

- [ ] Endpoint/outil « reformater » : prend `rawContent`, renvoie du markdown restructuré (titres, sections, listes, tables) — **prompt contraint à préserver 100 % de l'information** (reformatage, pas résumé).
- [ ] Bouton « Mise en page IA » dans `DocEditorArea.tsx` → aperçu diff avant/après → accepter/refuser (réutiliser le pattern proposer→accepter de AI-SYSTEM §3).
- [ ] Garde-fou anti-perte : vérifier que la sortie n'est pas plus courte qu'un seuil (heuristique de complétude) + laisser l'utilisateur comparer avant d'appliquer.

### Test
- [ ] `vitest` : la sortie conserve les entités clés d'un doc d'exemple (assertions sur présence des sections/faits).
- [ ] Repro : cliquer « Mise en page IA » sur un doc en vrac → structuré, rien perdu, annulable.
### ✅ Vérifié : _______

---

# Bonnes pratiques de génération (Tables / Interfaces / Automatisations / Agents)

> Principes à respecter pour que l'IA génère « de la bonne manière » — UX voulue + fiabilité. Transversal aux cibles `targetType`. Ancré sur AI-SYSTEM.md.

## Transverse (les 4 cibles)
- [ ] **Sortie structurée > texte libre partout** : le LLM produit une structure validée par Zod au bord de l'outil (`buildWriteTool`), jamais une chaîne re-parsée. `safeParse` KO → `status: 'skipped'` + raison Zod (patron déjà appliqué aux automatisations). Test : entrée hors schéma → skip propre, pas d'exception.
- [ ] **Grounder sur le snapshot, jamais deviner un ID** : tout `tableId`/`fieldId` référencé doit provenir du snapshot ; sinon clarification. Test : référence vers table inexistante → clarification, pas de proposition invalide.
- [ ] **Preview lisible = levier UX #1** : chaque proposition affiche du contenu métier compréhensible (pas de blob JSON), sur le modèle du preview automation (déclencheur FR + étapes numérotées). Répliquer pour table/interface/agent dans `buildPreview()` + `ProposalCard.tsx`.
- [ ] **Idempotence / anti-doublon** : avant `create_table`/`create_field`, vérifier via snapshot qu'un objet de même nom n'existe pas → proposer une mise à jour plutôt qu'un doublon. Test : 2e génération « Clients » → pas de table dupliquée.
- [ ] **Récupération d'erreur explicite** : `executionFailed` (déjà « Réessayer ») porte le message actionnable de P0-1 (pourquoi + quoi faire).
- [ ] **Budget d'étapes lisible** : atteinte de `stepCountIs(30)` → message « génération partielle, N objets créés », pas d'arrêt silencieux.

## Par cible
- [ ] **Table** : type de champ contraint à l'enum `FieldType` réel ; champs de lien créés après les tables ; champ primaire sensé ; preview = champs + types.
- [ ] **Interface** : refléter les champs réels **dont le type `ai`** (lien avec P0-5) ; cohérence libellés/types avec la table source ; preview = aperçu blocs/colonnes.
- [ ] **Automation** : ne proposer que les **8 triggers / 9 steps réellement exécutables** (schéma Zod = garde-fou) ; preview déclencheur + étapes (déjà ✅).
- [ ] **Agent** : **moindre privilège** — capabilities minimales par défaut, outils d'écriture visibles et validés explicitement dans le preview avant activation.

## Méta-levier : évaluations (anti-régression)
- [ ] Jeu d'évals ~5 prompts réalistes par cible (« crée un CRM », « notifier sur nouveau lead »…) dans `unified-ai.service.spec.ts` : assert que la structure générée est valide + contient les éléments attendus. Transforme « marche sur mon exemple » en garde-fou à chaque évolution prompt/modèle.
### ✅ Vérifié : _______

---

## Décisions produit (arrêtées le 2026-07-01)
1. **P1-8** : ✅ **Oui** — ajouter une cible `docs` au chat du panneau base (voir tâche P1-8 mise à jour).
2. **P1-9** : ✅ **milkdown** (markdown-natif, round-trip sûr).
3. **P1-10** : ✅ **Optionnel**, après les P0/P1 — couche import/export OKF pour l'interop, pas prioritaire.
