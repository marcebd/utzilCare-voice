import { useCallback, useEffect, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import type { Language } from '../../types';
import { getConvaiSignedUrl } from '../../lib/api';

interface PatientConversationProps {
  sessionId: string;
  language: Language;
  disabled?: boolean;
}

interface TranscriptMessage {
  id: string;
  source: 'user' | 'ai';
  text: string;
}

interface ConvaiMessage {
  source?: 'user' | 'ai' | string;
  message?: string;
}

const COPY = {
  es: {
    title: 'Asistente de preguntas',
    description:
      'Pregunte al asistente lo que no entendió. Responde en la voz de su doctor.',
    localDisclaimer:
      'Este asistente solo responde sobre las instrucciones de arriba. Para emergencias, llame a su doctor.',
    startButton: 'Iniciar conversación',
    endButton: 'Terminar',
    connecting: 'Conectando…',
    agentSpeaking: 'Su doctor está hablando',
    listening: 'Escuchando',
    idle: 'Diga algo o escriba su pregunta',
    inputPlaceholder: 'Escriba su pregunta…',
    sendLabel: 'Enviar',
    micDenied:
      'No se pudo acceder al micrófono. Puede escribir su pregunta en el cuadro de abajo.',
    genericError:
      'El asistente no pudo iniciarse. Intente de nuevo en un momento.',
    emptyTranscript: 'Las preguntas y respuestas aparecerán aquí.',
    you: 'Usted',
    doctor: 'Doctor',
  },
  en: {
    title: 'Ask the assistant',
    description:
      'Ask the assistant anything you did not understand. It answers in your doctor\u2019s voice.',
    localDisclaimer:
      'This assistant only answers about the instructions above. For emergencies, call your doctor.',
    startButton: 'Start conversation',
    endButton: 'End',
    connecting: 'Connecting\u2026',
    agentSpeaking: 'Your doctor is speaking',
    listening: 'Listening',
    idle: 'Say something or type your question',
    inputPlaceholder: 'Type your question\u2026',
    sendLabel: 'Send',
    micDenied:
      'We could not access the microphone. You can type your question below.',
    genericError:
      'The assistant could not start. Please try again in a moment.',
    emptyTranscript: 'Questions and answers will appear here.',
    you: 'You',
    doctor: 'Doctor',
  },
} as const;

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `m-${Math.random().toString(36).slice(2)}`;
}

export default function PatientConversation({
  sessionId,
  language,
  disabled,
}: PatientConversationProps) {
  const copy = COPY[language];

  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const handleMessage = useCallback((msg: unknown) => {
    const m = msg as ConvaiMessage;
    const source = m.source === 'user' ? 'user' : m.source === 'ai' ? 'ai' : null;
    const text = typeof m.message === 'string' ? m.message.trim() : '';
    if (!source || !text) return;
    setTranscript((prev) => [...prev, { id: makeId(), source, text }]);
  }, []);

  const handleError = useCallback(
    (err: unknown) => {
      const raw = err instanceof Error ? err.message : String(err ?? '');
      console.error('[convai] error', err);
      if (/permiss|microphone|denied|NotAllowed/i.test(raw)) {
        setErrorMessage(copy.micDenied);
      } else {
        setErrorMessage(copy.genericError);
      }
    },
    [copy.genericError, copy.micDenied],
  );

  const conversation = useConversation({
    onMessage: handleMessage,
    onError: handleError,
    onConnect: () => setErrorMessage(null),
  });

  const status = conversation.status;
  const isSpeaking = conversation.isSpeaking;
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting' || isStarting;

  const startConversation = async () => {
    if (disabled || isStarting || isConnected) return;
    setErrorMessage(null);
    setIsStarting(true);
    try {
      const { signedUrl } = await getConvaiSignedUrl(sessionId);
      await conversation.startSession({ signedUrl });
    } catch (err) {
      handleError(err);
    } finally {
      setIsStarting(false);
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error('[convai] end session failed', err);
    }
  };

  const sendText = () => {
    const trimmed = textInput.trim();
    if (!trimmed || !isConnected) return;
    conversation.sendUserMessage(trimmed);
    setTranscript((prev) => [
      ...prev,
      { id: makeId(), source: 'user', text: trimmed },
    ]);
    setTextInput('');
  };

  useEffect(() => {
    return () => {
      if (
        conversation.status === 'connected' ||
        conversation.status === 'connecting'
      ) {
        void conversation.endSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const container = transcriptRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  return (
    <section
      aria-label={copy.title}
      className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-600">
          {copy.title}
        </p>
        <p className="mt-2 text-stone-700">{copy.description}</p>
      </header>

      <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
        {copy.localDisclaimer}
      </p>

      {!isConnected ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => void startConversation()}
            disabled={disabled || isConnecting}
            className="inline-flex items-center gap-3 rounded-full bg-forest-800 px-6 py-3 text-white shadow-sm transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
          >
            {isConnecting ? (
              <>
                <span
                  className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-white"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{copy.connecting}</span>
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <rect x="9" y="3" width="6" height="12" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                </svg>
                <span className="text-sm font-medium">{copy.startButton}</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-forest-600 bg-forest-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  isSpeaking ? 'animate-pulse bg-amber-500' : 'bg-forest-600'
                }`}
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-forest-900">
                {isSpeaking
                  ? copy.agentSpeaking
                  : transcript.length === 0
                    ? copy.idle
                    : copy.listening}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void endConversation()}
              className="rounded-md border border-forest-700 bg-white px-3 py-1.5 text-xs font-medium text-forest-800 transition hover:bg-forest-50 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-forest-50"
            >
              {copy.endButton}
            </button>
          </div>

          <div
            ref={transcriptRef}
            role="log"
            aria-live="polite"
            aria-label={copy.title}
            className="max-h-72 overflow-y-auto rounded-md border border-stone-200 bg-stone-50 p-3"
          >
            {transcript.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">
                {copy.emptyTranscript}
              </p>
            ) : (
              <ul className="space-y-3">
                {transcript.map((msg) => (
                  <li
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.source === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400">
                      {msg.source === 'user' ? copy.you : copy.doctor}
                    </span>
                    <span
                      className={`mt-1 inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.source === 'user'
                          ? 'bg-forest-800 text-white'
                          : 'bg-white text-stone-800 shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendText();
            }}
            className="flex items-center gap-2"
          >
            <label htmlFor="convai-text" className="sr-only">
              {copy.inputPlaceholder}
            </label>
            <input
              id="convai-text"
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={copy.inputPlaceholder}
              maxLength={400}
              className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700"
            />
            <button
              type="submit"
              disabled={textInput.trim().length === 0}
              className="rounded-md bg-forest-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
            >
              {copy.sendLabel}
            </button>
          </form>
        </div>
      )}

      {errorMessage ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
