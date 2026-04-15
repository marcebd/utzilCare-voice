import { Routes, Route, Navigate } from 'react-router-dom';
import LandingView from './pages/LandingView';
import ClinicianView from './pages/ClinicianView';
import PatientView from './pages/PatientView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingView />} />
      <Route path="/clinician" element={<ClinicianView />} />
      <Route path="/patient/:sessionId" element={<PatientView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
