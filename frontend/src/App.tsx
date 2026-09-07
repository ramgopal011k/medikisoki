import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ConsentFlow from './pages/Kiosk/ConsentFlow';
import ChiefComplaint from './pages/Kiosk/ChiefComplaint';
import DoctorLogin from './pages/DoctorLogin';
import DoctorDashboard from './pages/Doctor/DoctorDashboard';
import InterviewFlow from './pages/InterviewFlow';
import MedicalHistoryFlow from './pages/MedicalHistoryFlow';
import DocumentUploadFlow from './pages/DocumentUploadFlow';
import AyushFlow from './pages/AyushFlow';
import TriageSummary from './pages/TriageSummary';
import RedFlagLock from './pages/Kiosk/RedFlagLock';
import PatientSubmitted from './pages/Kiosk/PatientSubmitted';
import WelcomeScreen from './pages/Kiosk/WelcomeScreen';
import PatientLogin from './pages/Patient/PatientLogin';
import PatientDashboard from './pages/Patient/PatientDashboard';
import AdminHospitals from './pages/Admin/AdminHospitals';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { AccessibilityToggle } from './components/AccessibilityToggle';

function AppRoutes() {
  const location = useLocation();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Apply idle timeout to patient flows
      if (['/consent', '/interview', '/ayush-assessment', '/medical-history'].includes(location.pathname)) {
        timeoutId = setTimeout(() => {
          // Trigger timeout
          setShowTimeout(true);
          // Clear any patient state if we had global state here
          setTimeout(() => {
            localStorage.removeItem('patient_session');
            localStorage.removeItem('patient_complaint');
            setShowTimeout(false);
            window.location.reload(); // Hard reload to reset ConsentFlow state
          }, 5000);
        }, IDLE_TIMEOUT);
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [location.pathname]);

  return (
    <>
      {showTimeout && (
        <div className="fixed inset-0 z-50 bg-charcoal/90 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-sand p-8 rounded-[16px] max-w-md text-center shadow-xl">
            <h2 className="text-2xl font-display text-charcoal mb-2">Session Ended</h2>
            <p className="text-muted font-body">For your privacy, this session has been closed due to inactivity.</p>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<AdminHospitals />} />
        
        {/* Hospital-specific entry points */}
        <Route path="/hospital/:hospitalId/kiosk" element={<WelcomeScreen />} />
        <Route path="/hospital/:hospitalId/consent" element={<ConsentFlow />} />
        <Route path="/hospital/:hospitalId/doctor" element={<DoctorLogin />} />
        
        {/* Generic fallbacks */}
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/consent" element={<ConsentFlow />} />
        <Route path="/chief-complaint" element={<ChiefComplaint />} />
        <Route path="/interview" element={<InterviewFlow />} />
        <Route path="/ayush-assessment" element={<AyushFlow />} />
        <Route path="/ayush" element={<AyushFlow />} />
        <Route path="/records-upload" element={<DocumentUploadFlow />} />
        <Route path="/upload" element={<DocumentUploadFlow />} />
        <Route path="/red-flag-alert" element={<RedFlagLock />} />
        <Route path="/submitted" element={<PatientSubmitted />} />
        <Route path="/medical-history" element={<MedicalHistoryFlow />} />
        
        {/* Patient Portal Routes */}
        <Route path="/patient/login" element={<PatientLogin />} />
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/patient" element={<Navigate to="/patient/dashboard" replace />} />

        {/* Doctor Routes */}
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/triage/:sessionId" element={<TriageSummary />} />
        <Route path="/doctor" element={<Navigate to="/doctor/dashboard" replace />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="/admin/hospitals" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AccessibilityProvider>
      <Router>
        <AppRoutes />
        <AccessibilityToggle />
      </Router>
    </AccessibilityProvider>
  );
}

export default App;
