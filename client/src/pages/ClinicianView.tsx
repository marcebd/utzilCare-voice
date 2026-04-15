import { useState } from 'react';
import VoiceCloner from '../components/clinician/VoiceCloner';
import InstructionComposer from '../components/clinician/InstructionComposer';
import type { Language, Speed } from '../types';

type Step = 'clone' | 'compose' | 'share';

interface ClinicianState {
  voiceId: string | null;
  doctorName: string;
  sessionId: string | null;
  agentId: string | null;
  primaryLanguage: Language;
  speed: Speed;
}

const initialState: ClinicianState = {
  voiceId: null,
  doctorName: '',
  sessionId: null,
  agentId: null,
  primaryLanguage: 'es',
  speed: 'normal',
};

export default function ClinicianView() {
  const [step, setStep] = useState<Step>('clone');
  const [state, setState] = useState<ClinicianState>(initialState);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
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
        <InstructionComposer
          voiceId={state.voiceId}
          doctorName={state.doctorName}
          onComplete={({ sessionId, agentId, primaryLanguage, speed }) => {
            setState((prev) => ({
              ...prev,
              sessionId,
              agentId,
              primaryLanguage,
              speed,
            }));
            setStep('share');
          }}
        />
      ) : null}

      {step === 'share' && state.sessionId ? (
        <section className="rounded-xl border border-stone-200 bg-white p-8 text-stone-500">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
            Step 3 of 3
          </p>
          <h2 className="font-display mt-2 text-2xl text-stone-800">Share</h2>
          <p className="mt-2">
            Session created:{' '}
            <span className="font-mono text-stone-700">{state.sessionId}</span>
          </p>
          <p className="mt-1 text-sm">
            Patient URL + QR code + preview button land in the next commit.
          </p>
        </section>
      ) : null}
    </main>
  );
}
