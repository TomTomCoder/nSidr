'use client';

import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isDisabled: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isDisabled,
  placeholder = 'Écrire un message…',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // "Demander" CTA in the profile panel focuses this input
  useEffect(() => {
    const focus = () => ref.current?.focus();
    window.addEventListener('agent:focus-chat', focus);
    return () => window.removeEventListener('agent:focus-chat', focus);
  }, []);

  const submit = () => {
    if (input.trim() && !isDisabled) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="ai-gradient-ring overflow-hidden rounded-xl p-[1.5px]">
      <div className="rounded-[10px] bg-background dark:bg-[color-mix(in_oklab,white_5%,hsl(var(--background)))]">
        <Textarea
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={isDisabled}
          placeholder={placeholder}
          rows={1}
          className="max-h-[160px] min-h-[44px] resize-none border-0 bg-transparent px-4 pb-1 pt-3 text-sm shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-end px-3 pb-2.5">
          <button
            type="button"
            onClick={submit}
            disabled={isDisabled || !input.trim()}
            className="flex size-7 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-25"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5,#0ea5e9)' }}
          >
            {isDisabled ? (
              <Loader2 className="size-3.5 animate-spin" style={{ color: '#fff' }} />
            ) : (
              <Send className="size-3" style={{ color: '#fff' }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
