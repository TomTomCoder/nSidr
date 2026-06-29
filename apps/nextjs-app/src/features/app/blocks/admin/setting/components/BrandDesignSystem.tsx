import { Plus, X } from '@teable/icons';
import type {
  IBrandColor,
  IBrandDesignSystem,
  IBrandFontFamily,
  IBrandPrinciple,
} from '@teable/openapi';
import { uploadBrandAsset } from '@teable/openapi';
import { Spin } from '@teable/ui-lib/base';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  sonner,
} from '@teable/ui-lib/shadcn';
import { useRef, useState } from 'react';

const FONT_FAMILIES: IBrandFontFamily[] = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Poppins',
  'Montserrat',
  'Nunito',
  'Source Sans Pro',
  'Playfair Display',
  'Custom',
];

const BUTTON_STYLES = [
  { value: 'rounded', label: 'Arrondi' },
  { value: 'pill', label: 'Pilule' },
  { value: 'square', label: 'Carré' },
] as const;

const FORM_STYLES = [
  { value: 'outlined', label: 'Contour' },
  { value: 'filled', label: 'Rempli' },
  { value: 'underlined', label: 'Souligné' },
] as const;

const NAVBAR_STYLES = [
  { value: 'fixed-top', label: 'Fixe en haut' },
  { value: 'sticky', label: 'Collante' },
  { value: 'sidebar', label: 'Barre latérale' },
  { value: 'minimal', label: 'Minimale' },
] as const;

const PRINCIPLES: { value: IBrandPrinciple; label: string; desc: string }[] = [
  { value: 'simplicity', label: 'Simplicité', desc: 'Interface minimale, sans éléments superflus' },
  {
    value: 'accessibility',
    label: 'Accessibilité',
    desc: 'Contrastes WCAG AA, navigation au clavier',
  },
  { value: 'consistency', label: 'Cohérence', desc: 'Mêmes motifs réutilisés sur tous les écrans' },
  { value: 'clarity', label: 'Clarté', desc: 'Hiérarchie visuelle claire, actions évidentes' },
  { value: 'performance', label: 'Performance', desc: 'Markup léger, peu de ressources' },
];

const emptyDesignSystem: IBrandDesignSystem = {
  colors: [],
  typography: {},
  illustrations: [],
  componentLibrary: {},
  principles: [],
  customPrinciples: '',
};

export const BrandDesignSystem = ({
  value,
  onChange,
}: {
  value?: IBrandDesignSystem | null;
  onChange: (value: IBrandDesignSystem) => void;
}) => {
  const [ds, setDs] = useState<IBrandDesignSystem>({ ...emptyDesignSystem, ...value });
  const [isUploadingFont, setIsUploadingFont] = useState(false);
  const [isUploadingIllustration, setIsUploadingIllustration] = useState(false);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const illustrationInputRef = useRef<HTMLInputElement>(null);

  const persist = (next: IBrandDesignSystem) => {
    setDs(next);
    onChange(next);
    sonner.toast('Paramètres enregistrés');
  };

  // ── Colors ──────────────────────────────────────────────────────────────
  const colors = ds.colors ?? [];
  const addColor = () =>
    persist({
      ...ds,
      colors: [...colors, { name: `Couleur ${colors.length + 1}`, hex: '#000000' }],
    });
  const updateColor = (i: number, patch: Partial<IBrandColor>) => {
    const next = colors.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    setDs({ ...ds, colors: next }); // live update while typing, persisted onBlur
  };
  const commitColors = () => persist(ds);
  const removeColor = (i: number) =>
    persist({ ...ds, colors: colors.filter((_, idx) => idx !== i) });

  // ── Typography ──────────────────────────────────────────────────────────
  const typography = ds.typography ?? {};
  const setFontFamily = (fontFamily: IBrandFontFamily) =>
    persist({ ...ds, typography: { ...typography, fontFamily } });
  const handleFontUpload = async (file: File) => {
    setIsUploadingFont(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'font');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await uploadBrandAsset(formData as any);
      persist({
        ...ds,
        typography: {
          ...typography,
          fontFamily: 'Custom',
          customFontUrl: res.data.url,
          customFontName: file.name.replace(/\.[^.]+$/, ''),
        },
      });
    } catch {
      sonner.toast('Échec du téléchargement de la police');
    } finally {
      setIsUploadingFont(false);
    }
  };

  // ── Illustrations ───────────────────────────────────────────────────────
  const illustrations = ds.illustrations ?? [];
  const handleIllustrationUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingIllustration(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('kind', 'illustration');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await uploadBrandAsset(formData as any);
        uploaded.push(res.data.url);
      }
      persist({ ...ds, illustrations: [...illustrations, ...uploaded] });
    } catch {
      sonner.toast('Échec du téléchargement des illustrations');
    } finally {
      setIsUploadingIllustration(false);
    }
  };
  const removeIllustration = (url: string) =>
    persist({ ...ds, illustrations: illustrations.filter((u) => u !== url) });

  // ── Component library ──────────────────────────────────────────────────
  const componentLibrary = ds.componentLibrary ?? {};
  const setComponentStyle = (key: 'buttonStyle' | 'formStyle' | 'navbarStyle', val: string) =>
    persist({ ...ds, componentLibrary: { ...componentLibrary, [key]: val } });

  // ── Principles ──────────────────────────────────────────────────────────
  const principles = ds.principles ?? [];
  const togglePrinciple = (p: IBrandPrinciple) => {
    const next = principles.includes(p) ? principles.filter((x) => x !== p) : [...principles, p];
    persist({ ...ds, principles: next });
  };

  return (
    <div className="pb-6">
      <h2 className="mb-1 text-lg font-medium">Design System</h2>
      <p className="mb-4 text-xs text-gray-500">
        Personnalise l&apos;identité visuelle utilisée par l&apos;IA pour générer des interfaces
        cohérentes avec ta marque.
      </p>

      <div className="flex w-full flex-col space-y-4">
        {/* Couleurs */}
        <div className="space-y-3 rounded-lg border p-4 shadow-sm">
          <Label>Charte graphique — Couleurs</Label>
          <div className="flex flex-wrap gap-3">
            {colors.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-md border px-2 py-1.5">
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => updateColor(i, { hex: e.target.value })}
                  onBlur={commitColors}
                  className="size-6 cursor-pointer rounded border-0"
                />
                <Input
                  value={c.name}
                  onChange={(e) => updateColor(i, { name: e.target.value })}
                  onBlur={commitColors}
                  className="h-7 w-28 text-xs"
                />
                <Input
                  value={c.hex}
                  onChange={(e) => updateColor(i, { hex: e.target.value })}
                  onBlur={commitColors}
                  className="h-7 w-20 text-xs"
                  maxLength={7}
                />
                <button
                  type="button"
                  onClick={() => removeColor(i)}
                  aria-label="Supprimer la couleur"
                >
                  <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addColor} className="h-9">
              <Plus className="mr-1 size-3.5" />
              Ajouter une couleur
            </Button>
          </div>
        </div>

        {/* Typographie */}
        <div className="space-y-3 rounded-lg border p-4 shadow-sm">
          <Label>Charte graphique — Typographie</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={typography.fontFamily}
              onValueChange={(v) => setFontFamily(v as IBrandFontFamily)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Choisir une police" />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f === 'Custom' ? 'Personnalisée (import)' : f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typography.fontFamily === 'Custom' && (
              <>
                <input
                  ref={fontInputRef}
                  type="file"
                  accept=".woff,.woff2,.ttf,.otf,font/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFontUpload(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fontInputRef.current?.click()}
                  disabled={isUploadingFont}
                >
                  {isUploadingFont ? (
                    <Spin className="mr-1.5 size-3.5" />
                  ) : (
                    <Plus className="mr-1.5 size-3.5" />
                  )}
                  Importer une police
                </Button>
                {typography.customFontName && (
                  <span className="text-xs text-muted-foreground">{typography.customFontName}</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Illustrations */}
        <div className="space-y-3 rounded-lg border p-4 shadow-sm">
          <Label>Charte graphique — Illustrations</Label>
          <div className="flex flex-wrap items-center gap-3">
            {illustrations.map((url) => (
              <div key={url} className="group relative size-16 overflow-hidden rounded-md border">
                <img src={url} alt="illustration de marque" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeIllustration(url)}
                  aria-label="Supprimer l'illustration"
                  className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <input
              ref={illustrationInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleIllustrationUpload(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => illustrationInputRef.current?.click()}
              disabled={isUploadingIllustration}
              className="flex size-16 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:border-foreground hover:text-foreground"
            >
              {isUploadingIllustration ? <Spin /> : <Plus className="size-5" />}
            </button>
          </div>
        </div>

        {/* Bibliothèque de composants */}
        <div className="space-y-3 rounded-lg border p-4 shadow-sm">
          <Label>Bibliothèque de composants</Label>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Boutons</p>
              <Select
                value={componentLibrary.buttonStyle}
                onValueChange={(v) => setComponentStyle('buttonStyle', v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  {BUTTON_STYLES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Formulaires</p>
              <Select
                value={componentLibrary.formStyle}
                onValueChange={(v) => setComponentStyle('formStyle', v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  {FORM_STYLES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Barre de navigation</p>
              <Select
                value={componentLibrary.navbarStyle}
                onValueChange={(v) => setComponentStyle('navbarStyle', v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  {NAVBAR_STYLES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Principes */}
        <div className="space-y-3 rounded-lg border p-4 shadow-sm">
          <Label>Principes de design</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <label key={p.value} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={principles.includes(p.value)}
                  onCheckedChange={() => togglePrinciple(p.value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{p.label}</span>
                  <span className="block text-xs text-muted-foreground">{p.desc}</span>
                </span>
              </label>
            ))}
          </div>
          <Textarea
            placeholder="Autres principes (texte libre)…"
            defaultValue={ds.customPrinciples}
            onBlur={(e) => persist({ ...ds, customPrinciples: e.target.value })}
            className="text-sm"
          />
        </div>
      </div>
    </div>
  );
};
