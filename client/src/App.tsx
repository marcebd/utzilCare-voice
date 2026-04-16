import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingView from './pages/LandingView';

const ClinicianView = lazy(() => import('./pages/ClinicianView'));
const PatientView = lazy(() => import('./pages/PatientView'));

function RouteFallback() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
        Loading
      </p>
    </main>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/clinician" element={<ClinicianView />} />
        <Route path="/patient/:sessionId" element={<PatientView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
