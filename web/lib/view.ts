'use client';

import { planById } from './plans';
import { dailyCap, sentToday, setupProgress } from './sim';
import { useStore } from './store';
import type { InboxStatus } from './types';

/** Derived numbers every app screen needs. Only call once the guard has passed. */
export function useView() {
  const store = useStore();
  const { state, now } = store;
  const sub = state.subscription!;
  const plan = planById(sub.plan);
  const progress = setupProgress(state.setupStartedAt, now);
  const counts: Record<InboxStatus, number> = { good: 0, warming: 0, watch: 0, burned: 0, replacing: 0 };
  for (const b of state.inboxes) counts[b.status]++;
  const total = state.inboxes.length;
  const cap = dailyCap(plan, state.account!.createdAt, now);
  const fullCap = plan.perDay;
  const sent = total ? sentToday(cap, counts.good / total, now) : 0;
  const ready = progress.done && total > 0;
  const firstName = state.account!.name.split(' ')[0];
  return { ...store, sub, plan, progress, counts, total, cap, fullCap, sent, ready, firstName };
}
