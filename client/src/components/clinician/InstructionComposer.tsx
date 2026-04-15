import { useState } from 'react';
import {
  ApiClientError,
  createAgent,
  generateInstructions,
} from '../../lib/api';
import type { Language, Speed } from '../../types';
import PresetLibrary from './PresetLibrary';
import type { InstructionPreset } from './presets';

interface InstructionComposerProps {
  voiceId: string;
  doctorName: string;
  onComplete: (result: {
    sessionId: string;
    agentId: string | null;
    primaryLanguage: Language;
    speed: Speed;
  }) => void;
}

const MAX_CHARS = 3000;

export default function InstructionComposer({
  voiceId,
  doctorName,
  onComplete,
}: InstructionComposerProps) {
  const [instructionEs, setInstructionEs] = useState('');
  const [instructionEn, setInstructionEn] = useState('');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [primaryLanguage, setPrimaryLanguage] = useState<Language>('es');
  const [speed, setSpeed] = useState<Speed>('normal');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: InstructionPreset) => {
    setActivePresetId(preset.id);
    setInstructionEs(preset.textEs);
    setInstructionEn(preset.textEn);
  };

  const esRemaining = MAX_CHARS - instructionEs.length;
  const enRemaining = MAX_CHARS - instructionEn.length;
  const canSubmit =
    instructionEs.trim().length > 0 &&
    instructionEn.trim().length > 0 &&
    esRemaining >= 0 &&
    enRemaining >= 0 &&
    !isGenerating;

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      setProgressMessage('Generating audio in both languages…');
      const { sessionId } = await generateInstructions({
        doctorName,
        voiceId,
        instructionEs: instructionEs.trim(),
        instructionEn: instructionEn.trim(),
      });

      setProgressMessage('Setting up the conversational assistant…');
      let agentId: string | null = null;
      try {
        const agentResult = await createAgent({
          sessionId,
          language: primaryLanguage,
        });
        agentId = agentResult.agentId;
      } catch (err) {
        // Agent creation failure should not block the patient flow —
        // audio playback still works. Surface a non-fatal warning.
        console.error('[composer] create-agent failed', err);
        setError(
          err instanceof ApiClientError
            ? `Conversational assistant could not be set up: ${err.message}. Audio instructions will still work.`
            : 'Conversational assistant could not be set up. Audio instructions will still work.',
        );
      }

      onComplete({ sessionId, agentId, primaryLanguage, speed });
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not generate instructions. Try again.';
      setError(message);
    } finally {
      setIsGenerating(false);
      setProgressMessage(null);
    }
  };

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-600">
          Step 2 of 3
        </p>
        <h2 className="font-display mt-2 text-2xl text-stone-800">
          Compose instructions
        </h2>
        <p className="mt-2 max-w-2xl text-stone-600">
          Write or paste the post-op instructions in Spanish and English. Pick
          a preset to fill both languages, then edit as needed for this
          patient.
        </p>
      </header>

      <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
        <PresetLibrary onSelect={applyPreset} activeId={activePresetId} />

        <div className="space-y-6">
          <div>
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="instruction-es"
                className="text-sm font-medium text-stone-700"
              >
                Español
              </label>
              <span
                className={`font-mono text-xs tabular-nums ${
                  esRemaining < 0 ? 'text-rose-700' : 'text-stone-400'
                }`}
              >
                {esRemaining} / {MAX_CHARS}
              </span>
            </div>
            <textarea
              id="instruction-es"
              value={instructionEs}
              onChange={(e) => {
                setInstructionEs(e.target.value);
                setActivePresetId(null);
              }}
              rows={6}
              placeholder="Instrucciones post-operatorias en español…"
              className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="instruction-en"
                className="text-sm font-medium text-stone-700"
              >
                English
              </label>
              <span
                className={`font-mono text-xs tabular-nums ${
                  enRemaining < 0 ? 'text-rose-700' : 'text-stone-400'
                }`}
              >
                {enRemaining} / {MAX_CHARS}
              </span>
            </div>
            <textarea
              id="instruction-en"
              value={instructionEn}
              onChange={(e) => {
                setInstructionEn(e.target.value);
                setActivePresetId(null);
              }}
              rows={6}
              placeholder="Post-operative instructions in English…"
              className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <fieldset>
              <legend className="text-sm font-medium text-stone-700">
                Patient&apos;s primary language
              </legend>
              <p className="mt-1 text-xs text-stone-500">
                Used by the conversational assistant when the patient first
                opens the session.
              </p>
              <div
                className="mt-2 inline-flex rounded-md border border-stone-200 bg-stone-50 p-1"
                role="radiogroup"
              >
                {(['es', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    role="radio"
                    aria-checked={primaryLanguage === lang}
                    onClick={() => setPrimaryLanguage(lang)}
                    className={`rounded px-4 py-2 text-sm font-medium transition ${
                      primaryLanguage === lang
                        ? 'bg-white text-stone-800 shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {lang === 'es' ? 'Español' : 'English'}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-stone-700">
                Reading speed
              </legend>
              <p className="mt-1 text-xs text-stone-500">
                Slower playback for elderly or anxious patients.
              </p>
              <div
                className="mt-2 inline-flex rounded-md border border-stone-200 bg-stone-50 p-1"
                role="radiogroup"
              >
                {(['normal', 'slow'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={speed === option}
                    onClick={() => setSpeed(option)}
                    className={`rounded px-4 py-2 text-sm font-medium transition ${
                      speed === option
                        ? 'bg-white text-stone-800 shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {option === 'normal' ? 'Normal' : 'Slow'}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-md border border-error bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              {error}
            </div>
          ) : null}

          {isGenerating && progressMessage ? (
            <div className="flex items-center gap-3 rounded-md border border-forest-600 bg-forest-50 px-4 py-3 text-sm text-forest-800">
              <span
                className="inline-block h-2 w-2 animate-pulse rounded-full bg-forest-600"
                aria-hidden="true"
              />
              {progressMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleGenerate()}
              className="rounded-md bg-forest-800 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
            >
              Generate instructions
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
