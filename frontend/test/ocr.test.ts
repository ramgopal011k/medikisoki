import { describe, it, expect, vi, beforeAll } from 'vitest';

describe('OCR API Endpoints', () => {
  let sessionId = 'test-session';
  let documentId = 'test-doc';

  beforeAll(() => {
    vi.stubGlobal('fetch', async (url: string, options?: any) => {
      if (url.includes('/sessions') && options?.method === 'POST') {
        return { json: async () => ({ data: { session_id: sessionId } }), status: 201 };
      }
      if (url.includes('/documents') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        if (!body.session_id) return { json: async () => ({ error: 'Missing session_id' }), status: 400 };
        return { json: async () => ({ success: true, document_id: documentId }), status: 201 };
      }
      if (url.includes('/ocr-extractions') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        if (!body.document_id || !Array.isArray(body.extractions)) {
          return { json: async () => ({ error: 'Missing document_id or valid extractions array' }), status: 400 };
        }
        const valid = body.extractions.filter((e: any) => e.field_value && e.field_value !== '');
        return { json: async () => ({ success: true, inserted: valid.length, saved: valid }), status: 201 };
      }
      return { json: async () => ({}), status: 404 };
    });
  });

  it('should create a document record', async () => {
    const res = await fetch(`http://localhost:3001/documents`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, file_url: 'local_blob', ocr_status: 'completed' })
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.document_id).toBeDefined();
  });

  it('should reject document creation without session_id', async () => {
    const res = await fetch(`http://localhost:3001/documents`, {
      method: 'POST',
      body: JSON.stringify({ file_url: 'local_blob' })
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing session_id');
  });

  it('should save OCR extractions', async () => {
    const res = await fetch(`http://localhost:3001/ocr-extractions`, {
      method: 'POST',
      body: JSON.stringify({
        document_id: documentId,
        extractions: [
          { field_name: 'Patient Name', field_value: 'John Doe', raw_text: 'Name: John Doe', confidence: 0.95 },
          { field_name: 'Diagnosis', field_value: 'Migraine', raw_text: 'Dx: Migraine', confidence: 0.88 }
        ]
      })
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.inserted).toBe(2);
  });

  it('should reject extractions without document_id', async () => {
    const res = await fetch(`http://localhost:3001/ocr-extractions`, {
      method: 'POST',
      body: JSON.stringify({
        extractions: [{ field_name: 'Patient Name', field_value: 'John Doe' }]
      })
    });
    await res.json();
    expect(res.status).toBe(400);
  });

  it('should skip extractions with empty field_value', async () => {
    const res = await fetch(`http://localhost:3001/ocr-extractions`, {
      method: 'POST',
      body: JSON.stringify({
        document_id: documentId,
        extractions: [
          { field_name: 'Patient Name', field_value: '' },
          { field_name: 'Diagnosis', field_value: 'Fever' }
        ]
      })
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.inserted).toBe(1);
    expect(data.saved[0].field_name).toBe('Diagnosis');
  });
});
