import { dnsRecords, HEALTH, kitInboxes, leads, sequencers, warmupBars } from '@/lib/content';
import { reveal } from '@/lib/reveal';
import SectionHead from './SectionHead';

function Tile({
  variant = 'paper',
  delay = 0,
  title,
  body,
  children,
}: {
  variant?: 'paper' | 'ink';
  delay?: number;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`tile tile--${variant}`} {...reveal('12px', delay)}>
      {children}
      <div>
        <h3 className="tile__title">{title}</h3>
        <p className="tile__body">{body}</p>
      </div>
    </div>
  );
}

export default function LaunchKit() {
  return (
    <section id="kit" className="kit">
      <SectionHead
        label="Launch kit"
        title="Everything for campaign one,"
        muted="in the box"
        lede="Inboxes alone don't get replies, so we bundle the rest"
      />

      <div className="kit__grid">
        <Tile title="Outlook inboxes" body="Created and ready to go.">
          <div className="stack-8">
            {kitInboxes.map(a => (
              <div key={a} className="kit-inbox">
                <span className="dot dot--8" style={{ background: HEALTH.green }} />
                <span className="truncate">{a}</span>
              </div>
            ))}
          </div>
        </Tile>

        <Tile delay={60} title="Domains + DNS" body="Bought and configured. You never see a DNS record.">
          <div className="dns">
            {dnsRecords.map(r => (
              <div key={r} className="dns__row">
                <span>{r}</span>
                <span className="dns__set">
                  <span className="dot dot--8" style={{ background: HEALTH.green }} />
                  Set
                </span>
              </div>
            ))}
          </div>
        </Tile>

        <Tile delay={120} title="Warmup" body="Started for you, with a plain-English guide.">
          <div className="warm" aria-hidden="true">
            {warmupBars.map((h, i) => (
              <div key={i} className={i === warmupBars.length - 1 ? 'is-now' : undefined} style={{ height: `${h}%` }} />
            ))}
          </div>
        </Tile>

        <Tile variant="ink" title="Sequencer connection" body="One click. Or download a CSV.">
          <div className="stack-8">
            {sequencers.map(q => (
              <div key={q.alt} className="seq">
                <div className="seq__logo">
                  <img
                    src={q.src}
                    alt={q.label ? '' : q.alt}
                    style={{ height: q.hs, filter: q.invert ? 'invert(1)' : undefined }}
                  />
                  {q.label && <span>{q.label}</span>}
                </div>
                <span className="seq__export">Export</span>
              </div>
            ))}
          </div>
        </Tile>

        <Tile delay={60} title="Copy templates" body="First-campaign emails you can adapt.">
          <div className="email">
            <div className="email__subject">Subject: quick idea for {'{{companyName}}'}</div>
            <div>
              Hey {'{{firstName}}'}, saw you&apos;re hiring SDRs. Most teams your size book 10+ calls a month without adding
              headcount.
            </div>
          </div>
        </Tile>

        <Tile delay={120} title="Unlimited leads" body="Verified work emails, up to 5,000 per list.">
          <div>
            {leads.map(l => (
              <div key={l.n} className="lead">
                <span>{l.n}</span>
                <span>{l.r}</span>
              </div>
            ))}
          </div>
        </Tile>
      </div>
    </section>
  );
}
