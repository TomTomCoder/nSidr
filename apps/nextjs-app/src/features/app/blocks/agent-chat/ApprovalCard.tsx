'use client';

import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';

export interface ApprovalCardProps {
  conversationId: string;
  agentId: string;
  payload: { question: string; context?: string };
  onResolved: () => void;
}

type CardState = 'idle' | 'rejecting' | 'submitting' | 'accepted' | 'rejected' | 'error';

export function ApprovalCard({ conversationId, agentId, payload, onResolved }: ApprovalCardProps) {
  const [cardState, setCardState] = useState<CardState>('idle');
  const [rejectReason, setRejectReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const postDecision = async (decision: 'accept' | 'reject', reason?: string) => {
    setCardState('submitting');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/agent/${agentId}/conversation/${conversationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          decision === 'reject' ? { decision: 'reject', reason } : { decision: 'accept' }
        ),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
      }
      setCardState(decision === 'accept' ? 'accepted' : 'rejected');
      onResolved();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue');
      setCardState('error');
    }
  };

  const handleApprove = () => void postDecision('accept');
  const handleRejectSubmit = () => void postDecision('reject', rejectReason);

  return (
    <div className="my-2 rounded-lg border border-amber-200 bg-amber-50 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-amber-200 px-3 py-2 dark:border-amber-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Approbation requise
        </span>
      </div>

      {/* Question */}
      <div className="p-3">
        <p className="text-sm font-medium text-foreground">{payload.question}</p>
        {payload.context && <p className="mt-1 text-xs text-muted-foreground">{payload.context}</p>}
      </div>

      {/* Reject textarea */}
      {cardState === 'rejecting' && (
        <div className="border-t border-amber-200 px-3 py-2 dark:border-amber-800">
          <label className="mb-1 block text-xs text-muted-foreground">
            Raison du refus (optionnel)
          </label>
          <textarea
            className="w-full rounded border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Expliquez pourquoi vous refusez…"
          />
        </div>
      )}

      {/* Error */}
      {cardState === 'error' && (
        <div className="border-t border-destructive/20 px-3 py-2">
          <p className="text-xs text-destructive">{errorMsg}</p>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2 border-t border-amber-200 px-3 py-2 dark:border-amber-800">
        {(cardState === 'idle' || cardState === 'error') && (
          <>
            <Button size="sm" variant="outline" onClick={() => setCardState('rejecting')}>
              <XCircle className="mr-1 size-3" />
              Rejeter
            </Button>
            <Button size="sm" onClick={handleApprove}>
              <CheckCircle2 className="mr-1 size-3" />
              Approuver
            </Button>
          </>
        )}

        {cardState === 'rejecting' && (
          <>
            <Button size="sm" variant="ghost" onClick={() => setCardState('idle')}>
              Annuler
            </Button>
            <Button size="sm" variant="destructive" onClick={handleRejectSubmit}>
              Confirmer le refus
            </Button>
          </>
        )}

        {cardState === 'submitting' && (
          <Button size="sm" disabled>
            <Loader2 className="mr-1 size-3 animate-spin" />
            Traitement…
          </Button>
        )}

        {cardState === 'accepted' && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="size-4" />
            Approuvé
          </span>
        )}

        {cardState === 'rejected' && (
          <span className="flex items-center gap-1 text-sm text-destructive">
            <XCircle className="size-4" />
            Rejeté
          </span>
        )}
      </div>
    </div>
  );
}

export default ApprovalCard;
