import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MandalaBackground } from '@/components/MandalaBackground';
import { QuestionCard } from '@/components/QuestionCard';
import { API_URL } from '@/lib/api';

export default function DoctorLogin() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('doctor_token', data.token);
      localStorage.setItem('doctor_info', JSON.stringify(data.user));
      
      const dashboardUrl = hospitalId ? `/doctor/dashboard?h=${hospitalId}` : '/doctor/dashboard';
      navigate(dashboardUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center p-6 relative font-body overflow-hidden">
      <MandalaBackground />
      
      <div className="w-full max-w-md z-10">
        <QuestionCard className="py-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl text-charcoal">Doctor Login</h1>
            <p className="text-muted mt-2">Sign in to your triage dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none text-charcoal">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-[64px] border-2 border-warmgray rounded-[12px] bg-white text-charcoal px-4 focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2 font-body"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none text-charcoal">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-[64px] border-2 border-warmgray rounded-[12px] bg-white text-charcoal px-4 focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2 font-body"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-[64px] rounded-[12px] bg-primary hover:bg-primary/90 text-white text-xl font-body focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2" 
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
            
            {error && <p className="text-danger text-sm text-center mt-2">{error}</p>}
          </form>

          {import.meta.env.DEV && (
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full h-[64px] rounded-[12px] text-xl font-body border-2 border-primary text-primary hover:bg-primary hover:text-white transition"
                onClick={() => {
                  localStorage.setItem('doctor_token', 'dev_bypass_token');
                  localStorage.setItem('doctor_info', JSON.stringify({ 
                    doctor_id: 'd1111111-1111-1111-1111-111111111111',
                    name: 'Dr. Dev Bypass', 
                    email: 'doctor@demo.com',
                    hospital_id: hospitalId || '11111111-1111-1111-1111-111111111111',
                    uid: 'mock-uid'
                  }));
                  const dashboardUrl = hospitalId ? `/doctor/dashboard?h=${hospitalId}` : '/doctor/dashboard';
                  navigate(dashboardUrl);
                }}
              >
                Dev Bypass Login
              </Button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-warmgray flex flex-col gap-2 text-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/hospitals')} 
              className="border-warmgray hover:border-primary/40 text-charcoal hover:text-primary rounded-xl h-11 text-sm font-semibold"
            >
              🏥 Admin Hospital Management Portal
            </Button>
            <Button variant="link" onClick={() => navigate('/consent')} className="text-muted hover:text-charcoal flex items-center gap-2 justify-center w-full text-xs mt-1">
              <span>&larr;</span> Back to Patient Flow
            </Button>
          </div>
        </QuestionCard>
      </div>
    </div>
  );
}
