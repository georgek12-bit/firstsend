import { steps } from '@/lib/content';
import { reveal } from '@/lib/reveal';
import SectionHead from './SectionHead';

export default function HowItWorks() {
  return (
    <section id="how" className="how">
      <SectionHead label="How it works" title="From checkout to first send" muted="in a day" />
      <ol className="how__list">
        {steps.map((s, i) => (
          <li key={s.n} className="step" {...reveal('12px', i * 60)}>
            <span className="step__n mono">0{s.n}</span>
            <div>
              <h3 className="step__title">{s.title}</h3>
              <p className="step__body">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
