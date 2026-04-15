import { useEffect, useRef, useState } from 'react';
import { ApiClientError, cloneVoice, previewVoice } from '../../lib/api';
import { useRecorder } from '../../hooks/useRecorder';

interface VoiceClonerProps {
  onComplete: (result: { voiceId: string; doctorName: string }) => void;
}

type Mode = 'record' | 'upload';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function extensionFor(mime: string | null): string {
  if (!mime) return 'webm';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}

export default function VoiceCloner({ onComplete }: VoiceClonerProps) {
  const [doctorName, setDoctorName] = useState('');
  const [mode, setMode] = useState<Mode>('record');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [isCloning, setIsCloning] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cloneResult, setCloneResult] = useState<{
    voiceId: string;
    previewText: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRecorder();
  const recordedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
      recordedUrlRef.current = null;
    }
    if (recorder.recordedBlob) {
      recordedUrlRef.current = URL.createObjectURL(recorder.recordedBlob);
    }
    return () => {
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
      }
    };
  }, [recorder.recordedBlob]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const recordedAudioUrl = recordedUrlRef.current;
  const canSubmit =
    doctorName.trim().length >= 2 &&
    !isCloning &&
    ((mode === 'record' && recorder.recordedBlob && recorder.elapsedSeconds >= 3) ||
      (mode === 'upload' && uploadedFile !== null));

  const handleSubmit = async () => {
    setError(null);
    setIsCloning(true);
    try {
      const blob =
        mode === 'record'
          ? recorder.recordedBlob
          : uploadedFile;
      if (!blob) throw new Error('No audio selected.');

      const filename =
        mode === 'record'
          ? `recording.${extensionFor(recorder.recordedMime)}`
          : (uploadedFile?.name ?? 'upload');

      const result = await cloneVoice({
        doctorName: doctorName.trim(),
        audio: blob,
        filename,
      });
      setCloneResult(result);

      setIsLoadingPreview(true);
      try {
        const previewBlob = await previewVoice({
          voiceId: result.voiceId,
          text: result.previewText,
          language: 'es',
        });
        setPreviewUrl(URL.createObjectURL(previewBlob));
      } finally {
        setIsLoadingPreview(false);
      }
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Voice cloning failed. Try again.';
      setError(message);
    } finally {
      setIsCloning(false);
    }
  };

  const handleRestart = () => {
    setCloneResult(null);
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    recorder.reset();
    setUploadedFile(null);
  };

  if (cloneResult) {
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
              Voice cloned
            </p>
            <h2 className="font-display text-2xl text-stone-800">
              Your voice is ready.
            </h2>
          </div>
        </header>

        <p className="mt-4 text-stone-600">
          Listen to the preview and make sure it sounds like you. All
          instructions you generate will use this voice.
        </p>

        <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500">
            Preview
          </p>
          <p className="font-display mt-2 text-lg text-stone-800">
            &ldquo;{cloneResult.previewText}&rdquo;
          </p>
          {isLoadingPreview ? (
            <p className="mt-4 text-sm text-stone-500">
              Generating preview audio…
            </p>
          ) : previewUrl ? (
            <audio
              controls
              src={previewUrl}
              className="mt-4 w-full"
              aria-label="Preview of your cloned voice"
            />
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              onComplete({
                voiceId: cloneResult.voiceId,
                doctorName: doctorName.trim(),
              })
            }
            className="rounded-md bg-forest-800 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-white"
          >
            Continue to instructions
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 focus:ring-offset-white"
          >
            Record again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-600">
          Step 1 of 3
        </p>
        <h2 className="font-display mt-2 text-2xl text-stone-800">
          Clone your voice
        </h2>
        <p className="mt-2 max-w-2xl text-stone-600">
          Record or upload 30 to 60 seconds of your voice reading any calm,
          conversational text. A bedside manner sample works well.
        </p>
      </header>

      <div className="mt-8">
        <label
          htmlFor="doctor-name"
          className="block text-sm font-medium text-stone-700"
        >
          Your name
        </label>
        <input
          id="doctor-name"
          type="text"
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="Dr. María López"
          maxLength={80}
          className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700"
        />
      </div>

      <div
        role="tablist"
        aria-label="Audio source"
        className="mt-8 inline-flex rounded-md border border-stone-200 bg-stone-50 p-1"
      >
        <button
          role="tab"
          type="button"
          aria-selected={mode === 'record'}
          onClick={() => setMode('record')}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            mode === 'record'
              ? 'bg-white text-stone-800 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Record
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={mode === 'upload'}
          onClick={() => setMode('upload')}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            mode === 'upload'
              ? 'bg-white text-stone-800 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Upload
        </button>
      </div>

      {mode === 'record' ? (
        <div className="mt-6">
          {recorder.status === 'idle' && !recorder.recordedBlob ? (
            <button
              type="button"
              onClick={() => void recorder.start()}
              className="inline-flex items-center gap-3 rounded-full bg-forest-800 px-6 py-4 text-white shadow-sm transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-white"
            >
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
              <span className="text-sm font-medium">Start recording</span>
            </button>
          ) : null}

          {recorder.status === 'recording' ? (
            <button
              type="button"
              onClick={recorder.stop}
              className="inline-flex items-center gap-3 rounded-full bg-amber-600 px-6 py-4 text-white shadow-sm transition hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white"
            >
              <span
                className="inline-block h-3 w-3 rounded-sm bg-white"
                aria-hidden="true"
              />
              <span className="font-mono text-sm font-medium tabular-nums">
                Recording · {formatDuration(recorder.elapsedSeconds)}
              </span>
              <span className="sr-only">Click to stop recording</span>
            </button>
          ) : null}

          {recorder.status === 'stopped' && recordedAudioUrl ? (
            <div className="rounded-lg border border-forest-600 bg-forest-50 p-5">
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-800 text-white"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-forest-900">
                    Recording saved — {formatDuration(recorder.elapsedSeconds)}
                  </p>
                  <p className="mt-1 text-sm text-forest-800/80">
                    Listen back and make sure it sounds like you before
                    cloning.
                  </p>
                </div>
              </div>

              <audio
                controls
                src={recordedAudioUrl}
                className="mt-4 w-full"
                aria-label="Listen to your recording"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={recorder.reset}
                  className="inline-flex items-center gap-2 rounded-md border border-forest-600 bg-white px-4 py-2 text-sm font-medium text-forest-800 transition hover:bg-forest-50 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-forest-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                    <polyline points="3 3 3 8 8 8" />
                  </svg>
                  Re-record
                </button>
              </div>
            </div>
          ) : null}

          {recorder.errorMessage ? (
            <p className="mt-4 text-sm text-error" role="alert">
              {recorder.errorMessage}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-6">
          <label
            htmlFor="audio-upload"
            className="inline-flex cursor-pointer items-center gap-3 rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400 hover:bg-stone-50"
          >
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Choose audio file</span>
            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setUploadedFile(file);
              }}
            />
          </label>
          {uploadedFile ? (
            <p className="mt-3 text-sm text-stone-600">
              Selected: <span className="font-mono">{uploadedFile.name}</span>
              {' · '}
              {(uploadedFile.size / 1024).toFixed(0)} KB
            </p>
          ) : (
            <p className="mt-3 text-sm text-stone-500">
              MP3, WAV, M4A, WebM, or OGG — up to 10 MB.
            </p>
          )}
        </div>
      )}

      {error ? (
        <div
          role="alert"
          className="mt-6 rounded-md border border-error bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      {isCloning ? (
        <div className="mt-6 flex items-center gap-3 rounded-md border border-forest-600 bg-forest-50 px-4 py-3 text-sm text-forest-800">
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-forest-600"
            aria-hidden="true"
          />
          Cloning your voice… this takes about 15 seconds.
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          className="rounded-md bg-forest-800 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
        >
          Clone my voice
        </button>
      </div>
    </section>
  );
}
