'use client';

import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '@/lib/supabase';
import { errorText, useStore } from '@/lib/store';

type Gsi = {
  accounts: {
    id: {
      initialize(o: Record<string, unknown>): void;
      renderButton(el: HTMLElement, o: Record<string, unknown>): void;
    };
  };
};
declare global {
  interface Window {
    google?: Gsi;
  }
}

let scriptLoad: Promise<void> | null = null;
function loadGsi() {
  scriptLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptLoad = null;
      reject(new Error("Couldn't load Google sign-in."));
    };
    document.head.appendChild(s);
  });
  return scriptLoad;
}

async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed };
}

/**
 * Google's own "Continue with Google" button. Signing in happens in Google's pop-up on firstsend.site,
 * and the result goes to Supabase as an ID token, so the person never sees the supabase.co address.
 */
export default function GoogleButton({ onDone, onError }: { onDone: () => void; onError: (msg: string) => void }) {
  const { googleIdToken } = useStore();
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  // Keep the latest callbacks without re-rendering Google's button.
  const cbs = useRef({ onDone, onError, googleIdToken });
  cbs.current = { onDone, onError, googleIdToken };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nonce] = await Promise.all([makeNonce(), loadGsi()]);
        if (cancelled || !box.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonce.hashed,
          ux_mode: 'popup',
          use_fedcm_for_button: true,
          callback: async ({ credential }: { credential: string }) => {
            try {
              await cbs.current.googleIdToken(credential, nonce.raw);
              cbs.current.onDone();
            } catch (err) {
              cbs.current.onError(errorText(err));
            }
          },
        });
        window.google.accounts.id.renderButton(box.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width: Math.min(400, box.current.offsetWidth || 400),
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return null;
  return <div ref={box} className="social__google" />;
}
