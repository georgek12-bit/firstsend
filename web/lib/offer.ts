// Private offer codes (e.g. the founding client rate) arrive as ?offer= on a sign-up link.
// The code is kept for this browser so it survives the sign-in email round trip; the server
// checks it at checkout, so a wrong or old code can never change the price.
const KEY = 'firstsend_offer';

export function captureOffer(params: URLSearchParams): string | null {
  const fromUrl = params.get('offer')?.trim();
  try {
    if (fromUrl) localStorage.setItem(KEY, fromUrl);
    return fromUrl || localStorage.getItem(KEY);
  } catch {
    return fromUrl || null;
  }
}

export function clearOffer() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
