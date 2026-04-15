import { Link } from 'react-router-dom';

export default function LandingView() {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-600">
        UtzilCare Voice
      </p>
      <h1 className="font-display mt-3 text-4xl leading-tight text-stone-800 md:text-5xl">
        Discharge instructions in your doctor&apos;s voice.
      </h1>
      <p className="mt-5 max-w-2xl text-base text-stone-600 md:text-lg">
        Post-operative care, spoken aloud in the language the patient
        understands, by a voice they already trust. Built on ElevenLabs.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/clinician"
          className="rounded-md bg-forest-800 px-5 py-3 text-center text-sm font-medium text-white shadow-sm transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-cream"
        >
          I&apos;m a clinician
        </Link>
        <Link
          to="/patient/demo"
          className="rounded-md border border-stone-300 bg-white px-5 py-3 text-center text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 focus:ring-offset-cream"
        >
          See the patient view (demo)
        </Link>
      </div>

      <p className="mt-12 text-xs text-stone-500">
        Open-source, MIT licensed.{' '}
        <a
          href="https://github.com/marcebd/utzilCare-voice"
          className="underline decoration-stone-300 underline-offset-2 hover:decoration-stone-500"
        >
          github.com/marcebd/utzilCare-voice
        </a>
      </p>
    </main>
  );
}
