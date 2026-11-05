'use client';

import { OFFER, captureOffer, clearOffer } from '@/lib/offer';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FlowShell, Loading, useGuard } from '@/components/Flow';
import PlanSummary from '@/components/PlanSummary';
import { CardFields, cardFrom, validateCard } from '@/components/CardFields';
import { Choice, money } from '@/components/ui';
import { PLANS, fmt, type PlanId } from '@/lib/plans';
import { asset } from '@/lib/asset';
import { errorText, useStore } from '@/lib/store';

function Checkout() {
  const ok = useGuard('/checkout');
  const params = useSearchParams();
  const router = useRouter();
  const { checkout, startCheckout, live, refresh } = useStore();
  const returning = params.get('status') === 'success';
  const [offer] = useState(() => captureOffer(params));
  const [plan, setPlan] = useState<PlanId>(offer ? 'growth' : (PLANS.find(p => p.id === params.get('plan'))?.id ?? PLANS[0].id));
  const [card, setCard] = useState({ number: '', exp: '', cvc: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);

  // Back from Stripe: the webhook may take a few seconds. Keep checking; the guard moves
  // people on to onboarding as soon as the subscription shows up.
  useEffect(() => {
    if (!live || !returning) return;
    clearOffer();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [live, returning, refresh]);

  if (!ok) return <Loading />;

  if (live && returning) {
    return (
      <FlowShell step={1}>
        <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties} aria-live="polite">
          <h1 className="ui-h1">Confirming your payment…</h1>
          <p className="ui-sub">This takes a few seconds. You&apos;ll move on to the next step automatically.</p>
        </div>
      </FlowShell>
    );
  }

  const price = PLANS.find(p => p.id === plan)!.price;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (live) {
      setPaying(true);
      startCheckout(plan, offer).catch(err => {
        setErrors({ form: errorText(err) });
        setPaying(false);
      });
      return;
    }
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
    <FlowShell
      step={1}
      aside={
        <PlanSummary
          planId={plan}
          offer={!!offer}
          note={
            offer && live
              ? 'Your private offer is applied on the Stripe page. Your card is saved today and billed when the free month ends.'
              : "You'll be charged today, then every 30 days. Cancel anytime from Billing."
          }
        />
      }
    >
      <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <h1 className="ui-h1">Payment</h1>
        <p className="ui-sub">
          {live
            ? "You'll pay on Stripe's secure page, then come straight back to finish setup."
            : 'Pay by card. Setup starts as soon as you finish the next two quick steps.'}
        </p>
      </div>
      <form className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties} onSubmit={submit} noValidate>
        <fieldset className="ui-fieldset">
          <legend className="ui-legend" style={{ marginBottom: 8 }}>
            Plan
          </legend>
          <div className="ui-choices">
            {PLANS.filter(p => !offer || p.id === OFFER.plan).map(p => (
              <Choice
                key={p.id}
                name="plan"
                value={p.id}
                checked={plan === p.id}
                onChange={v => setPlan(v as PlanId)}
                title={offer ? `${p.name} · ${money(OFFER.price)}/mo` : `${p.name} · ${money(p.price)}/mo`}
                desc={offer ? `${fmt(p.perDay)} emails a day · first month free` : `${fmt(p.perDay)} emails a day`}
              />
            ))}
          </div>
        </fieldset>
        {!live && <CardFields value={card} onChange={setCard} errors={errors} />}
        {errors.form && (
          <p className="ui-error" role="alert">
            {errors.form}
          </p>
        )}
        <div className="flow__actions">
          <button type="submit" className="ui-btn ui-btn--orange" disabled={paying}>
            {paying
              ? live
                ? 'Opening Stripe…'
                : 'Processing…'
              : live
                ? offer
                  ? 'Start your free month'
                  : `Continue to payment, ${money(price)}/mo`
                : `Pay ${money(price)} and continue`}
          </button>
          <span className="ui-small ui-muted">
            {live ? 'Payments are handled by Stripe. ' : 'Demo checkout. No real charge. '}
            Renews monthly until you cancel. Payments aren&apos;t refundable;{' '}
            <a href={asset('/refunds/')} target="_blank" rel="noreferrer" className="ui-link">
              see our refund policy
            </a>
            .
          </span>
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
