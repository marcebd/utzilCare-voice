import { useState } from 'react';
import VoiceCloner from '../components/clinician/VoiceCloner';
import InstructionComposer from '../components/clinician/InstructionComposer';
import ShareFlow from '../components/clinician/ShareFlow';
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
        <ShareFlow
          sessionId={state.sessionId}
          doctorName={state.doctorName}
          agentId={state.agentId}
          primaryLanguage={state.primaryLanguage}
          speed={state.speed}
          onRestart={() => {
            setState(initialState);
            setStep('clone');
          }}
        />
      ) : null}
    </main>
  );
}
