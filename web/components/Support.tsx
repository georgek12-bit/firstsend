'use client';

// Support tickets, shared by the customer's /app/support and the admin's /admin/support.
// Reads straight from Supabase (RLS limits customers to their own); writes go through RPCs.
import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from '@/lib/store';
import { getSupabase } from '@/lib/supabase';
import type { Inbox } from '@/lib/types';
import { Field, ago } from './ui';

export type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  inbox_id: string | null;
  status: 'open' | 'closed';
  waiting_on: 'admin' | 'customer';
  created_at: string;
  updated_at: string;
  inbox: { addr: string } | null;
  customer?: { name: string; email: string } | null;
};

type Message = { id: string; from_admin: boolean; author_name: string; body: string; created_at: string };

export const CATEGORIES = [
  { id: 'inbox', label: 'An inbox has a problem' },
  { id: 'deliverability', label: 'Deliverability or bounces' },
  { id: 'setup', label: 'Setup or domains' },
  { id: 'billing', label: 'Billing' },
  { id: 'other', label: 'Something else' },
];
export const categoryLabel = (id: string) => CATEGORIES.find(c => c.id === id)?.label ?? id;

const ms = (t: string) => new Date(t).getTime();

function usePoll(fn: () => void, every: number) {
  useEffect(() => {
    fn();
    const t = setInterval(() => document.visibilityState === 'visible' && fn(), every);
    return () => clearInterval(t);
  }, [fn, every]);
}

export function useTickets(admin: boolean) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from('support_tickets')
      .select(admin ? '*, inbox:inboxes(addr), customer:profiles(name, email)' : '*, inbox:inboxes(addr)')
      .order('updated_at', { ascending: false });
    if (error) console.error(error);
    else setTickets(data as unknown as Ticket[]);
  }, [admin]);
  usePoll(load, 20_000);
  return { tickets, reload: load };
}

export function TicketList({ tickets, selected, onSelect, admin }: { tickets: Ticket[]; selected?: string | null; onSelect: (id: string) => void; admin?: boolean }) {
  const now = Date.now();
  if (!tickets.length) return <p className="ui-muted ui-small">No tickets yet.</p>;
  return (
    <div className="tickets" role="list">
      {tickets.map(t => {
        const needsYou = t.status === 'open' && t.waiting_on === (admin ? 'admin' : 'customer');
        return (
          <button key={t.id} type="button" role="listitem" className="ticket" aria-current={t.id === selected ? 'true' : undefined} onClick={() => onSelect(t.id)}>
            <span className="ui-between" style={{ gap: 8 }}>
              <span className="truncate" style={{ fontWeight: 600 }}>
                {t.subject}
              </span>
              {needsYou ? (
                <span className="ui-tag ui-tag--orange">{admin ? 'Needs reply' : 'New reply'}</span>
              ) : (
                <span className="ui-tag">{t.status === 'closed' ? 'Closed' : 'Open'}</span>
              )}
            </span>
            <span className="ui-small ui-muted truncate">
              {admin && t.customer ? `${t.customer.name || t.customer.email} · ` : ''}
              {categoryLabel(t.category)}
              {t.inbox ? ` · ${t.inbox.addr}` : ''} · {ago(ms(t.updated_at), now)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Thread({ ticket, admin, onChange }: { ticket: Ticket; admin?: boolean; onChange: () => void }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from('support_messages').select('*').eq('ticket_id', ticket.id).order('created_at');
    if (error) console.error(error);
    else setMessages(data as Message[]);
  }, [ticket.id]);
  usePoll(load, 10_000);
  useEffect(() => end.current?.scrollIntoView({ block: 'nearest' }), [messages?.length]);

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const { error } = await getSupabase().rpc(fn, args);
      if (error) throw new Error(error.message);
      await load();
      onChange();
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    if (await rpc('post_support_message', { p_ticket: ticket.id, p_body: body })) setBody('');
  };

  const now = Date.now();
  return (
    <section className="ui-card ui-stack" aria-labelledby="thread-h" style={{ '--gap': '16px' } as React.CSSProperties}>
      <div className="ui-between" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div className="ui-stack" style={{ '--gap': '4px', minWidth: 0 } as React.CSSProperties}>
          <h2 id="thread-h" className="ui-h3">
            {ticket.subject}
          </h2>
          <span className="ui-small ui-muted">
            {admin && ticket.customer ? `${ticket.customer.name} <${ticket.customer.email}> · ` : ''}
            {categoryLabel(ticket.category)}
            {ticket.inbox ? ` · ${ticket.inbox.addr}` : ''}
          </span>
        </div>
        <button
          type="button"
          className="ui-btn ui-btn--ghost ui-btn--sm"
          disabled={busy}
          onClick={() => rpc('set_ticket_status', { p_ticket: ticket.id, p_status: ticket.status === 'open' ? 'closed' : 'open' })}
        >
          {ticket.status === 'open' ? 'Mark resolved' : 'Reopen'}
        </button>
      </div>

      <div className="chat" aria-live="polite">
        {!messages && <p className="ui-muted ui-small">Loading…</p>}
        {messages?.map(m => {
          const mine = m.from_admin === !!admin;
          return (
            <div key={m.id} className={`chat__msg${mine ? ' chat__msg--mine' : ''}`}>
              <span className="chat__meta">
                {m.from_admin ? (admin ? m.author_name || 'Support' : 'Firstsend support') : admin ? m.author_name || 'Customer' : 'You'} · {ago(ms(m.created_at), now)}
              </span>
              <p className="chat__body">{m.body}</p>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      <form className="ui-stack" style={{ '--gap': '10px' } as React.CSSProperties} onSubmit={send}>
        <Field id="reply" label={admin ? 'Reply to the customer' : 'Your message'} error={error}>
          <textarea
            id="reply"
            className="ui-input"
            rows={3}
            maxLength={5000}
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && send(e)}
          />
        </Field>
        <div className="ui-row">
          <button type="submit" className="ui-btn ui-btn--orange" disabled={busy || !body.trim()}>
            {busy ? 'Sending…' : 'Send'}
          </button>
          {!admin && <span className="ui-small ui-muted">We reply by email and here, usually within a few hours on weekdays.</span>}
        </div>
      </form>
    </section>
  );
}

export function NewTicket({ inboxes, initialInbox, onCreated, onCancel }: { inboxes: Inbox[]; initialInbox?: string | null; onCreated: (id: string) => void; onCancel?: () => void }) {
  const [category, setCategory] = useState('inbox');
  const [inbox, setInbox] = useState(initialInbox ?? '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aboutInbox = category === 'inbox' || category === 'deliverability';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError('Add a short subject and tell us what is happening.');
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error } = await getSupabase().rpc('open_ticket', {
      p_subject: subject,
      p_category: category,
      p_inbox: aboutInbox && inbox ? inbox : null,
      p_body: body,
    });
    if (error) {
      setError(errorText(new Error(error.message)));
      setBusy(false);
      return;
    }
    onCreated(data as string);
  };

  return (
    <form className="ui-card ui-stack" style={{ '--gap': '16px' } as React.CSSProperties} onSubmit={submit} noValidate>
      <h2 className="ui-h3">New ticket</h2>
      <Field id="category" label="What is it about?">
        <select id="category" className="ui-select" value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      {aboutInbox && inboxes.length > 0 && (
        <Field id="inbox" label="Which inbox? (optional)">
          <select id="inbox" className="ui-select" value={inbox} onChange={e => setInbox(e.target.value)}>
            <option value="">Not about one inbox</option>
            {inboxes.map(b => (
              <option key={b.id} value={b.id}>
                {b.addr}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field id="subject" label="Subject">
        <input id="subject" className="ui-input" maxLength={140} value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Bounces from one domain" />
      </Field>
      <Field id="body" label="What is happening?" error={error}>
        <textarea id="body" className="ui-input" rows={5} maxLength={5000} value={body} onChange={e => setBody(e.target.value)} />
      </Field>
      <div className="ui-row">
        <button type="submit" className="ui-btn ui-btn--orange" disabled={busy}>
          {busy ? 'Sending…' : 'Send to support'}
        </button>
        {onCancel && (
          <button type="button" className="ui-link ui-small" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
