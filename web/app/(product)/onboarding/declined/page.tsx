'use client';

import { useRouter } from 'next/navigation';
import { FlowShell, Loading, useGuard } from '@/components/Flow';
import { money } from '@/components/ui';
import { planById } from '@/lib/plans';
import { useStore } from '@/lib/store';

export default function Declined() {
  const ok = useGuard('/onboarding/declined');
  const router = useRouter();
  const { state, reopenOnboarding } = useStore();
  if (!ok) return <Loading />;
  const reason = state.vetting?.result === 'declined' ? state.vetting.reason : '';
  const plan = planById(state.subscription!.plan);

  return (
    <FlowShell step={2}>
      <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <h1 className="ui-h1">We can&apos;t set this up for you</h1>
        <p className="ui-sub">{reason}</p>
      </div>
      <div className="ui-banner">
        <span>
          Your {money(plan.price)} payment will be refunded to your card ending {state.subscription!.card.last4} within 5 to 10 days.
        </span>
      </div>
      <div className="flow__actions">
        <button
          type="button"
          className="ui-btn ui-btn--ghost"
          onClick={() => {
            reopenOnboarding();
            router.push('/onboarding');
          }}
        >
          I picked the wrong answer
        </button>
      </div>
    </FlowShell>
  );
}
