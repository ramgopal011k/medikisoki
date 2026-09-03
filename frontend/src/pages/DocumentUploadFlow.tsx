import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { Camera, UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import { MandalaBackground } from '../components/MandalaBackground';
import { QuestionCard } from '../components/QuestionCard';

interface ExtractedField {
  field_name: string;
  field_value: string;
  raw_text: string;
  confidence: number;
}

export default function DocumentUploadFlow() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [session] = useState(() => {
    const sessionId = localStorage.getItem('patient_session');
    const lang = localStorage.getItem('patient_language') || 'en';
    if (!sessionId) return null;
    return { id: sessionId, language: lang };
  });

  const [documentId, setDocumentId] = useState<string | null>(null);
  const [_isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rawText, setRawText] = useState('');
  const [extractions, setExtractions] = useState<ExtractedField[]>([
    { field_name: 'Patient Name', field_value: '', raw_text: '', confidence: 1 },
    { field_name: 'Diagnosis', field_value: '', raw_text: '', confidence: 1 },
    { field_name: 'Medications', field_value: '', raw_text: '', confidence: 1 }
  ]);

  const [step, setStep] = useState<'upload' | 'processing' | 'correction' | 'success'>('upload');

  useEffect(() => {
    if (!session) {
      navigate('/consent');
    }
  }, [session, navigate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;

    // Create document record on backend first
    try {
      const res = await fetch('http://localhost:3001/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          file_url: 'local_blob',
          ocr_status: 'processing'
        })
      });
      const data = await res.json();
      if (data.document_id) setDocumentId(data.document_id);
    } catch (err) {
      console.error(err);
    }

    setStep('processing');
    setIsProcessing(true);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });
      
      const text = result.data.text;
      setRawText(text);

      // Simple heuristic mapping
      const updatedExtractions = [...extractions];
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Look for keywords
      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('name:') || lower.includes('patient:')) {
          updatedExtractions[0].field_value = line.split(':')[1]?.trim() || line;
          updatedExtractions[0].raw_text = line;
          updatedExtractions[0].confidence = result.data.confidence / 100;
        } else if (lower.includes('dx:') || lower.includes('diagnosis:')) {
          updatedExtractions[1].field_value = line.split(':')[1]?.trim() || line;
          updatedExtractions[1].raw_text = line;
          updatedExtractions[1].confidence = result.data.confidence / 100;
        } else if (lower.includes('rx') || lower.includes('tab') || lower.includes('cap')) {
          updatedExtractions[2].field_value += line + '\n';
          updatedExtractions[2].raw_text += line + '\n';
          updatedExtractions[2].confidence = result.data.confidence / 100;
        }
      });

      setExtractions(updatedExtractions);
      setStep('correction');
    } catch (err) {
      console.error(err);
      setStep('correction'); // Still go to correction to let them type manually
    } finally {
      setIsProcessing(false);
    }
  };

  const updateExtraction = (index: number, value: string) => {
    const updated = [...extractions];
    updated[index].field_value = value;
    setExtractions(updated);
  };

  const handleSave = async () => {
    if (!session || !documentId) return;

    try {
      const res = await fetch('http://localhost:3001/ocr-extractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          extractions
        })
      });
      
      if (res.ok) {
        setStep('success');
        setTimeout(() => navigate('/medical-history'), 2000);
      } else {
        alert('Failed to save extracted data');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving data');
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-sand flex flex-col p-6 relative overflow-hidden font-body">
      <MandalaBackground />
      
      <div className="z-10 w-full max-w-4xl mx-auto mt-12 flex flex-col gap-6">
        
        {step === 'upload' && (
          <QuestionCard className="text-center p-12">
            <h1 className="font-display text-4xl text-charcoal mb-4">
              {session.language === 'hi' ? 'पुराने रिकॉर्ड अपलोड करें' : 'Upload Past Medical Records'}
            </h1>
            <p className="text-muted text-xl mb-12">
              {session.language === 'hi' 
                ? 'बेहतर निदान के लिए अपनी पुरानी प्रिस्क्रिप्शन या रिपोर्ट की तस्वीर लें।' 
                : 'Take a picture of your previous prescriptions or reports for a better diagnosis.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-64 min-h-[160px] rounded-[16px] bg-primary/10 hover:bg-primary/20 border-2 border-primary/30 flex flex-col items-center justify-center transition-colors"
              >
                <Camera className="w-12 h-12 text-primary mb-4" />
                <span className="text-xl font-bold text-primary">Open Camera</span>
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-64 min-h-[160px] rounded-[16px] bg-white hover:bg-sand border-2 border-warmgray flex flex-col items-center justify-center transition-colors"
              >
                <UploadCloud className="w-12 h-12 text-muted mb-4" />
                <span className="text-xl font-bold text-charcoal">Upload File</span>
              </button>
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />

            <div className="mt-12">
              <button 
                onClick={() => navigate('/medical-history')}
                className="text-muted hover:text-charcoal underline underline-offset-4"
              >
                Skip this step
              </button>
            </div>
          </QuestionCard>
        )}

        {step === 'processing' && (
          <QuestionCard className="text-center p-16">
             <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
             <h2 className="font-display text-3xl text-charcoal mb-4">Scanning Document...</h2>
             <div className="w-full max-w-md mx-auto bg-warmgray rounded-full h-4 mb-4 overflow-hidden">
               <div className="bg-primary h-4 transition-all duration-300" style={{ width: `${progress}%` }}></div>
             </div>
             <p className="text-primary font-bold text-lg">{progress}% Complete</p>
          </QuestionCard>
        )}

        {step === 'correction' && (
          <QuestionCard className="p-8">
            <h2 className="font-display text-3xl text-charcoal mb-2">Review Extracted Info</h2>
            <p className="text-muted mb-8">Please check the fields below and correct any mistakes.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-sand/50 p-6 rounded-[12px] border border-warmgray max-h-[400px] overflow-y-auto">
                 <h3 className="font-bold text-charcoal mb-4">Raw Scanned Text</h3>
                 <pre className="text-sm text-muted whitespace-pre-wrap font-sans">
                   {rawText || 'No text could be extracted.'}
                 </pre>
               </div>

               <div className="space-y-6">
                 {extractions.map((field, idx) => (
                   <div key={field.field_name} className="flex flex-col">
                     <label className="text-sm font-bold text-charcoal mb-2 flex items-center gap-2">
                       {field.field_name}
                       {field.confidence < 0.5 && field.field_value ? (
                         <span className="flex items-center gap-1 text-danger text-xs px-2 py-0.5 bg-danger/10 rounded-full">
                           <AlertTriangle className="w-3 h-3" /> Low Confidence
                         </span>
                       ) : null}
                     </label>
                     <input
                       type="text"
                       className="p-4 border-2 border-warmgray rounded-[12px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                       value={field.field_value}
                       onChange={e => updateExtraction(idx, e.target.value)}
                       placeholder={`Enter ${field.field_name.toLowerCase()}`}
                     />
                   </div>
                 ))}

                 <button 
                   onClick={handleSave}
                   className="w-full p-4 mt-4 bg-primary text-white text-xl font-bold rounded-[12px] hover:bg-primary/90 transition-colors"
                 >
                   Confirm & Save
                 </button>
               </div>
            </div>
          </QuestionCard>
        )}

        {step === 'success' && (
          <QuestionCard className="text-center p-16">
            <CheckCircle className="w-20 h-20 text-success mx-auto mb-6" />
            <h2 className="font-display text-3xl text-charcoal mb-4">Saved Successfully</h2>
            <p className="text-muted text-xl">Routing you to Medical History...</p>
          </QuestionCard>
        )}

      </div>
    </div>
  );
}
