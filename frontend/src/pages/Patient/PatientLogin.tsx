import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { MandalaBackground } from '../../components/MandalaBackground';
import { QuestionCard } from '../../components/QuestionCard';

export default function PatientLogin() {
  const [abhaId, setAbhaId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (abhaId.length !== 14) {
      setError('Please enter a valid 14-digit ABHA ID.');
      return;
    }
    
    // For the hackathon, we simply store the ABHA ID in localStorage to represent the logged-in patient
    localStorage.setItem('logged_in_abha_id', abhaId);
    navigate('/patient/dashboard');
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 relative overflow-hidden font-body text-charcoal">
      <MandalaBackground />
      
      <div className="w-full max-w-[768px] z-10">
        <QuestionCard className="w-full text-center">
          <div className="mb-8">
             <h1 className="font-display text-4xl text-charcoal mb-2">Patient Portal</h1>
             <h2 className="text-muted text-lg">Log in to view your medical history</h2>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6 max-w-sm mx-auto">
            <div>
              <input 
                type="text" 
                placeholder="14-digit ABHA ID"
                className="w-full text-center text-2xl tracking-[0.2em] p-4 min-h-[56px] border-2 border-warmgray rounded-[12px] bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body"
                value={abhaId}
                onChange={e => {
                  setError('');
                  setAbhaId(e.target.value.replace(/\D/g, '').slice(0, 14));
                }}
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
            
            <Button 
              type="submit"
              className="w-full min-h-[56px] text-lg rounded-[12px] bg-primary hover:bg-primary/90 text-white font-body" 
              disabled={abhaId.length < 14}
            >
              Access Dashboard
            </Button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-warmgray/30 text-sm text-muted">
            <p>Don't have an ABHA ID? Register at the kiosk to get started.</p>
          </div>
        </QuestionCard>
      </div>
    </div>
  );
}
