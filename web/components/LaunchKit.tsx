import { dnsRecords, kitInboxes, leads, sequencers, warmupBars } from '@/lib/content';
import { reveal } from '@/lib/reveal';

function Tile({
  variant = 'paper',
  delay = 0,
  title,
  body,
  children,
}: {
  variant?: 'paper' | 'orange' | 'ink';
  delay?: number;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`tile tile--${variant}`} {...reveal('24px', delay)}>
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
      <div className="kit__head" {...reveal()}>
        <div className="stack-16 kit__heading">
          <div className="kicker">03 / Launch kit</div>
          <h2 className="h2">
            Everything for campaign one. <span className="accent-italic">In the box.</span>
          </h2>
        </div>
        <p className="kit__lede">Inboxes alone don&apos;t get replies. So we bundle the rest.</p>
      </div>

      <div className="kit__grid">
        <Tile title="Outlook inboxes" body="Created and ready to go.">
          <div className="stack-8">
            {kitInboxes.map(m => (
              <div key={m.a} className="kit-inbox" style={{ marginLeft: m.indent }}>
                <span className="kit-inbox__at">@</span>
                {m.a}
              </div>
            ))}
          </div>
        </Tile>

        <Tile variant="orange" delay={60} title="Domains + DNS" body="Bought and configured. You never see a DNS record.">
          <div className="dns">
            {dnsRecords.map(r => (
              <div key={r} className="dns__row">
                <span>{r}</span>
                <span>set ✓</span>
              </div>
            ))}
          </div>
        </Tile>

        <Tile delay={120} title="Warmup" body="Started for you, with a plain-English guide.">
          <div className="warm" aria-hidden="true">
            {warmupBars.map((h, i) => (
              <div key={i} style={{ height: `${h}%` }} />
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
                <span className="seq__export">export →</span>
              </div>
            ))}
          </div>
        </Tile>

        <Tile delay={60} title="Copy templates" body="First-campaign emails you can adapt.">
          <div className="email">
            <div className="email__subject">Subject: quick idea for [company]</div>
            <div>Hey [first name], saw you&apos;re hiring SDRs. Most teams your size book 10+ calls a month without adding headcount.</div>
            <div className="email__line" />
          </div>
        </Tile>

        <Tile delay={120} title="Starter lead list" body="Enough leads to run your first test.">
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
