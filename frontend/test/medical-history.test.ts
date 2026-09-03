import { describe, it, expect } from 'vitest';

const API_URL = 'http://localhost:3001';

describe('Medical History Endpoints', () => {
  let testSessionId = '';

  it('Creates a session first (setup)', async () => {
    const res = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospital_id: 'H001',
        dummy_aadhaar: '123456789012',
        language: 'en',
        chief_complaint: 'Chest pain'
      })
    });
    const data = await res.json();
    testSessionId = data.data.session_id;
    expect(testSessionId).toBeDefined();
  });

  it('POST /medical-history: valid payload succeeds', async () => {
    const payload = {
      session_id: testSessionId,
      items: [
        { category: 'Allergies', value: 'Peanuts' },
        { category: 'Conditions', value: 'Diabetes' }
      ]
    };

    const res = await fetch(`${API_URL}/medical-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.inserted).toBe(2);
  });

  it('POST /medical-history: missing session_id rejected', async () => {
    const payload = {
      items: [{ category: 'Allergies', value: 'Peanuts' }]
    };

    const res = await fetch(`${API_URL}/medical-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('POST /medical-history: missing category rejected', async () => {
    const payload = {
      session_id: testSessionId,
      items: [
        { value: 'Peanuts' } // missing category
      ]
    };

    const res = await fetch(`${API_URL}/medical-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('POST /medical-history: invalid category rejected', async () => {
    const payload = {
      session_id: testSessionId,
      items: [
        { category: 'InvalidCategory', value: 'Something' }
      ]
    };

    const res = await fetch(`${API_URL}/medical-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('GET /medical-history: returns items for valid session', async () => {
    const res = await fetch(`${API_URL}/medical-history/${testSessionId}`);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toBeDefined();
    expect(data.items.length).toBe(2); // From the first test
    expect(data.items[0].category).toBe('Allergies');
    expect(data.items[1].category).toBe('Conditions');
  });

  it('GET /medical-history: returns empty for session with no history', async () => {
    const res = await fetch(`${API_URL}/medical-history/unknown_session_id_123`);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toBeDefined();
    expect(data.items.length).toBe(0);
  });

  it('GET /medical-history: missing session_id rejected', async () => {
    // Calling /medical-history without a session ID will hit the POST endpoint without a body
    // or a 404 depending on the Express route configuration. Let's assume it hits 404 for GET /medical-history/
    const res = await fetch(`${API_URL}/medical-history/`);
    
    // In express, GET /medical-history/ without an ID might 404 if not defined
    expect(res.status).toBe(404);
  });
});
