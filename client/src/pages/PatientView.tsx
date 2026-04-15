import { useParams } from 'react-router-dom';

export default function PatientView() {
  const { sessionId } = useParams<{ sessionId: string }>();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p
        role="alert"
        className="rounded-md border border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        This assistant answers questions about your discharge instructions only.
        For emergencies, contact your doctor or go to the nearest clinic.
      </p>

      <header className="mt-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-600">
          Patient session
        </p>
        <h1 className="font-display mt-2 text-3xl text-stone-800">
          Your discharge instructions
        </h1>
        <p className="mt-2 font-mono text-xs text-stone-500">
          Session: {sessionId ?? 'unknown'}
        </p>
      </header>

      <section className="mt-8 rounded-lg border border-stone-200 bg-white p-8 text-stone-500">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
          Placeholder
        </p>
        <p className="mt-2 text-lg">
          Audio player, waveform, language toggle, and conversational agent
          land here.
        </p>
      </section>
    </main>
  );
}
