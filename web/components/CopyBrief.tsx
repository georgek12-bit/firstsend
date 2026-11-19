'use client';

import { useEffect, useRef, useState } from 'react';
import { copyText } from '@/components/ui';
import { CTAS, EMPTY_BRIEF, QUESTIONS, writeSequence, type Brief, type Email } from '@/lib/copywriter';

// Sequences are kept in this browser only (no account storage needed for templates).
const STORE = 'firstsend.copySequences';
const OLD_STORE = 'firstsend.copyBrief.v2';
const STEPS = QUESTIONS.length + 1; // + the CTA choice

type Saved = { id: string; brief: Brief; at: number };

function loadAll(): Saved[] {
  try {
    const v = localStorage.getItem(STORE);
    if (v) return (JSON.parse(v) as Saved[]).map(s => ({ ...s, brief: { ...EMPTY_BRIEF, ...s.brief } }));
    // Carry over a sequence made before multiple sequences existed.
    const old = localStorage.getItem(OLD_STORE);
    if (old) return [{ id: String(Date.now()), brief: { ...EMPTY_BRIEF, ...JSON.parse(old) }, at: Date.now() }];
  } catch {}
  return [];
}
function saveAll(list: Saved[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(list));
    localStorage.removeItem(OLD_STORE);
  } catch {}
}
const nameOf = (b: Brief) => b.audience.trim() || 'Untitled sequence';

function EmailCard({ e, onCopy }: { e: Email; onCopy: (ok: boolean) => void }) {
  const ref = useRef<HTMLPreElement>(null);
  const full = e.subject ? `Subject: ${e.subject}\n\n${e.body}` : e.body;
  return (
    <article className="ui-card template">
      <div className="ui-between">
        <span className="ui-label">{e.label}</span>
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={async () => onCopy(await copyText(full, ref.current))}>
          Copy
        </button>
      </div>
      <pre ref={ref}>
        <span className="ui-label" style={{ display: 'block', marginBottom: 8 }}>
          {e.subject ? `Subject: ${e.subject}` : 'Reply in the same thread'}
        </span>
        {e.body}
      </pre>
      <p className="ui-small ui-muted">{e.why}</p>
    </article>
  );
}

export default function CopyBrief({ onToast }: { onToast: (m: string) => void }) {
  const [list, setList] = useState<Saved[]>([]);
  const [current, setCurrent] = useState<string | null>(null); // sequence being viewed or edited
  const [brief, setBrief] = useState<Brief>(EMPTY_BRIEF);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const all = loadAll();
    setList(all);
    if (all.length) {
      setCurrent(all[0].id);
      setBrief(all[0].brief);
      setEditing(false);
    }
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [step, editing]);

  const isCta = step === QUESTIONS.length;
  const q = QUESTIONS[step];
  const value = q ? brief[q.key] : '';
  const canNext = isCta || q.optional || value.trim().length > 1;
  const copied = (ok: boolean) => onToast(ok ? 'Copied to clipboard.' : 'Selected. Press Ctrl+C or Cmd+C to copy.');

  const persist = (next: Saved[]) => {
    setList(next);
    saveAll(next);
  };

  const open = (s: Saved) => {
    setCurrent(s.id);
    setBrief(s.brief);
    setEditing(false);
  };

  const startNew = () => {
    setCurrent(null);
    setBrief(EMPTY_BRIEF);
    setStep(0);
    setEditing(true);
  };

  const edit = () => {
    setStep(0);
    setEditing(true);
  };

  const remove = () => {
    const s = list.find(x => x.id === current);
    if (!s || !window.confirm(`Delete the sequence for ${nameOf(s.brief)}? This can't be undone.`)) return;
    const rest = list.filter(x => x.id !== current);
    persist(rest);
    onToast('Sequence deleted.');
    if (rest.length) open(rest[0]);
    else startNew();
  };

  const cancel = () => {
    const s = list.find(x => x.id === current) ?? list[0];
    if (s) open(s);
  };

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canNext) return;
    if (!isCta) return setStep(step + 1);
    const id = current ?? String(Date.now());
    const saved: Saved = { id, brief, at: Date.now() };
    persist(current ? list.map(x => (x.id === id ? saved : x)) : [saved, ...list]);
    setCurrent(id);
    setEditing(false);
    onToast(current ? 'Sequence updated.' : 'Your sequence is ready.');
  };

  if (!editing && current) {
    const emails = writeSequence(brief);
    return (
      <div className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        {list.length > 1 && (
          <div className="filters" role="group" aria-label="Your sequences">
            {list.map(s => (
              <button key={s.id} type="button" aria-pressed={s.id === current} onClick={() => open(s)}>
                {nameOf(s.brief)}
              </button>
            ))}
          </div>
        )}
        <div className="ui-between">
          <p className="ui-muted ui-small">Built from your answers. Edit anything after you paste it into your sequencer.</p>
          <div className="seq-actions">
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={edit}>
              Edit answers
            </button>
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={remove}>
              Delete
            </button>
            <button type="button" className="ui-btn ui-btn--sm" onClick={startNew}>
              New sequence
            </button>
          </div>
        </div>
        <div className="kit-grid">
          {emails.map(e => (
            <EmailCard key={e.label} e={e} onCopy={copied} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form className="ui-card ui-stack brief" style={{ '--gap': '18px' } as React.CSSProperties} onSubmit={next} noValidate>
      <div className="ui-between">
        <span className="ui-label">
          Question {step + 1} of {STEPS}
          {q?.optional ? ' · optional' : ''}
        </span>
        {!!list.length && (
          <button type="button" className="ui-link ui-small" onClick={cancel}>
            Cancel
          </button>
        )}
      </div>
      <div className="ui-progress" aria-hidden="true">
        <span style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
      </div>

      {isCta ? (
        <fieldset className="ui-fieldset">
          <legend className="brief__q">What do you want them to do?</legend>
          <div className="ui-choices" style={{ '--min': '220px' } as React.CSSProperties}>
            {CTAS.map(c => (
              <label key={c.v} className="ui-choice">
                <input type="radio" name="cta" value={c.v} checked={brief.cta === c.v} onChange={() => setBrief(b => ({ ...b, cta: c.v }))} />
                <span className="ui-choice__box" aria-hidden="true" />
                <span className="ui-stack" style={{ '--gap': '2px', minWidth: 0 } as React.CSSProperties}>
                  <span className="ui-choice__title">{c.l}</span>
                  <span className="ui-choice__desc">{c.d}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="ui-field">
          <label htmlFor={`brief-${q.key}`} className="brief__q">
            {q.q}
          </label>
          <span className="ui-hint">{q.hint}</span>
          <div className="brief__line">
            <span className="brief__lead" aria-hidden="true">
              {q.lead}
            </span>
            <input
              id={`brief-${q.key}`}
              ref={inputRef}
              className="ui-input"
              value={value}
              placeholder={q.placeholder}
              onChange={e => setBrief(b => ({ ...b, [q.key]: e.target.value }))}
            />
            {q.tail && (
              <span className="brief__lead" aria-hidden="true">
                {q.tail}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="ui-between">
        <button type="button" className="ui-btn ui-btn--ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </button>
        <button type="submit" className={`ui-btn${isCta ? ' ui-btn--orange' : ''}`} disabled={!canNext}>
          {isCta ? (current ? 'Update my sequence' : 'Write my sequence') : q.optional && !value.trim() ? 'Skip' : 'Next'}
        </button>
      </div>
    </form>
  );
}
