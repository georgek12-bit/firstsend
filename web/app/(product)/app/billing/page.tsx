'use client';

import { useState } from 'react';
import { CardFields, cardFrom, validateCard } from '@/components/CardFields';
import { Modal, date, money, useToast } from '@/components/ui';
import { PLANS, fmt, planById } from '@/lib/plans';
import { errorText } from '@/lib/store';
import { useView } from '@/lib/view';

export default function Billing() {
  const { state, sub, plan, changePlan, cancel, resume, updateCard } = useView();
  const [toast, show] = useToast();
  const [cardOpen, setCardOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [card, setCard] = useState({ number: '', exp: '', cvc: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const pending = sub.pendingPlan ? planById(sub.pendingPlan) : null;

  const pick = async (id: (typeof PLANS)[number]['id']) => {
    let res;
    try {
      res = await changePlan(id);
    } catch (err) {
      show(errorText(err));
      return;
    }
    const to = planById(id);
    if (res === 'upgraded') show(`Upgraded to ${to.name}. We're adding your extra inboxes now.`);
    else if (res === 'scheduled') show(`You'll move to ${to.name} on ${date(sub.renewsAt)}.`);
    else if (pending) show('Plan change canceled.');
  };

  const saveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateCard(card);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await updateCard(cardFrom(card));
    } catch (err) {
      setErrors({ number: errorText(err) });
      return;
    }
    setCardOpen(false);
    setCard({ number: '', exp: '', cvc: '' });
    show('Card updated.');
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <span className="ui-label">Billing</span>
          <h1 className="ui-h1">Plan and billing</h1>
          <p className="ui-sub">Monthly billing. Move up any time, move down at renewal, cancel whenever you like.</p>
        </div>
      </div>

      {sub.status === 'canceled' && (
        <div className="ui-banner ui-banner--warn">
          <span>Your plan ends on {date(sub.renewsAt)}. After that your inboxes stop sending.</span>
          <button type="button" className="ui-btn ui-btn--sm" onClick={() => resume().then(() => show('Welcome back. Your plan continues.'), err => show(errorText(err)))}>
            Keep my plan
          </button>
        </div>
      )}
      {pending && sub.status === 'active' && (
        <div className="ui-banner">
          <span>
            Moving to {pending.name} ({fmt(pending.perDay)} a day) on {date(sub.renewsAt)}.
          </span>
          <button type="button" className="ui-btn ui-btn--sm ui-btn--ghost" onClick={() => pick(sub.plan)}>
            Stay on {plan.name}
          </button>
        </div>
      )}

      <section className="ui-stack" aria-labelledby="plans-h">
        <h2 id="plans-h" className="ui-h2">
          Daily volume
        </h2>
        <div className="plan-cards">
          {PLANS.map(p => {
            const current = p.id === sub.plan;
            const scheduled = p.id === sub.pendingPlan;
            return (
              <div key={p.id} className={`ui-card plan-card${current ? ' ui-card--shadow' : ' ui-card--soft'}`}>
                <div className="ui-between">
                  <span className="ui-label">{p.name}</span>
                  {current && <span className="ui-tag ui-tag--orange">Current</span>}
                  {scheduled && <span className="ui-tag">From {date(sub.renewsAt)}</span>}
                </div>
                <div className="plan-card__price ui-num">
                  {money(p.price)}
                  <small>/mo</small>
                </div>
                <div>{fmt(p.perDay)} emails a day</div>
                {!current && !scheduled && sub.status === 'active' && (
                  <button type="button" className={`ui-btn ${p.price > plan.price ? 'ui-btn--orange' : 'ui-btn--ghost'}`} onClick={() => pick(p.id)}>
                    {p.price > plan.price ? `Upgrade now` : `Switch at renewal`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="ui-small ui-muted">Upgrades start right away. You pay the difference for the rest of this month.</p>
      </section>

      <div className="cols">
        <section className="ui-stack" aria-labelledby="inv-h">
          <h2 id="inv-h" className="ui-h2">
            Invoices
          </h2>
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.invoices.map(i => (
                  <tr key={i.id}>
                    <td className="ui-num">{date(i.at)}</td>
                    <td>{i.label}</td>
                    <td className="num">{money(i.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="ui-stack">
          <section className="ui-card ui-stack" aria-labelledby="pay-h" style={{ '--gap': '12px' } as React.CSSProperties}>
            <h2 id="pay-h" className="ui-h3">
              Payment method
            </h2>
            <p className="ui-num">
              {sub.card.brand} ending {sub.card.last4} · expires {sub.card.exp}
            </p>
            <div>
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setCardOpen(true)}>
                Update card
              </button>
            </div>
          </section>
          <section className="ui-card ui-stack" aria-labelledby="next-h" style={{ '--gap': '8px' } as React.CSSProperties}>
            <h2 id="next-h" className="ui-h3">
              Next payment
            </h2>
            {sub.status === 'active' ? (
              <p>
                {money((pending ?? plan).price)} on {date(sub.renewsAt)}
              </p>
            ) : (
              <p className="ui-muted">None. Your plan ends {date(sub.renewsAt)}.</p>
            )}
          </section>
          {sub.status === 'active' && (
            <section className="ui-card ui-card--soft ui-stack" aria-labelledby="cancel-h" style={{ '--gap': '10px' } as React.CSSProperties}>
              <h2 id="cancel-h" className="ui-h3">
                Cancel plan
              </h2>
              {confirmCancel ? (
                <>
                  <p>Your inboxes keep sending until {date(sub.renewsAt)}, then they&apos;re removed. You can change your mind before then.</p>
                  <div className="ui-row">
                    <button
                      type="button"
                      className="ui-btn ui-btn--danger ui-btn--sm"
                      onClick={async () => {
                        try {
                          await cancel();
                          show(`Plan canceled. It ends ${date(sub.renewsAt)}.`);
                        } catch (err) {
                          show(errorText(err));
                        }
                        setConfirmCancel(false);
                      }}
                    >
                      Yes, cancel
                    </button>
                    <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setConfirmCancel(false)}>
                      Keep my plan
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <button type="button" className="ui-link ui-small" onClick={() => setConfirmCancel(true)}>
                    Cancel my plan
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <Modal open={cardOpen} onClose={() => setCardOpen(false)} title="Update card">
        <form className="ui-stack" onSubmit={saveCard} noValidate>
          <CardFields value={card} onChange={setCard} errors={errors} />
          <div>
            <button type="submit" className="ui-btn">
              Save card
            </button>
          </div>
        </form>
      </Modal>
      {toast}
    </>
  );
}
