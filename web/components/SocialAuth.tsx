'use client';

import { useEffect, useState } from 'react';
import { enabledProviders } from '@/lib/supabase';
import type { OAuthProvider } from '@/lib/state';
import { errorText, useStore } from '@/lib/store';

const PROVIDERS: { id: OAuthProvider; label: string; icon: React.ReactNode }[] = [
  {
    id: 'google',
    label: 'Google',
    icon: (
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
    ),
  },
  {
    id: 'azure',
    label: 'Microsoft',
    icon: (
      <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
        <path fill="#f25022" d="M0 0h10v10H0z" />
        <path fill="#7fba00" d="M11 0h10v10H11z" />
        <path fill="#00a4ef" d="M0 11h10v10H0z" />
        <path fill="#ffb900" d="M11 11h10v10H11z" />
      </svg>
    ),
  },
  {
    id: 'apple',
    label: 'Apple',
    icon: (
      <svg width="16" height="18" viewBox="0 0 814 1000" aria-hidden="true">
        <path
          fill="currentColor"
          d="M788 341c-6 4-108 62-108 190 0 149 131 201 135 203-1 3-21 72-69 142-43 62-88 124-157 124s-87-40-166-40c-78 0-105 41-168 41s-108-57-158-127C38 792 0 668 0 551 0 362 123 262 244 262c64 0 118 42 158 42 39 0 99-45 172-45 28 0 128 3 194 82zM561 165c30-36 52-86 52-136 0-7-1-14-2-20-49 2-108 33-143 74-28 32-54 82-54 133 0 8 1 15 2 18 3 1 9 2 14 2 44 0 99-30 131-71z"
        />
      </svg>
    ),
  },
];

/** "Continue with Google / Microsoft / Apple" buttons. Renders nothing until a provider is enabled. */
export default function SocialAuth({ returnTo, onError }: { returnTo: string; onError: (msg: string) => void }) {
  const { oauth } = useStore();
  const [enabled, setEnabled] = useState<Record<string, boolean> | null>(null);
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    enabledProviders().then(setEnabled);
  }, []);

  const shown = PROVIDERS.filter(p => enabled?.[p.id]);
  if (!shown.length) return null;

  const go = async (id: OAuthProvider) => {
    setBusy(id);
    try {
      await oauth(id, returnTo);
    } catch (err) {
      onError(errorText(err));
      setBusy(null);
    }
  };

  return (
    <div className="social">
      <div className="social__buttons">
        {shown.map(p => (
          <button key={p.id} type="button" className="ui-btn ui-btn--ghost social__btn" disabled={busy !== null} onClick={() => go(p.id)}>
            {p.icon}
            <span>{busy === p.id ? 'Opening…' : `Continue with ${p.label}`}</span>
          </button>
        ))}
      </div>
      <div className="social__or">
        <span>or use your email</span>
      </div>
    </div>
  );
}
