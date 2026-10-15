import { fmt, planById, type PlanId } from '@/lib/plans';
import { money } from './ui';

const INCLUDED = [
  'Outlook inboxes, created for you',
  'Domains with SPF, DKIM and DMARC set up',
  'Warmup, started automatically',
  'One-click export to your sequencer',
  'Copy templates and a starter lead list',
  'Burned inbox guarantee',
];

export default function PlanSummary({ planId, note }: { planId: PlanId; note?: React.ReactNode }) {
  const plan = planById(planId);
  return (
    <div className="ui-card ui-card--shadow ui-stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <div className="ui-between">
        <span className="ui-label">Your plan</span>
        <span className="ui-tag ui-tag--orange">{plan.name}</span>
      </div>
      <div>
        <div className="plan-card__price ui-num">
          {money(plan.price)}
          <small>/mo</small>
        </div>
        <div className="ui-muted" style={{ marginTop: 6 }}>
          {fmt(plan.perDay)} emails a day
        </div>
      </div>
      <ul className="ui-stack" style={{ '--gap': '8px', listStyle: 'none', margin: 0, padding: 0 } as React.CSSProperties}>
        {INCLUDED.map(i => (
          <li key={i} className="ui-row" style={{ '--gap': '10px', flexWrap: 'nowrap', alignItems: 'baseline' } as React.CSSProperties}>
            <span aria-hidden="true" style={{ color: 'var(--orange-text)', fontFamily: 'var(--mono)' }}>
              +
            </span>
            {i}
          </li>
        ))}
      </ul>
      <div className="ui-small ui-muted" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        {note ?? 'Billed monthly. Cancel anytime. No sales call.'}
      </div>
    </div>
  );
}
