import { reveal } from '@/lib/reveal';

/** Centred section head: a small orange label, a heading with an optional orange tail, and a lede under it. */
export default function SectionHead({
  label,
  title,
  muted,
  lede,
  as: Tag = 'h2',
}: {
  label: string;
  title: string;
  muted?: string;
  lede?: string;
  as?: 'h1' | 'h2';
}) {
  return (
    <header className="sh" {...reveal()}>
      <p className="sh__label">{label}</p>
      <Tag className="sh__title">
        {title}
        {muted && <span className="sh__muted"> {muted}</span>}
      </Tag>
      {lede && <p className="sh__lede">{lede}</p>}
    </header>
  );
}
