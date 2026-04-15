import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Language, Speed } from '../../types';

interface ShareFlowProps {
  sessionId: string;
  doctorName: string;
  agentId: string | null;
  primaryLanguage: Language;
  speed: Speed;
  onRestart: () => void;
}

function buildPatientUrl(sessionId: string, primary: Language, speed: Speed): string {
  const params = new URLSearchParams();
  if (primary !== 'es') params.set('lang', primary);
  if (speed !== 'normal') params.set('speed', speed);
  const query = params.toString();
  return `${window.location.origin}/patient/${sessionId}${query ? `?${query}` : ''}`;
}

export default function ShareFlow({
  sessionId,
  doctorName,
  agentId,
  primaryLanguage,
  speed,
  onRestart,
}: ShareFlowProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const patientUrl = buildPatientUrl(sessionId, primaryLanguage, speed);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(patientUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
      color: {
        dark: '#14532d',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('[share] failed to generate QR code', err);
      });
    return () => {
      cancelled = true;
    };
  }, [patientUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(patientUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[share] clipboard write failed', err);
    }
  };

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-50 text-forest-800">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-forest-700">
            Ready to share
          </p>
          <h2 className="font-display text-2xl text-stone-800">
            Your patient&apos;s session is ready.
          </h2>
        </div>
      </header>

      <p className="mt-4 text-stone-600">
        Send {doctorName || 'your patient'} this link or let them scan the QR
        code. The link works for 24 hours.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 space-y-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500">
              Patient link
            </p>
            <div className="mt-2 flex items-start gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
              <code className="min-w-0 flex-1 break-all font-mono text-sm text-stone-800">
                {patientUrl}
              </code>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="mt-0.5 shrink-0 rounded-md bg-forest-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-stone-50"
                aria-label="Copy patient link to clipboard"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="space-y-1 text-sm text-stone-600">
            <p>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
                Session ID:
              </span>{' '}
              <span className="font-mono text-xs text-stone-500">
                {sessionId}
              </span>
            </p>
            <p>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
                Primary language:
              </span>{' '}
              {primaryLanguage === 'es' ? 'Español' : 'English'}
            </p>
            <p>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
                Reading speed:
              </span>{' '}
              {speed === 'slow' ? 'Slow' : 'Normal'}
            </p>
            {agentId ? (
              <p>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
                  Assistant:
                </span>{' '}
                <span className="text-forest-800">Ready</span>
              </p>
            ) : (
              <p>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
                  Assistant:
                </span>{' '}
                <span className="text-amber-700">
                  Not available — audio only
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={patientUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-forest-800 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-white"
            >
              Open patient view
            </a>
            <button
              type="button"
              onClick={onRestart}
              className="rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 focus:ring-offset-white"
            >
              Start over
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code for the patient link"
                width={240}
                height={240}
                className="block"
              />
            ) : (
              <div className="flex h-60 w-60 items-center justify-center text-sm text-stone-400">
                Generating…
              </div>
            )}
          </div>
          <p className="text-xs text-stone-500">
            Print and hand to the patient, or scan from a phone.
          </p>
        </div>
      </div>
    </section>
  );
}
