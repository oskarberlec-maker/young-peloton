import { useEffect, useRef, useState } from 'react';

type GoogleCredentialResponse = { credential?: string; select_by?: string };
type GoogleIdentityAPI = {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce: string;
    auto_select: boolean;
    ux_mode: 'popup';
  }): void;
  renderButton(
    container: HTMLElement,
    options: { theme: 'outline'; size: 'large'; text: 'continue_with'; shape: 'rectangular'; width: number },
  ): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityAPI } };
  }
}

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';

interface GoogleIdentityButtonProps {
  clientId: string;
  onCredential: (jwt: string, nonce: string) => Promise<void>;
}

/**
 * Google's official button shows the Young Peloton origin directly.
 * Only the resulting Google ID token is sent to Supabase Auth;
 * Supabase keeps the existing user sessions, database and RLS rules.
 */
export function GoogleIdentityButton({ clientId, onCredential }: GoogleIdentityButtonProps) {
  const container = useRef<HTMLDivElement>(null);
  const credentialHandler = useRef(onCredential);
  credentialHandler.current = onCredential;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let script: HTMLScriptElement | null = null;
    const onLoad = async () => {
      if (!active || !window.google?.accounts?.id || !container.current) return;
      try {
        // Hashed nonce goes to Google; original nonce goes to Supabase for verification.
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const rawNonce = btoa(String.fromCharCode(...bytes));
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
        const hashedNonce = Array.from(new Uint8Array(digest))
          .map(byte => byte.toString(16).padStart(2, '0')).join('');
        if (!active || !container.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce: hashedNonce,
          auto_select: false,
          ux_mode: 'popup',
          callback: (response: GoogleCredentialResponse) => {
            if (!active) return;
            if (!response.credential) {
              setError('Google did not provide a sign-in credential. Please try again.');
              return;
            }
            setError('');
            void credentialHandler.current(response.credential, rawNonce).catch((reason: unknown) => {
              if (active) setError(reason instanceof Error ? reason.message : 'Google sign-in failed.');
            });
          },
        });
        container.current.replaceChildren();
        window.google.accounts.id.renderButton(container.current, {
          theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: 320,
        });
        setLoading(false);
      } catch {
        if (active) {
          setLoading(false);
          setError('Unable to initialize Google sign-in. You can sign in by email below.');
        }
      }
    };

    if (window.google?.accounts?.id) {
      void onLoad();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT}"]`);
      script = existing ?? document.createElement('script');
      script.addEventListener('load', onLoad);
      const onError = () => {
        if (active) {
          setLoading(false);
          setError('Unable to load Google sign-in. You can sign in by email below.');
        }
      };
      script.addEventListener('error', onError);
      if (!existing) {
        script.src = GOOGLE_SCRIPT;
        script.async = true;
        document.head.appendChild(script);
      }
      return () => {
        active = false;
        script?.removeEventListener('load', onLoad);
        script?.removeEventListener('error', onError);
        if (container.current) container.current.replaceChildren();
      };
    }
    return () => {
      active = false;
      if (container.current) container.current.replaceChildren();
    };
  }, [clientId]);

  return <div className="space-y-2">
    <div ref={container} className="flex min-h-11 justify-center" aria-label="Sign in with Google" />
    {loading && <p className="text-center text-sm text-muted-foreground" role="status">Loading Google sign-in…</p>}
    {error && <p className="text-center text-sm text-red-700" role="alert">{error}</p>}
  </div>;
}
