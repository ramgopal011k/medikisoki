import { describe, it, expect, beforeAll } from 'vitest';

describe('AYUSH API Endpoints', () => {
  let sessionId = '';
  const apiUrl = 'http://localhost:3001';

  beforeAll(async () => {
    // Create a session to use for tests
    const sessionRes = await fetch(`${apiUrl}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospital_id: 'H003',
        patient_name: 'AYUSH Test Patient',
        dummy_aadhaar: '111122223333',
        language: 'en',
        chief_complaint: 'Joint pain'
      })
    });
    const sessionData = await sessionRes.json();
    sessionId = sessionData.data.session_id;
  });

  it('should save a valid AYUSH assessment', async () => {
    const payload = {
      session_id: sessionId,
      dimension: 'prakriti',
      value: 'vata'
    };

    const res = await fetch(`${apiUrl}/ayush-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.assessment_id).toBeDefined();
  });

  it('should reject missing session_id', async () => {
    const payload = {
      dimension: 'vikriti',
      value: 'joint'
    };

    const res = await fetch(`${apiUrl}/ayush-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing session_id');
  });

  it('should reject missing dimension', async () => {
    const payload = {
      session_id: sessionId,
      value: 'joint'
    };

    const res = await fetch(`${apiUrl}/ayush-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing dimension');
  });

  it('should reject invalid dimension', async () => {
    const payload = {
      session_id: sessionId,
      dimension: 'fake_dimension',
      value: 'joint'
    };

    const res = await fetch(`${apiUrl}/ayush-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid dimension');
  });

  it('should retrieve items for a session', async () => {
    const res = await fetch(`${apiUrl}/ayush-assessment?session_id=${sessionId}`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0].dimension).toBe('prakriti');
  });

  it('should return empty array for non-existent session', async () => {
    const res = await fetch(`${apiUrl}/ayush-assessment?session_id=fake-session-id`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBe(0);
  });
});
