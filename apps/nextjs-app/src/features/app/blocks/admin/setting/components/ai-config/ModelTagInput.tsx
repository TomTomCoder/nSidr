import { X } from 'lucide-react';
import { useRef, useState } from 'react';

interface IModelTagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ModelTagInput = ({
  value,
  onChange,
  placeholder = 'Entrez un modèle et appuyez sur Entrée',
  disabled,
}: IModelTagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const tags = value
    ? value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed].join(',');
    onChange(next);
  };

  const removeTag = (index: number) => {
    const next = tags.filter((_, i) => i !== index).join(',');
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div
      className="flex min-h-9 w-full cursor-text flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-mono"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue);
            setInputValue('');
          }
        }}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
};
