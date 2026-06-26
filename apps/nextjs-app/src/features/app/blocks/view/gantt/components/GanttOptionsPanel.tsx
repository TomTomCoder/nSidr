import { CellValueType, FieldType } from '@teable/core';
import type { IGanttViewOptions } from '@teable/core';
import { useFields, useFieldStaticGetter, useView } from '@teable/sdk/hooks';
import type { GanttView as GanttViewModel } from '@teable/sdk/model';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@teable/ui-lib/shadcn';
import { useMemo } from 'react';

interface IGanttOptionsPanelProps {
  children: React.ReactNode;
}

export const GanttOptionsPanel = ({ children }: IGanttOptionsPanelProps) => {
  const view = useView() as GanttViewModel | undefined;
  const fields = useFields({ withHidden: true, withDenied: true });
  const fieldStaticGetter = useFieldStaticGetter();

  const ganttOptions = (view?.options ?? {}) as Partial<IGanttViewOptions>;

  const { dateFields, allFields, linkOrTextField } = useMemo(
    () => ({
      dateFields: fields.filter(
        (field) => field.cellValueType === CellValueType.DateTime && !field.isMultipleCellValue
      ),
      allFields: fields,
      linkOrTextField: fields.filter(
        (field) =>
          field.type === FieldType.Link ||
          field.type === FieldType.SingleLineText ||
          field.type === FieldType.LongText
      ),
    }),
    [fields]
  );

  const onSelectChange = (key: keyof IGanttViewOptions, value: string) => {
    view?.updateOption({ [key]: value });
  };

  const onNumberChange = (key: keyof IGanttViewOptions, value: number) => {
    view?.updateOption({ [key]: value });
  };

  const onBooleanChange = (key: keyof IGanttViewOptions, value: boolean) => {
    view?.updateOption({ [key]: value });
  };

  const fieldPickers: {
    label: string;
    key: keyof IGanttViewOptions;
    value?: string;
    options: typeof fields;
    hint?: string;
  }[] = [
    {
      label: 'Champ de début',
      key: 'startField',
      value: ganttOptions.startField,
      options: dateFields,
    },
    {
      label: 'Champ de fin',
      key: 'endField',
      value: ganttOptions.endField,
      options: dateFields,
    },
    {
      label: 'Champ titre',
      key: 'titleField',
      value: ganttOptions.titleField,
      options: allFields,
    },
    {
      label: 'Champ de dépendance',
      key: 'dependencyField',
      value: ganttOptions.dependencyField,
      options: linkOrTextField,
      hint: 'Utilisez un champ lié pour des dépendances enrichies, ou un champ texte avec des ID séparés par des virgules',
    },
    {
      label: 'Champ couleur',
      key: 'colorField',
      value: ganttOptions.colorField,
      options: allFields,
    },
  ];

  return (
    <Popover modal>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="flex w-[280px] flex-col gap-4 p-4">
        {/* Field pickers */}
        {fieldPickers.map(({ label, key, value, options, hint }) => (
          <div key={key} className="flex flex-col gap-2">
            <span className="text-sm font-medium">{label}</span>
            <Select value={value ?? undefined} onValueChange={(v) => onSelectChange(key, v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner un champ..." />
              </SelectTrigger>
              <SelectContent className="w-full">
                {options.map(({ id, type, name, isLookup, isConditionalLookup, aiConfig }) => {
                  const { Icon } = fieldStaticGetter(type, {
                    isLookup,
                    isConditionalLookup,
                    hasAiConfig: Boolean(aiConfig),
                  });
                  return (
                    <SelectItem key={id} value={id}>
                      <div className="flex flex-row items-center text-[13px]">
                        <Icon className="size-5 shrink-0 pr-1" />
                        {name}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
        ))}

        {/* Milestone threshold */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="gantt-milestone-threshold">
            Seuil de jalon (jours)
          </label>
          <input
            id="gantt-milestone-threshold"
            type="number"
            min={0}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={ganttOptions.milestoneThreshold ?? 0}
            onChange={(e) => onNumberChange('milestoneThreshold', Number(e.target.value))}
          />
        </div>

        {/* Show Weekends */}
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="rounded"
            checked={ganttOptions.showWeekends ?? true}
            onChange={(e) => onBooleanChange('showWeekends', e.target.checked)}
          />
          Afficher les week-ends
        </label>

        {/* Show Critical Path */}
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="rounded"
            checked={ganttOptions.showCriticalPath ?? false}
            onChange={(e) => onBooleanChange('showCriticalPath', e.target.checked)}
          />
          Afficher le chemin critique
        </label>
      </PopoverContent>
    </Popover>
  );
};
