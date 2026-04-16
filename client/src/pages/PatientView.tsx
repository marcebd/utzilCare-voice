import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ApiClientError, audioUrl, getSession } from '../lib/api';
import type { Language, SessionResponse, Speed } from '../types';
import AudioPlayer from '../components/patient/AudioPlayer';
import LanguageToggle from '../components/patient/LanguageToggle';
import PatientConversation from '../components/patient/PatientConversation';
import AccessibilityControls from '../components/patient/AccessibilityControls';

function parseLang(value: string | null): Language {
  return value === 'en' ? 'en' : 'es';
}

function parseSpeed(value: string | null): Speed {
  return value === 'slow' ? 'slow' : 'normal';
}

export default function PatientView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();

  const initialLanguage = parseLang(searchParams.get('lang'));
  const speed = parseSpeed(searchParams.get('speed'));

  const [session, setSession] = useState<SessionResponse | null>(null);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoadState('error');
      setErrorMessage('No session id in the URL.');
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    getSession(sessionId)
      .then((data) => {
        if (cancelled) return;
        setSession(data);
        setLoadState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'Could not load this session.';
        setErrorMessage(message);
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const currentText = useMemo(() => {
    if (!session) return '';
    return language === 'es' ? session.instructionEs : session.instructionEn;
  }, [session, language]);

  const currentAudioSrc = useMemo(() => {
    if (!sessionId) return '';
    return audioUrl(sessionId, language);
  }, [sessionId, language]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-4 flex justify-end">
        <AccessibilityControls language={language} />
      </div>

      <div
        role="alert"
        className="rounded-md border border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <strong className="font-semibold">
          {language === 'es'
            ? 'Este asistente responde sobre sus instrucciones de alta únicamente.'
            : 'This assistant answers questions about your discharge instructions only.'}
        </strong>{' '}
        {language === 'es'
          ? 'Para emergencias, llame a su doctor o vaya a la clínica más cercana.'
          : 'For emergencies, contact your doctor or go to the nearest clinic.'}
      </div>

      {loadState === 'loading' ? (
        <section className="mt-8 rounded-xl border border-stone-200 bg-white p-8 text-stone-500">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
            Loading
          </p>
          <p className="mt-2">
            {language === 'es'
              ? 'Cargando sus instrucciones…'
              : 'Loading your instructions…'}
          </p>
        </section>
      ) : null}

      {loadState === 'error' ? (
        <section className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-rose-700">
            {language === 'es' ? 'No disponible' : 'Not available'}
          </p>
          <h1 className="font-display mt-2 text-2xl text-stone-800">
            {language === 'es'
              ? 'No pudimos abrir esta sesión.'
              : 'We could not open this session.'}
          </h1>
          <p className="mt-2 text-stone-700">
            {errorMessage ??
              (language === 'es'
                ? 'Pida a su doctor un nuevo enlace.'
                : 'Ask your doctor for a new link.')}
          </p>
        </section>
      ) : null}

      {loadState === 'ready' && session ? (
        <>
          <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-600">
                {language === 'es'
                  ? 'Instrucciones de alta'
                  : 'Discharge instructions'}
              </p>
              <h1 className="font-display mt-2 text-3xl text-stone-800">
                {language === 'es' ? 'De parte de' : 'From'}{' '}
                <span className="text-forest-800">{session.doctorName}</span>
              </h1>
            </div>
            <LanguageToggle value={language} onChange={setLanguage} />
          </header>

          <div className="mt-6">
            <AudioPlayer
              src={currentAudioSrc}
              downloadFilename={`utzilcare-${session.sessionId}-${language}.mp3`}
              speed={speed}
              ariaLabel={
                language === 'es'
                  ? 'Reproductor de audio en español'
                  : 'English audio player'
              }
            />
          </div>

          <section
            aria-label={
              language === 'es' ? 'Texto de las instrucciones' : 'Instruction text'
            }
            className="mt-6 rounded-xl border border-stone-200 bg-white p-6"
          >
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500">
              {language === 'es' ? 'Texto' : 'Text'}
            </p>
            <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-stone-800">
              {currentText}
            </p>
          </section>

          <div className="mt-6">
            <PatientConversation
              sessionId={session.sessionId}
              language={language}
              disabled={!session.agentId}
            />
          </div>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
            <p className="font-mono">
              {language === 'es' ? 'Sesión' : 'Session'}:{' '}
              <span className="text-stone-700">{session.sessionId}</span>
            </p>
            <p>
              {language === 'es'
                ? 'Este enlace funciona por 24 horas.'
                : 'This link works for 24 hours.'}
            </p>
          </footer>
        </>
      ) : null}
    </main>
  );
}
