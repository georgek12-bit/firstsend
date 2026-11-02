import { steps } from '@/lib/content';
import { reveal } from '@/lib/reveal';

export default function HowItWorks() {
  return (
    <section id="how" className="how">
      <div className="shead" {...reveal()}>
        <div className="badge">How it works</div>
        <h2 className="h2">
          Buy it, set it, <span className="accent">send it.</span>
        </h2>
        <p className="lede">Three steps, all in one day.</p>
      </div>
      <ol className="how__list">
        {steps.map((s, i) => (
          <li key={s.n} className="step" {...reveal('24px', i * 80)}>
            <span className="step__n">0{s.n}</span>
            <h3 className="step__title">{s.title}</h3>
            <p className="step__body">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
