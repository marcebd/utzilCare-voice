import { useState } from 'react';
import VoiceCloner from '../components/clinician/VoiceCloner';

type Step = 'clone' | 'compose' | 'share';

interface ClinicianState {
  voiceId: string | null;
  doctorName: string;
  sessionId: string | null;
}

const initialState: ClinicianState = {
  voiceId: null,
  doctorName: '',
  sessionId: null,
};

export default function ClinicianView() {
  const [step, setStep] = useState<Step>('clone');
  const [state, setState] = useState<ClinicianState>(initialState);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-600">
          Clinician
        </p>
        <h1 className="font-display mt-2 text-3xl text-stone-800">
          Create voiced instructions
        </h1>
      </header>

      {step === 'clone' ? (
        <VoiceCloner
          onComplete={({ voiceId, doctorName }) => {
            setState((prev) => ({ ...prev, voiceId, doctorName }));
            setStep('compose');
          }}
        />
      ) : null}

      {step === 'compose' && state.voiceId ? (
        <section className="rounded-xl border border-stone-200 bg-white p-8 text-stone-500">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
            Step 2 of 3
          </p>
          <h2 className="font-display mt-2 text-2xl text-stone-800">
            Compose instructions
          </h2>
          <p className="mt-2">
            Instruction composer and preset library land here in the next
            commit.
          </p>
          <p className="mt-4 font-mono text-xs text-stone-400">
            voiceId: {state.voiceId} · doctor: {state.doctorName}
          </p>
        </section>
      ) : null}

      {step === 'share' && state.sessionId ? (
        <section className="rounded-xl border border-stone-200 bg-white p-8 text-stone-500">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
            Step 3 of 3
          </p>
          <h2 className="font-display mt-2 text-2xl text-stone-800">Share</h2>
          <p className="mt-2">Patient URL + QR code lands in the next commit.</p>
        </section>
      ) : null}
    </main>
  );
}
