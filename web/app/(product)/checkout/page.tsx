'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { FlowShell, Loading, useGuard } from '@/components/Flow';
import PlanSummary from '@/components/PlanSummary';
import { CardFields, cardFrom, validateCard } from '@/components/CardFields';
import { Choice, money } from '@/components/ui';
import { PLANS, fmt, type PlanId } from '@/lib/plans';
import { errorText, useStore } from '@/lib/store';

function Checkout() {
  const ok = useGuard('/checkout');
  const params = useSearchParams();
  const router = useRouter();
  const { checkout } = useStore();
  const [plan, setPlan] = useState<PlanId>(PLANS.find(p => p.id === params.get('plan'))?.id ?? PLANS[0].id);
  const [card, setCard] = useState({ number: '', exp: '', cvc: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);

  if (!ok) return <Loading />;

  const price = PLANS.find(p => p.id === plan)!.price;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateCard(card);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setPaying(true);
    checkout(plan, cardFrom(card))
      .then(() => router.push('/onboarding'))
      .catch(err => {
        setErrors({ form: errorText(err) });
        setPaying(false);
      });
  };

  return (
    <FlowShell step={1} aside={<PlanSummary planId={plan} note="You'll be charged today, then every 30 days. Cancel anytime from Billing." />}>
      <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <h1 className="ui-h1">Payment</h1>
        <p className="ui-sub">Pay by card. Setup starts as soon as you finish the next two quick steps.</p>
      </div>
      <form className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties} onSubmit={submit} noValidate>
        <fieldset className="ui-fieldset">
          <legend className="ui-legend" style={{ marginBottom: 8 }}>
            Plan
          </legend>
          <div className="ui-choices">
            {PLANS.map(p => (
              <Choice
                key={p.id}
                name="plan"
                value={p.id}
                checked={plan === p.id}
                onChange={v => setPlan(v as PlanId)}
                title={`${p.name} · ${money(p.price)}/mo`}
                desc={`${fmt(p.perDay)} emails a day`}
              />
            ))}
          </div>
        </fieldset>
        <CardFields value={card} onChange={setCard} errors={errors} />
        {errors.form && (
          <p className="ui-error" role="alert">
            {errors.form}
          </p>
        )}
        <div className="flow__actions">
          <button type="submit" className="ui-btn ui-btn--orange" disabled={paying}>
            {paying ? 'Processing…' : `Pay ${money(price)} and continue`}
          </button>
          <span className="ui-small ui-muted">Demo checkout. No real charge. Stripe plugs in here.</span>
        </div>
      </form>
    </FlowShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}
