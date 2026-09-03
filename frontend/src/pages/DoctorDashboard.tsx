import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';
import { QuestionCard } from '@/components/QuestionCard';

interface DoctorInfo {
  doctor_id: string;
  name: string;
  email: string;
  hospital_id: string;
  uid: string;
}

interface PatientSession {
  session_id: string;
  hospital_id: string;
  patient_name: string;
  dummy_aadhaar: string;
  language: string;
  chief_complaint: string;
  session_token: string;
  created_at: string;
  red_flag_count?: number;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();

  // Read initial state from localStorage synchronously to avoid setState-in-effect
  const [doctorInfo] = useState<DoctorInfo | null>(() => {
    const info = localStorage.getItem('doctor_info');
    const token = localStorage.getItem('doctor_token');
    if (!token || !info) return null;
    try { return JSON.parse(info) as DoctorInfo; } catch { return null; }
  });

  const [patients, setPatients] = useState<PatientSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPatients = useCallback(async (hId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/sessions?hospital_id=${hId}`);
      const data = await res.json();
      if (data.data) {
        setPatients(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Redirect if not logged in, otherwise fetch patients
  useEffect(() => {
    if (!doctorInfo) {
      navigate('/doctor/login');
      return;
    }
    // Fetch is an external side effect — this is the intended use of useEffect.
    // The setState calls inside fetchPatients are async (after await), not synchronous.
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:3001/sessions?hospital_id=${doctorInfo.hospital_id}`);
        const data = await res.json();
        if (!cancelled && data.data) {
          setPatients(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch patients:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [doctorInfo, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('doctor_token');
    localStorage.removeItem('doctor_info');
    navigate('/doctor/login');
  };

  if (!doctorInfo) return null;

  return (
    <div className="min-h-screen bg-sand font-body">
      {/* Header */}
      <header className="bg-white border-b border-warmgray px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-display text-charcoal">Doctor Dashboard</h1>
          <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full font-body">
            {doctorInfo.hospital_id}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-muted font-body">Dr. {doctorInfo.name}</span>
          <Button variant="outline" className="border-terracotta text-terracotta hover:bg-terracotta/10 rounded-[12px] h-[64px] px-6 font-body text-base transition-colors focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-display text-charcoal mb-1">Active Patients</h2>
            <p className="text-muted font-body">Patients currently awaiting triage</p>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-white rounded-[12px] h-[64px] px-6 font-body text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2"
            onClick={() => fetchPatients(doctorInfo.hospital_id)}
          >
            Refresh List
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
             <p className="text-muted font-body text-lg animate-pulse">Loading patients...</p>
          </div>
        ) : patients.length === 0 ? (
          <QuestionCard className="flex flex-col items-center justify-center py-32 border-dashed border-2 bg-transparent shadow-none">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
              <ClipboardList className="w-10 h-10 text-primary opacity-50" />
            </div>
            <h3 className="text-2xl font-display text-charcoal mb-2">No patients yet</h3>
            <p className="text-muted text-lg max-w-sm text-center font-body">
              When patients complete the kiosk registration and interview, they will appear here.
            </p>
          </QuestionCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map(p => (
              <QuestionCard key={p.session_id} className="p-6">
                 <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-display text-charcoal flex items-center gap-2">
                      {p.patient_name}
                      {(p.red_flag_count || 0) > 0 && (
                        <span className="bg-danger text-white text-xs px-2 py-0.5 rounded-full font-body font-semibold">
                          Urgent
                        </span>
                      )}
                    </h3>
                    <span className="text-sm font-body text-muted">{new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                 </div>
                 <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm font-body border-b border-warmgray pb-2">
                       <span className="text-muted">Aadhaar:</span>
                       <span className="text-charcoal font-semibold">xxxx-xxxx-{p.dummy_aadhaar.slice(-4)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-body border-b border-warmgray pb-2">
                       <span className="text-muted">Complaint:</span>
                       <span className="text-charcoal font-semibold">{p.chief_complaint}</span>
                    </div>
                 </div>
                 <Button 
                   className="w-full bg-white text-primary border-2 border-primary/20 hover:border-primary hover:bg-primary/5 h-[48px] rounded-[12px] font-body focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2"
                   onClick={() => navigate(`/doctor/triage/${p.session_id}`)}
                 >
                   View Triage Summary
                 </Button>
              </QuestionCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
