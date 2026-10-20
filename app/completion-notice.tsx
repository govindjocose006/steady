'use client';

import {Check, X} from 'lucide-react';
import type {CSSProperties} from 'react';
import type {CompletionFeedback} from '@/lib/completion-feedback';
import {useEffects} from './effects-preference';

export default function CompletionNotice({feedback, busy, onUndo, onDismiss}: {feedback: CompletionFeedback; busy: boolean; onUndo?: () => void; onDismiss: () => void}) {
  const {reduced} = useEffects();
  return <aside className={'completion-notice' + (feedback.milestone ? ' milestone-notice' : '')} aria-label="Completion feedback">
    {!reduced && feedback.milestone && <div className="celebration-particles" aria-hidden="true">{Array.from({length: 14}, (_, i) => <i key={i} style={{'--piece': i, '--drift': `${(i % 2 ? 1 : -1) * (24 + i * 7)}px`} as CSSProperties}/>)}</div>}
    <span className="completion-tick" aria-hidden="true"><Check size={24}/></span>
    <div className="completion-copy" role="status" aria-live="polite" aria-atomic="true"><strong>{feedback.milestone || 'A little progress, saved.'}</strong><span>{feedback.title}</span>{feedback.points > 0 && <b className="completion-points">+{feedback.points} points</b>}</div>
    <div className="completion-actions">{onUndo && <button className="text-button" disabled={busy} onClick={onUndo}>Undo</button>}<button className="icon-button" aria-label="Dismiss completion message" onClick={onDismiss}><X size={17}/></button></div>
  </aside>;
}
