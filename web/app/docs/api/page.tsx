import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import Nav from '@/components/Nav';
import { API_BASE, ERRORS, GROUPS, LEAD_CSV, LEAD_FILTERS, type Param } from '@/lib/apiDocs';
import { BRAND } from '@/lib/content';

export const metadata: Metadata = {
  title: `API reference | ${BRAND}`,
  description: `Manage inboxes, domains and free verified leads from your own code with the ${BRAND} API.`,
};

function Params({ title, params }: { title: string; params: Param[] }) {
  return (
    <div className="docs__params">
      <h4>{title}</h4>
      <dl>
        {params.map(p => (
          <div key={p.name}>
            <dt>
              <code>{p.name}</code> <span>{p.type}</span>
              {p.req && <em>required</em>}
            </dt>
            <dd>{p.desc}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function ApiDocs() {
  return (
    <div className="page">
      <Nav />
      <div className="docs">
        <nav className="docs__toc" aria-label="On this page">
          <a href="#start">Getting started</a>
          <a href="#auth">Authentication</a>
          <a href="#errors">Errors and limits</a>
          {GROUPS.map(g => (
            <div key={g.id} className="docs__toc-group">
              <a href={`#${g.id}`}>{g.title}</a>
              {g.endpoints.map(e => (
                <a key={e.id} href={`#${e.id}`} className="docs__toc-sub">
                  {e.title}
                </a>
              ))}
            </div>
          ))}
          <a href="#filters">Lead filters</a>
        </nav>

        <main className="docs__main">
          <header className="legal__head" id="start">
            <div className="kicker">Developers</div>
            <h1 className="h2">{BRAND} API</h1>
            <p className="legal__intro">
              Pull your inboxes and their logins, replace burned inboxes and build free lead lists from your own code. Included on every plan.
            </p>
          </header>

          <section className="docs__section">
            <h2>Getting started</h2>
            <ol>
              <li>
                In the app, go to <strong>Settings → API</strong> and create a key. Copy it straight away: it is only shown once.
              </li>
              <li>Send it in the x-api-token header on every request.</li>
              <li>
                Every endpoint lives under <code>{API_BASE}/v1</code> and returns JSON.
              </li>
            </ol>
            <pre className="docs__code">{`export FIRSTSEND_KEY="fs_live_…"\n\ncurl ${API_BASE}/v1/account \\\n  -H "x-api-token: $FIRSTSEND_KEY"`}</pre>
          </section>

          <section className="docs__section" id="auth">
            <h2>Authentication</h2>
            <p>
              Put your key in the <code>x-api-token</code> header, with no prefix. A key acts as your account, so keep it on your server: never in a
              website, an app or a public repo. You can have up to 10 active keys and revoke any of them in Settings → API. A revoked key stops working
              straight away.
            </p>
            <pre className="docs__code">x-api-token: fs_live_3f9a…</pre>
          </section>

          <section className="docs__section" id="errors">
            <h2>Errors and limits</h2>
            <p>Errors come back with an HTTP status and a body like this:</p>
            <pre className="docs__code">{`{ "error": { "code": "invalid_api_key", "message": "That API key is not valid or has been revoked." } }`}</pre>
            <div className="docs__table-wrap">
              <table className="docs__table">
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Code</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
                  {ERRORS.map(e => (
                    <tr key={e.status}>
                      <td>{e.status}</td>
                      <td>
                        <code>{e.code}</code>
                      </td>
                      <td>{e.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <strong>Rate limit:</strong> 120 requests a minute per key. Every response has <code>x-ratelimit-limit</code>,{' '}
              <code>x-ratelimit-remaining</code> and <code>x-ratelimit-reset</code> headers.
            </p>
            <p>
              <strong>Pages:</strong> list endpoints take <code>limit</code> and <code>offset</code> and return <code>has_more</code>,{' '}
              <code>next_offset</code> and <code>total</code>. Keep requesting with <code>offset=next_offset</code> until <code>has_more</code> is false.
            </p>
          </section>

          {GROUPS.map(g => (
            <section key={g.id} className="docs__section" id={g.id}>
              <h2>{g.title}</h2>
              <p>{g.intro}</p>
              {g.endpoints.map(e => (
                <article key={e.id} className="docs__endpoint" id={e.id}>
                  <h3>{e.title}</h3>
                  <p className="docs__route">
                    <span className={`docs__method docs__method--${e.method.toLowerCase()}`}>{e.method}</span>
                    <code>{e.path}</code>
                  </p>
                  <p>{e.desc}</p>
                  {e.query && <Params title="Query parameters" params={e.query} />}
                  {e.body && <Params title="Body (JSON)" params={e.body} />}
                  <h4>Example</h4>
                  <pre className="docs__code">{e.example}</pre>
                  <h4>Response</h4>
                  <pre className="docs__code docs__code--soft">{e.response}</pre>
                </article>
              ))}
            </section>
          ))}

          <section className="docs__section" id="filters">
            <h2>Lead filters</h2>
            <p>
              Used by Count matching leads and Build a lead list. Every filter is optional, but you need at least one of job_titles, seniority,
              industries or keywords. Different filters must all match. Values inside one filter are alternatives.
            </p>
            <Params title="filters" params={LEAD_FILTERS} />
            <p>
              Every lead has a verified work email. The CSV columns are: {LEAD_CSV.join(', ')}. The headers are named so Instantly and Smartlead map
              them on upload.
            </p>
          </section>

          <p className="docs__foot">
            Questions or need a higher limit? Message us from Support in the app. <Link href="/app/api">Manage your API keys</Link>
          </p>
        </main>
      </div>
      <section className="final final--slim">
        <Footer />
      </section>
    </div>
  );
}
