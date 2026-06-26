import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Pencil, Plus, Trash2 } from '@teable/icons';
import {
  getAuthorityMatrixList,
  createAuthorityMatrix,
  updateAuthorityMatrix,
  deleteAuthorityMatrix,
  createAuthorityMatrixRole,
  updateAuthorityMatrixRole,
  deleteAuthorityMatrixRole,
  type IAuthorityMatrixVo,
  type IAuthorityMatrixRoleVo,
} from '@teable/openapi';
import { ReactQueryKeys } from '@teable/sdk/config';
import { useBasePermission } from '@teable/sdk/hooks';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@teable/ui-lib/shadcn';
import {
  allActions,
  spaceActions,
  baseActions,
  tableActions,
  viewActions,
  fieldActions,
  recordActions,
  automationActions,
  appActions,
  userActions,
  tableRecordHistoryActions,
  instanceActions,
  enterpriseActions,
} from '@teable/core';
import { useRouter } from 'next/router';

// ---------------------------------------------------------------------------
// Action grouping helpers
// ---------------------------------------------------------------------------

const ACTION_GROUPS: { label: string; actions: readonly string[] }[] = [
  { label: 'Tables', actions: tableActions },
  { label: 'Champs', actions: fieldActions },
  { label: 'Vues', actions: viewActions },
  { label: 'Enregistrements', actions: recordActions },
  { label: 'Collaboration', actions: spaceActions },
  { label: 'Base', actions: baseActions },
  { label: 'Automatisations', actions: automationActions },
  {
    label: 'Autres',
    actions: [
      ...appActions,
      ...userActions,
      ...tableRecordHistoryActions,
      ...instanceActions,
      ...enterpriseActions,
    ],
  },
];

function getActionLabel(action: string): string {
  const separatorIndex = Math.max(action.indexOf('|'), action.indexOf(':'));
  if (separatorIndex === -1) return action;
  return action.slice(separatorIndex + 1);
}

// ---------------------------------------------------------------------------
// ActionCheckboxGrid
// ---------------------------------------------------------------------------

interface ActionCheckboxGridProps {
  actions: string[];
  baseId: string;
  matrixId: string;
  roleId: string;
}

function ActionCheckboxGrid({ actions, baseId, matrixId, roleId }: ActionCheckboxGridProps) {
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: (newActions: string[]) =>
      updateAuthorityMatrixRole(baseId, matrixId, roleId, { actions: newActions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.authorityMatrixList(baseId) });
    },
  });

  function handleToggle(actionValue: string, checked: boolean | string) {
    const newActions = checked
      ? [...actions, actionValue]
      : actions.filter((a) => a !== actionValue);
    updateRoleMutation.mutate(newActions);
  }

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 overflow-x-auto">
      {ACTION_GROUPS.map((group) => (
        <div key={group.label} className="min-w-fit">
          <p className="text-xs font-semibold text-muted-foreground mb-1">{group.label}</p>
          <div className="space-y-1">
            {group.actions.map((actionValue) => (
              <label key={actionValue} className="flex items-center gap-1 text-xs">
                <Checkbox
                  checked={actions.includes(actionValue)}
                  onCheckedChange={(checked) => handleToggle(actionValue, checked)}
                />
                {getActionLabel(actionValue)}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoleRow
// ---------------------------------------------------------------------------

interface RoleRowProps {
  role: IAuthorityMatrixRoleVo;
  baseId: string;
  matrixId: string;
}

function RoleRow({ role, baseId, matrixId }: RoleRowProps) {
  const queryClient = useQueryClient();

  const updateNameMutation = useMutation({
    mutationFn: (name: string) =>
      updateAuthorityMatrixRole(baseId, matrixId, role.id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.authorityMatrixList(baseId) });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: () => deleteAuthorityMatrixRole(baseId, matrixId, role.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.authorityMatrixList(baseId) });
    },
  });

  function handleNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    const newName = e.target.value.trim();
    if (newName && newName !== role.name) {
      updateNameMutation.mutate(newName);
    }
  }

  return (
    <div className="flex items-start gap-3 py-2">
      <Input
        defaultValue={role.name}
        className="h-7 text-xs w-32 shrink-0"
        onBlur={handleNameBlur}
      />
      <div className="flex-1 overflow-x-auto">
        <ActionCheckboxGrid
          actions={role.actions}
          baseId={baseId}
          matrixId={matrixId}
          roleId={role.id}
        />
      </div>
      <Button
        size="xs"
        variant="ghost"
        className="text-destructive hover:text-destructive shrink-0"
        onClick={() => deleteRoleMutation.mutate()}
        disabled={deleteRoleMutation.isPending}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MatrixDialog
// ---------------------------------------------------------------------------

interface MatrixDialogProps {
  mode: 'create' | 'edit';
  baseId: string;
  matrix?: IAuthorityMatrixVo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MatrixDialog({ mode, baseId, matrix, open, onOpenChange }: MatrixDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(matrix?.name ?? '');
  const [description, setDescription] = useState(matrix?.description ?? '');

  const createMutation = useMutation({
    mutationFn: () => createAuthorityMatrix(baseId, { name, description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.authorityMatrixList(baseId) });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateAuthorityMatrix(baseId, matrix!.id, {
        name,
        description: description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.authorityMatrixList(baseId) });
      onOpenChange(false);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setName(matrix?.name ?? '');
      setDescription(matrix?.description ?? '');
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit() {
    if (mode === 'create') {
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nouvelle matrice' : 'Modifier la matrice'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Input
              placeholder="Nom de la matrice"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Input
              placeholder="Description (optionnel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// CreateMatrixButton
// ---------------------------------------------------------------------------

interface CreateMatrixButtonProps {
  baseId: string;
  size?: 'sm' | 'xs' | 'default' | 'lg' | 'icon';
}

function CreateMatrixButton({ baseId, size }: CreateMatrixButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <Plus className="size-4 mr-2" />
        Nouvelle matrice
      </Button>
      <MatrixDialog mode="create" baseId={baseId} open={open} onOpenChange={setOpen} />
    </>
  );
}

// ---------------------------------------------------------------------------
// MatrixCard
// ---------------------------------------------------------------------------

interface MatrixCardProps {
  matrix: IAuthorityMatrixVo;
  baseId: string;
}

function MatrixCard({ matrix, baseId }: MatrixCardProps) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteAuthorityMatrix(baseId, matrix.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.authorityMatrixList(baseId) });
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: () =>
      createAuthorityMatrixRole(baseId, matrix.id, { name: 'Nouveau rôle', actions: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.authorityMatrixList(baseId) });
    },
  });

  return (
    <Card className="shadow-none border">
      <CardContent className="p-4">
        {/* Card header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold">{matrix.name}</span>
            {matrix.description && (
              <span className="text-sm text-muted-foreground">{matrix.description}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer la matrice</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Tous les rôles associés seront supprimés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteMutation.mutate()}
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Roles section */}
        <div className="border-t mt-4 pt-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Rôles</p>
          <div className="flex flex-col divide-y">
            {matrix.roles.map((role) => (
              <RoleRow key={role.id} role={role} baseId={baseId} matrixId={matrix.id} />
            ))}
          </div>
          <div className="mt-3">
            <Button
              size="xs"
              variant="outline"
              onClick={() => addRoleMutation.mutate()}
              disabled={addRoleMutation.isPending}
            >
              <Plus className="size-3.5 mr-1" />
              Ajouter un rôle
            </Button>
          </div>
        </div>
      </CardContent>

      <MatrixDialog
        mode="edit"
        baseId={baseId}
        matrix={matrix}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AuthorityMatrixPage (top-level export)
// ---------------------------------------------------------------------------

export function AuthorityMatrixPage() {
  const router = useRouter();
  const baseId = router.query.baseId as string;
  const basePermission = useBasePermission();

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ReactQueryKeys.authorityMatrixList(baseId),
    queryFn: () => getAuthorityMatrixList(baseId).then((r) => r.data),
    enabled: !!baseId,
  });

  // Permission guard — locked state, NOT 404
  if (basePermission && basePermission['base|authority_matrix_config'] === false) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <Lock className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Vous n&apos;avez pas accès à la configuration de la matrice d&apos;autorité.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex-col md:flex">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-8 py-4">
        <h2 className="text-2xl font-semibold tracking-tight">Matrice d&apos;autorité</h2>
        {baseId && <CreateMatrixButton baseId={baseId} size="sm" />}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4">
        {isLoading && (
          <>
            <div className="h-40 rounded-lg bg-muted animate-pulse" />
            <div className="h-40 rounded-lg bg-muted animate-pulse" />
          </>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            Impossible de charger les matrices. Réessayez ou rechargez la page.
          </p>
        )}

        {!isLoading && !isError && data && data.list.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <h3 className="text-sm font-semibold">Aucune matrice configurée</h3>
              <p className="text-xs text-muted-foreground">
                Créez votre première matrice pour définir des rôles personnalisés.
              </p>
              {baseId && <CreateMatrixButton baseId={baseId} />}
            </div>
          </div>
        )}

        {!isLoading && !isError && data && data.list.length > 0 && (
          <>
            {data.list.map((matrix) => (
              <MatrixCard key={matrix.id} matrix={matrix} baseId={baseId} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
