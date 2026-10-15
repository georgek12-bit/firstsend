/** Logo 1a: a square outline with one orange "new message" block in the top-right corner. */
export default function LogoMark({ size = 'lg', tone = 'ink' }: { size?: 'lg' | 'sm'; tone?: 'ink' | 'cream' }) {
  return (
    <span className={`mark mark--${size} mark--${tone}`} aria-hidden="true">
      <span className="mark__dot" />
    </span>
  );
}
