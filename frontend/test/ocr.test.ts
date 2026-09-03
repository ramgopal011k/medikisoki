import { describe, it, expect, beforeAll } from 'vitest';

describe('OCR API Endpoints', () => {
  let sessionId = '';
  let documentId = '';
  const apiUrl = 'http://localhost:3001';

  beforeAll(async () => {
    const sessionRes = await fetch(`${apiUrl}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospital_id: 'H004',
        patient_name: 'OCR Test Patient',
        dummy_aadhaar: '111122223333',
        language: 'en',
        chief_complaint: 'Headache'
      })
    });
    const sessionData = await sessionRes.json();
    sessionId = sessionData.data.session_id;
  });

  it('should create a document record', async () => {
    const res = await fetch(`${apiUrl}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        file_url: 'local_blob',
        ocr_status: 'completed'
      })
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.document_id).toBeDefined();
    documentId = data.document_id;
  });

  it('should reject document creation without session_id', async () => {
    const res = await fetch(`${apiUrl}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: 'local_blob'
      })
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing session_id');
  });

  it('should save OCR extractions', async () => {
    const payload = {
      document_id: documentId,
      extractions: [
        { field_name: 'Patient Name', field_value: 'John Doe', raw_text: 'Name: John Doe', confidence: 0.95 },
        { field_name: 'Diagnosis', field_value: 'Migraine', raw_text: 'Dx: Migraine', confidence: 0.88 }
      ]
    };

    const res = await fetch(`${apiUrl}/ocr-extractions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.inserted).toBe(2);
  });

  it('should reject extractions without document_id', async () => {
    const payload = {
      extractions: [
        { field_name: 'Patient Name', field_value: 'John Doe' }
      ]
    };

    const res = await fetch(`${apiUrl}/ocr-extractions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing document_id or valid extractions array');
  });

  it('should skip extractions with empty field_value', async () => {
    const payload = {
      document_id: documentId,
      extractions: [
        { field_name: 'Patient Name', field_value: '' },
        { field_name: 'Diagnosis', field_value: 'Fever' }
      ]
    };

    const res = await fetch(`${apiUrl}/ocr-extractions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.inserted).toBe(1);
    expect(data.saved[0].field_name).toBe('Diagnosis');
  });
});
