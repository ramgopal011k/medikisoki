import React from 'react';
import { CheckCircle } from 'lucide-react';
import { MandalaBackground } from '../../components/MandalaBackground';

export default function PatientSubmitted() {
  return (
    <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 relative overflow-hidden font-body">
      <MandalaBackground />
      <div className="w-full max-w-2xl z-10 flex flex-col items-center text-center bg-white p-12 rounded-[24px] shadow-xl border-2 border-primary/20">
        <CheckCircle className="w-24 h-24 text-primary mb-8" />
        <h1 className="text-4xl font-display font-bold text-charcoal mb-6">
          Thank you!
        </h1>
        <p className="text-2xl text-muted font-semibold">
          Your information has been successfully submitted. Please wait for the doctor.
        </p>
      </div>
    </div>
  );
}
