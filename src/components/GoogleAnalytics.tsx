import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

const GA_ID = "G-J9D53H885E";
const CONSENT_KEY = "young-peloton-analytics-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  const [consent, setConsent] = useState<boolean | null>(null);
  const pageUrl = useRouterState({
    select: (state) => state.location.href,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (saved === "accepted") setConsent(true);
      else if (saved === "rejected") setConsent(false);
      else setConsent(null);
    } catch {
      setConsent(false);
    }
  }, []);

  useEffect(() => {
    if (consent !== true) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params -- gtag.js requires the Arguments object
      window.dataLayer!.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { send_page_view: false });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.dataset["youngPelotonAnalytics"] = "true";
    document.head.appendChild(script);

    return () => {
      script.remove();
      delete window.gtag;
      delete window.dataLayer;
    };
  }, [consent]);

  useEffect(() => {
    if (consent !== true || !window.gtag) return;

    window.gtag("event", "page_view", {
      page_location: window.location.origin + pageUrl,
      page_title: document.title,
    });
  }, [consent, pageUrl]);

  function chooseConsent(accepted: boolean) {
    try {
      localStorage.setItem(CONSENT_KEY, accepted ? "accepted" : "rejected");
      setConsent(accepted);
    } catch {
      setConsent(false);
    }
  }

  if (consent !== null) return null;

  return (
    <aside
      aria-label="Cookie preferences"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-xl border bg-background p-5 text-foreground shadow-xl"
    >
      <h2 className="text-base font-semibold">Your privacy matters</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Young Peloton would like to use Google Analytics to understand how visitors use the website.
        Analytics will only run if you accept. You can reject it and still use the website normally.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => chooseConsent(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Accept analytics
        </button>
        <button
          onClick={() => chooseConsent(false)}
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          Reject analytics
        </button>
      </div>
    </aside>
  );
}
