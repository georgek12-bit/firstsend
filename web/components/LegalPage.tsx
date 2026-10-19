import Link from 'next/link';
import { LEGAL, legalLinks } from '@/lib/legal';
import Footer from './Footer';
import Nav from './Nav';

/** Shared frame for the legal pages: nav, a readable text column, links between the policies. */
export default function LegalPage({
  path,
  title,
  intro,
  children,
}: {
  path: string;
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="page">
      <Nav />
      <main className="legal">
        <header className="legal__head">
          <div className="kicker">Legal</div>
          <h1 className="h2">{title}</h1>
          <p className="legal__intro">{intro}</p>
          <p className="legal__meta">Last updated {LEGAL.updated}</p>
        </header>
        <div className="legal__body">{children}</div>
        <nav className="legal__others" aria-label="Other policies">
          {legalLinks
            .filter(l => l.href !== path)
            .map(l => (
              <Link key={l.href} href={l.href} className="ui-link">
                {l.label}
              </Link>
            ))}
        </nav>
      </main>
      <section className="final final--slim">
        <Footer />
      </section>
    </div>
  );
}

export const Mail = () => <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
