import { steps } from '@/lib/content';
import { reveal } from '@/lib/reveal';

export default function HowItWorks() {
  return (
    <section id="how" className="how">
      <div className="how__head" {...reveal()}>
        <div className="stack-16">
          <div className="kicker">02 / How it works</div>
          <h2 className="h2">Buy it, set it, send it.</h2>
        </div>
        <span className="how__aside">All in one day.</span>
      </div>
      <ol className="how__list">
        {steps.map(s => (
          <li key={s.n} className="step" {...reveal()}>
            <span className="step__n">{s.n}</span>
            <span className="step__title">{s.title}</span>
            <span className="step__body">{s.body}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
