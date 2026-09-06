import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClipboardList, AlertTriangle, Search, RefreshCw, Activity, User, ShieldCheck, HeartPulse, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/api';

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
  status?: string;
  session_token: string;
  created_at: string;
  red_flag_count?: number;
}

interface HospitalItem {
  hospital_id: string;
  hospital_name: string;
  hospital_type?: string;
  location?: string;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlHospitalId = queryParams.get('h');

  // Read initial state from localStorage synchronously
  const [doctorInfo] = useState<DoctorInfo | null>(() => {
    const info = localStorage.getItem('doctor_info');
    const token = localStorage.getItem('doctor_token');
    if (!token || !info) return null;
    try { return JSON.parse(info) as DoctorInfo; } catch { return null; }
  });

  const [patients, setPatients] = useState<PatientSession[]>([]);
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'normal'>('all');
  const [view, setView] = useState<'pending' | 'verified'>('pending');
  const [selectedHospital, setSelectedHospital] = useState<string>(urlHospitalId || 'all');

  // Fetch registered hospitals dynamically
  useEffect(() => {
    fetch(`${API_URL}/api/hospitals`)
      .then(res => res.json())
      .then(data => {
        if (data.data && Array.isArray(data.data)) {
          setHospitals(data.data);
        }
      })
      .catch(err => console.error('Failed to load registered hospitals:', err));
  }, []);

  const fetchPatients = useCallback(async (hId: string, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const url = hId === 'all' 
        ? `${API_URL}/api/sessions` 
        : `${API_URL}/api/sessions?hospital_id=${hId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.data) {
        setPatients(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Initialize selected hospital from doctorInfo if available
  useEffect(() => {
    if (!doctorInfo) {
      navigate('/doctor/login');
      return;
    }
    // Default to 'all' or doctor's assigned hospital
    fetchPatients(selectedHospital);
  }, [doctorInfo, navigate, selectedHospital, fetchPatients]);

  // Periodic poll + realtime subscriptions
  useEffect(() => {
    if (!doctorInfo) return;

    // Periodic poll every 6s as backup
    const interval = setInterval(() => {
      fetchPatients(selectedHospital, true);
    }, 6000);
    
    // Subscribe to realtime updates across sessions, answers, medical_history, red_flags
    const channel = supabase
      .channel('doctor-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        (payload) => {
          console.log('Realtime sessions update:', payload);
          fetchPatients(selectedHospital, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers' },
        (payload) => {
          console.log('Realtime answers update:', payload);
          fetchPatients(selectedHospital, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medical_history' },
        (payload) => {
          console.log('Realtime medical history update:', payload);
          fetchPatients(selectedHospital, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'red_flags' },
        (payload) => {
          console.log('Realtime red flags update:', payload);
          fetchPatients(selectedHospital, true);
        }
      )
      .subscribe();

    return () => { 
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [doctorInfo, selectedHospital, fetchPatients]);

  const handleLogout = () => {
    localStorage.removeItem('doctor_token');
    localStorage.removeItem('doctor_info');
    navigate('/doctor/login');
  };

  if (!doctorInfo) return null;

  const activePatients = patients.filter(p => p.status !== 'verified');
  const verifiedPatients = patients.filter(p => p.status === 'verified');
  
  const urgentCount = activePatients.filter(p => (p.red_flag_count || 0) > 0).length;
  const totalCount = activePatients.length;

  const currentList = view === 'pending' ? activePatients : verifiedPatients;

  const filteredPatients = currentList.filter(p => {
    const matchesSearch = 
      (p.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.chief_complaint || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.dummy_aadhaar || '').includes(searchTerm);

    if (!matchesSearch) return false;
    if (filter === 'urgent') return (p.red_flag_count || 0) > 0;
    if (filter === 'normal') return (p.red_flag_count || 0) === 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-sand font-body text-charcoal">
      {/* Header */}
      <header className="bg-white border-b border-warmgray px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-display font-bold text-charcoal">MediKiosk Triage</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-success/10 px-3 py-1 rounded-full border border-success/20">
            <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            <span className="text-success text-xs font-semibold font-body uppercase tracking-wider">Live Queue</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Hospital Switcher */}
          <div className="hidden md:flex items-center gap-2 bg-sand/60 px-3 py-1.5 rounded-xl border border-warmgray text-xs">
            <Building2 className="w-4 h-4 text-muted" />
            <select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              className="bg-transparent font-semibold text-charcoal focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="all">All Facilities</option>
              {hospitals.map(h => (
                <option key={h.hospital_id} value={h.hospital_id}>
                  {h.hospital_name} {h.hospital_type ? `(${h.hospital_type})` : ''}
                </option>
              ))}
              {hospitals.length === 0 && (
                <>
                  <option value="11111111-1111-1111-1111-111111111111">City General Hospital</option>
                  <option value="22222222-2222-2222-2222-222222222222">Ayush Wellness Center</option>
                </>
              )}
            </select>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate('/admin/hospitals')}
            className="hidden sm:inline-flex items-center gap-1.5 border-primary/40 text-primary hover:bg-primary/10 rounded-xl h-10 px-3 text-xs font-semibold transition shadow-2xs"
            title="Manage Registered Hospitals"
          >
            <Building2 className="w-3.5 h-3.5" />
            Admin Portal
          </Button>

          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-charcoal">Dr. {doctorInfo.name}</div>
            <div className="text-xs text-muted">ID: {doctorInfo.doctor_id.slice(0, 8)}...</div>
          </div>
          <Button 
            variant="outline" 
            className="border-warmgray text-charcoal hover:bg-warmgray/20 rounded-xl h-10 px-4 text-sm font-body" 
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white p-5 rounded-2xl border border-warmgray shadow-xs flex items-center justify-between">
            <div>
              <p className="text-sm text-muted font-medium">Total In Queue</p>
              <h3 className="text-3xl font-display font-bold text-charcoal mt-1">{totalCount}</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <ClipboardList className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-danger/30 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-sm text-danger font-semibold">Urgent / Red Flags</p>
              <h3 className="text-3xl font-display font-bold text-danger mt-1">{urgentCount}</h3>
            </div>
            <div className="p-3 bg-danger/10 text-danger rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-warmgray shadow-xs flex items-center justify-between">
            <div>
              <p className="text-sm text-muted font-medium">System Status</p>
              <h3 className="text-xl font-display font-semibold text-success mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5" /> Live Syncing
              </h3>
            </div>
            <div className="p-3 bg-success/10 text-success rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Toolbar: View Tabs, Search, Filters, Refresh */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-warmgray shadow-xs">
          
          {/* View Tabs */}
          <div className="flex bg-sand/60 p-1 rounded-xl border border-warmgray text-sm font-semibold w-full xl:w-auto overflow-x-auto">
            <button
              onClick={() => setView('pending')}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${view === 'pending' ? 'bg-white text-charcoal shadow-xs' : 'text-muted hover:text-charcoal'}`}
            >
              Pending Verification ({activePatients.length})
            </button>
            <button
              onClick={() => setView('verified')}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${view === 'verified' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-charcoal'}`}
            >
              Verified Reports ({verifiedPatients.length})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, complaint..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-sand/60 border border-warmgray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex bg-sand/60 p-1 rounded-xl border border-warmgray text-xs font-semibold">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${filter === 'all' ? 'bg-white text-charcoal shadow-xs' : 'text-muted hover:text-charcoal'}`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setFilter('urgent')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${filter === 'urgent' ? 'bg-danger text-white shadow-xs' : 'text-muted hover:text-danger'}`}
              >
                Urgent ({urgentCount})
              </button>
              <button
                onClick={() => setFilter('normal')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${filter === 'normal' ? 'bg-white text-charcoal shadow-xs' : 'text-muted hover:text-charcoal'}`}
              >
                Routine ({totalCount - urgentCount})
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="border-warmgray hover:bg-sand rounded-xl h-9 px-3 gap-1.5 text-xs font-medium"
              onClick={() => fetchPatients(selectedHospital)}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          </div>
        </div>

        {/* Patient Grid */}
        {isLoading && patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-warmgray">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-muted font-medium">Fetching triage queue...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-warmgray text-center p-6">
            <div className="w-16 h-16 bg-sand rounded-full flex items-center justify-center mb-4 text-muted">
              <ClipboardList className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-display font-semibold text-charcoal mb-1">No patients in queue</h3>
            <p className="text-muted text-sm max-w-sm">
              {patients.length === 0 
                ? 'When patients complete intake at the kiosk, their summarized triage cards will appear here in real time.'
                : 'Try adjusting your search term or filter tabs.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map(p => {
              const isUrgent = (p.red_flag_count || 0) > 0;
              const formattedTime = new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const formattedDate = new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <div 
                  key={p.session_id} 
                  className={`bg-white rounded-2xl border-2 transition-all duration-300 shadow-xs hover:shadow-md p-6 flex flex-col justify-between ${
                    isUrgent ? 'border-danger/60 bg-danger/[0.02]' : 'border-warmgray hover:border-primary/40'
                  }`}
                >
                  <div>
                    {/* Card Top */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          isUrgent ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
                        }`}>
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-display text-lg font-bold text-charcoal">{p.patient_name}</h4>
                          <span className="text-xs text-muted">{formattedDate} • {formattedTime}</span>
                        </div>
                      </div>

                      {isUrgent && (
                        <span className="flex items-center gap-1 bg-danger text-white text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse shadow-xs">
                          <AlertTriangle className="w-3.5 h-3.5" /> Urgent
                        </span>
                      )}
                    </div>

                    {/* Information Rows */}
                    <div className="space-y-2.5 text-sm my-4 bg-sand/40 p-3.5 rounded-xl border border-warmgray/50">
                      <div className="flex justify-between items-center">
                        <span className="text-muted text-xs uppercase font-semibold">Chief Complaint</span>
                        <span className="font-semibold text-charcoal">{p.chief_complaint}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted text-xs uppercase font-semibold">ABHA / Aadhaar</span>
                        <span className="font-mono text-xs text-charcoal bg-white px-2 py-0.5 rounded border border-warmgray">
                          •••• {p.dummy_aadhaar ? p.dummy_aadhaar.slice(-4) : '0000'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted text-xs uppercase font-semibold">Language</span>
                        <span className="uppercase text-xs font-bold text-muted bg-white px-2 py-0.5 rounded border border-warmgray">
                          {p.language || 'en'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button 
                    className={`w-full mt-2 h-12 rounded-xl text-base font-semibold shadow-xs transition-colors ${
                      isUrgent
                        ? 'bg-danger hover:bg-danger/90 text-white'
                        : 'bg-primary hover:bg-primary/90 text-white'
                    }`}
                    onClick={() => navigate(`/doctor/triage/${p.session_id}`)}
                  >
                    View Triage Summary
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

