'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { InboxStatus } from '@/lib/types';

export const STATUS_LABEL: Record<InboxStatus, string> = {
  good: 'Good to send',
  warming: 'Warming up',
  watch: 'Watch',
  burned: 'Burned',
  replacing: 'Replacing, free',
};

export function StatusPill({ status }: { status: InboxStatus }) {
  return <span className={`ui-pill ui-pill--${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <span className="ui-error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="ui-hint">{hint}</span>
      )}
    </div>
  );
}

export function Choice({
  type = 'radio',
  name,
  value,
  checked,
  onChange,
  title,
  desc,
  disabled,
}: {
  type?: 'radio' | 'checkbox';
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: React.ReactNode;
  desc?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={`ui-choice${type === 'checkbox' ? ' ui-choice--check' : ''}`}>
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
      />
      <span className="ui-choice__box" aria-hidden="true" />
      <span className="ui-stack" style={{ '--gap': '2px', minWidth: 0 } as React.CSSProperties}>
        <span className="ui-choice__title">{title}</span>
        {desc && <span className="ui-choice__desc">{desc}</span>}
      </span>
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="ui-modal"
      onClose={onClose}
      onClick={e => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
    >
      <div className="ui-modal__head">
        <h2 className="ui-h2" id="modal-title" style={{ fontSize: 26 }}>
          {title}
        </h2>
        <button type="button" className="ui-x" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="ui-modal__body">{open && children}</div>
    </dialog>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 3200);
  }, []);
  const node = msg ? (
    <div className="ui-toast" role="status">
      {msg}
    </div>
  ) : null;
  return [node, show] as const;
}

export const money = (n: number) => '$' + n.toLocaleString('en-US');

export const date = (t: number) =>
  new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function ago(t: number, now: number) {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return date(t);
}

/** Copy text, falling back to selecting it when the clipboard is unavailable. */
export async function copyText(text: string, fallback?: HTMLElement | null) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallback) {
      const r = document.createRange();
      r.selectNodeContents(fallback);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
    return false;
  }
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
