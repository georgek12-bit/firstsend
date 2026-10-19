'use client';

// Live data layer: Supabase auth (email sign-in links) and database.
// Reads go straight to tables (row level security limits them to the signed-in customer);
// every write is a database function, see supabase/migrations.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlanId } from '../plans';
import { getSupabase, siteUrl } from '../supabase';
import { EMPTY, type Actions, type Ctx } from '../state';
import type { Business, ClientCount, Inbox, LeadSource, SequencerId, SetupStage, State, UseCase } from '../types';

const ms = (t: string | null | undefined) => (t ? new Date(t).getTime() : 0);

/* eslint-disable @typescript-eslint/no-explicit-any */
function toState(uid: string, r: Record<string, any>): State {
  const p = r.profile;
  const s = r.subscription;
  const b = r.business;
  return {
    ...EMPTY,
    account: p ? { name: p.name, email: p.email, createdAt: ms(p.created_at), loggedIn: true } : null,
    subscription: s
      ? {
          plan: s.plan,
          status: s.status,
          startedAt: ms(s.started_at),
          renewsAt: ms(s.renews_at),
          card: { brand: s.card_brand ?? 'Card', last4: s.card_last4 ?? '••••', exp: s.card_exp ?? '' },
          pendingPlan: s.pending_plan ?? undefined,
        }
      : null,
    business: b
      ? {
          company: b.company,
          website: b.website,
          clients: b.clients as ClientCount,
          useCase: b.use_case as UseCase,
          leadSource: b.lead_source as LeadSource,
          sequencer: b.sequencer,
        }
      : null,
    vetting: !b?.vetting_result
      ? null
      : b.vetting_result === 'approved'
        ? { result: 'approved' }
        : { result: 'declined', reason: b.vetting_reason ?? '' },
    domains: r.domains.length ? { names: r.domains.map((d: any) => d.name), byod: r.domains.some((d: any) => d.byod) } : null,
    setupStartedAt: s?.setup_started_at ? ms(s.setup_started_at) : null,
    setupStage: (s?.setup_stage as SetupStage | null) ?? null,
    inboxes: r.inboxes.map(
      (i: any): Inbox => ({
        id: i.id,
        addr: i.addr,
        domain: i.domain,
        status: i.status,
        createdAt: ms(i.created_at),
        readyAt: ms(i.ready_at),
        replaceRequestedAt: i.replace_requested_at ? ms(i.replace_requested_at) : undefined,
      }),
    ),
    replacements: r.replacements.map((x: any) => ({
      id: x.id,
      oldAddr: x.old_addr,
      newAddr: x.new_addr ?? undefined,
      requestedAt: ms(x.requested_at),
      doneAt: x.done_at ? ms(x.done_at) : undefined,
    })),
    connections: r.connections.map((c: any) => ({ sequencer: c.sequencer, at: ms(c.at), inboxes: c.inboxes })),
    invoices: r.invoices.map((v: any) => ({ id: v.id, at: ms(v.at), amount: v.amount, label: v.label, url: v.url ?? undefined })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const LOGGED_OUT: State = { ...EMPTY, setupStage: null };

function check<T extends { error: { message: string } | null }>(res: T): T {
  if (res.error) throw new Error(res.error.message);
  return res;
}

export function useLiveBackend(): Ctx {
  const sb = getSupabase();
  const [state, setState] = useState<State>(LOGGED_OUT);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const uidRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const {
      data: { session },
    } = await sb.auth.getSession();
    const uid = session?.user.id ?? null;
    uidRef.current = uid;
    if (!uid) {
      setState(LOGGED_OUT);
      setIsAdmin(false);
      setReady(true);
      return;
    }
    // Filter by user: admins can read everyone's rows.
    const [profile, subscription, business, domains, inboxes, replacements, connections, invoices] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('subscriptions').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('businesses').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('domains').select('*').eq('user_id', uid).order('created_at'),
      sb.from('inboxes').select('*').eq('user_id', uid).order('addr'),
      sb.from('replacements').select('*').eq('user_id', uid).order('requested_at', { ascending: false }),
      sb.from('connections').select('*').eq('user_id', uid),
      sb.from('invoices').select('*').eq('user_id', uid).order('at', { ascending: false }),
    ]);
    const failed = [profile, subscription, business, domains, inboxes, replacements, connections, invoices].find(x => x.error);
    if (failed) {
      console.error(failed.error);
      setReady(true);
      return;
    }
    setIsAdmin(Boolean(profile.data?.is_admin));
    setState(
      toState(uid, {
        profile: profile.data,
        subscription: subscription.data,
        business: business.data,
        domains: domains.data,
        inboxes: inboxes.data,
        replacements: replacements.data,
        connections: connections.data,
        invoices: invoices.data,
      }),
    );
    setReady(true);
  }, [sb]);

  useEffect(() => {
    refresh();
    // Don't call Supabase inside this callback directly; defer it.
    const { data: sub } = sb.auth.onAuthStateChange(() => setTimeout(refresh, 0));
    const tick = setInterval(() => setNow(Date.now()), 1000);
    // Pick up changes an admin makes (setup progress, inbox health).
    const poll = setInterval(() => document.visibilityState === 'visible' && refresh(), 20_000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      sub.subscription.unsubscribe();
      clearInterval(tick);
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
    };
  }, [sb, refresh]);

  const actions = useMemo<Actions>(() => {
    // Calls a Supabase Edge Function and returns its JSON, surfacing its { error } message.
    const fn = async (name: string, body: Record<string, unknown>) => {
      const { data, error } = await sb.functions.invoke(name, { body });
      if (error) {
        let msg = error.message;
        try {
          msg = (await (error as { context?: Response }).context?.json())?.error ?? msg;
        } catch {}
        throw new Error(msg);
      }
      return data as { url: string };
    };
    const rpc = async (fn: string, args?: Record<string, unknown>) => {
      const res = check(await sb.rpc(fn, args));
      await refresh();
      return res.data;
    };
    return {
      signup: async ({ name, email, plan }) => {
        check(
          await sb.auth.signInWithOtp({
            email: email.trim().toLowerCase(),
            options: { data: { name: name.trim() }, emailRedirectTo: siteUrl(`/checkout/?plan=${plan}`) },
          }),
        );
        return { sent: true };
      },
      login: async email => {
        const { error } = await sb.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: { shouldCreateUser: false, emailRedirectTo: siteUrl('/app/') },
        });
        if (error) {
          if (/signups not allowed|not found/i.test(error.message)) return 'not_found';
          throw new Error(error.message);
        }
        return 'sent';
      },
      logout: async () => {
        await sb.auth.signOut();
        await refresh();
      },
      checkout: async (plan: PlanId, card) => {
        await rpc('start_subscription', { p_plan: plan, p_brand: card.brand, p_last4: card.last4, p_exp: card.exp });
      },
      startCheckout: async (plan: PlanId) => {
        const { url } = await fn('create-checkout', { plan, returnUrl: siteUrl('') });
        window.location.assign(url);
      },
      openBillingPortal: async () => {
        const { url } = await fn('billing-portal', { returnUrl: siteUrl('/app/billing/') });
        window.location.assign(url);
      },
      submitBusiness: async (b: Business) => {
        const result = await rpc('submit_business', {
          p_company: b.company,
          p_website: b.website,
          p_clients: b.clients,
          p_use_case: b.useCase,
          p_lead_source: b.leadSource,
          p_sequencer: b.sequencer,
        });
        return result === 'approved' ? { result: 'approved' } : { result: 'declined', reason: '' };
      },
      reopenOnboarding: async () => void (await rpc('reopen_onboarding')),
      chooseDomains: async (names, byod) => void (await rpc('choose_domains', { p_names: names, p_byod: byod })),
      requestReplacement: async id => void (await rpc('request_replacement', { p_inbox: id })),
      connect: async (seq: SequencerId) => {
        const uid = uidRef.current;
        check(
          await sb
            .from('connections')
            .upsert({ user_id: uid, sequencer: seq, at: new Date().toISOString(), inboxes: state.inboxes.length }),
        );
        await refresh();
      },
      disconnect: async seq => {
        check(await sb.from('connections').delete().eq('user_id', uidRef.current).eq('sequencer', seq));
        await refresh();
      },
      changePlan: async plan => (await rpc('change_plan', { p_plan: plan })) as 'upgraded' | 'scheduled' | 'unchanged',
      cancel: async () => void (await rpc('set_subscription_status', { p_status: 'canceled' })),
      resume: async () => void (await rpc('set_subscription_status', { p_status: 'active' })),
      updateCard: async card => void (await rpc('update_card', { p_brand: card.brand, p_last4: card.last4, p_exp: card.exp })),
      updateAccount: async ({ name, email }) => {
        await rpc('update_profile', { p_name: name });
        const next = email.trim().toLowerCase();
        if (next !== state.account?.email) {
          // Supabase emails a confirmation link; the change applies once it's clicked.
          check(await sb.auth.updateUser({ email: next }, { emailRedirectTo: siteUrl('/app/settings/') }));
          return { emailPending: true };
        }
        return { emailPending: false };
      },
      updateBusiness: async b => void (await rpc('update_business', { p_company: b.company, p_website: b.website, p_sequencer: b.sequencer })),
      demo: { skipWarmup() {}, burnOne() {}, advanceMonth() {}, reset() {} },
    };
  }, [sb, refresh, state.inboxes.length, state.account?.email]);

  return { state, now, ready, live: true, isAdmin, refresh, ...actions };
}
