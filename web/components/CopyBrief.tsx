'use client';

import { useEffect, useRef, useState } from 'react';
import { copyText } from '@/components/ui';
import { CTAS, EMPTY_BRIEF, QUESTIONS, SENDING_TIPS, writeSequence, type Brief, type Email } from '@/lib/copywriter';

const STORE = 'firstsend.copyBrief.v2';
const STEPS = QUESTIONS.length + 1; // + the CTA choice

function load(): Brief | null {
  try {
    const v = localStorage.getItem(STORE);
    return v ? { ...EMPTY_BRIEF, ...JSON.parse(v) } : null;
  } catch {
    return null;
  }
}
function save(b: Brief) {
  try {
    localStorage.setItem(STORE, JSON.stringify(b));
  } catch {}
}

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
  const [brief, setBrief] = useState<Brief>(EMPTY_BRIEF);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Come back to your copy: answers are kept in this browser.
  useEffect(() => {
    const b = load();
    if (b && b.audience && b.result && b.offer) {
      setBrief(b);
      setDone(true);
    }
  }, []);

  useEffect(() => {
    if (!done) inputRef.current?.focus();
  }, [step, done]);

  const isCta = step === QUESTIONS.length;
  const q = QUESTIONS[step];
  const value = q ? brief[q.key] : '';
  const canNext = isCta || q.optional || value.trim().length > 1;
  const copied = (ok: boolean) => onToast(ok ? 'Copied to clipboard.' : 'Selected. Press Ctrl+C or Cmd+C to copy.');

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canNext) return;
    if (isCta) {
      save(brief);
      setDone(true);
      onToast('Your sequence is ready.');
    } else setStep(step + 1);
  };

  if (done) {
    const emails = writeSequence(brief);
    return (
      <div className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <div className="ui-between">
          <p className="ui-muted ui-small">Built from your answers. Edit anything after you paste it into your sequencer.</p>
          <button
            type="button"
            className="ui-btn ui-btn--ghost ui-btn--sm"
            onClick={() => {
              setStep(0);
              setDone(false);
            }}
          >
            Edit answers
          </button>
        </div>
        <div className="kit-grid">
          {emails.map(e => (
            <EmailCard key={e.label} e={e} onCopy={copied} />
          ))}
        </div>
        <div className="ui-card ui-card--soft ui-stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <span className="ui-label">Before you send</span>
          <ul className="ui-stack" style={{ '--gap': '6px', paddingLeft: 18, margin: 0 } as React.CSSProperties}>
            {SENDING_TIPS.map(t => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <form className="ui-card ui-stack brief" style={{ '--gap': '18px' } as React.CSSProperties} onSubmit={next} noValidate>
      <span className="ui-label">
        Question {step + 1} of {STEPS}
        {q?.optional ? ' · optional' : ''}
      </span>
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
          {isCta ? 'Write my sequence' : q.optional && !value.trim() ? 'Skip' : 'Next'}
        </button>
      </div>
    </form>
  );
}
