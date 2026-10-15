'use client';

import { Field } from './ui';

const digits = (s: string) => s.replace(/\D/g, '');

function luhn(num: string) {
  let sum = 0;
  for (let i = 0; i < num.length; i++) {
    let d = +num[num.length - 1 - i];
    if (i % 2) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return num.length >= 13 && sum % 10 === 0;
}

function brandOf(num: string) {
  if (/^4/.test(num)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'Mastercard';
  if (/^3[47]/.test(num)) return 'Amex';
  return 'Card';
}

export function validateCard(c: { number: string; exp: string; cvc: string }) {
  const errs: Record<string, string> = {};
  const n = digits(c.number);
  if (!luhn(n)) errs.number = 'That card number doesn’t look right.';
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(c.exp.trim());
  if (!m || +m[1] < 1 || +m[1] > 12) errs.exp = 'Use MM / YY.';
  else {
    const end = new Date(2000 + +m[2], +m[1], 1);
    if (end < new Date()) errs.exp = 'This card has expired.';
  }
  if (!/^\d{3,4}$/.test(c.cvc.trim())) errs.cvc = '3 or 4 digits.';
  return errs;
}

export function CardFields({
  value,
  onChange,
  errors,
}: {
  value: { number: string; exp: string; cvc: string };
  onChange: (v: { number: string; exp: string; cvc: string }) => void;
  errors: Record<string, string>;
}) {
  return (
    <>
      <Field id="cc-number" label="Card number" hint="Demo: use 4242 4242 4242 4242" error={errors.number}>
        <input
          id="cc-number"
          className="ui-input ui-num"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 1234 1234 1234"
          value={value.number}
          onChange={e => onChange({ ...value, number: digits(e.target.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ') })}
          aria-invalid={!!errors.number}
        />
      </Field>
      <div className="ui-grid-2">
        <Field id="cc-exp" label="Expiry" error={errors.exp}>
          <input
            id="cc-exp"
            className="ui-input ui-num"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
            value={value.exp}
            onChange={e => {
              const d = digits(e.target.value).slice(0, 4);
              onChange({ ...value, exp: d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d });
            }}
            aria-invalid={!!errors.exp}
          />
        </Field>
        <Field id="cc-cvc" label="CVC" error={errors.cvc}>
          <input
            id="cc-cvc"
            className="ui-input ui-num"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={value.cvc}
            onChange={e => onChange({ ...value, cvc: digits(e.target.value).slice(0, 4) })}
            aria-invalid={!!errors.cvc}
          />
        </Field>
      </div>
    </>
  );
}

export const cardFrom = (c: { number: string; exp: string }) => {
  const n = digits(c.number);
  return { brand: brandOf(n), last4: n.slice(-4), exp: c.exp.replace(/\s/g, '') };
};
