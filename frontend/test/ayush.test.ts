import { describe, it, expect, vi, beforeAll } from 'vitest';

describe('AYUSH API Endpoints', () => {
  let sessionId = 'test-session-id';
  
  beforeAll(() => {
    vi.stubGlobal('fetch', async (url: string, options?: any) => {
      if (url.includes('/sessions') && options?.method === 'POST') {
        return { json: async () => ({ data: { session_id: sessionId } }), status: 201 };
      }
      if (url.includes('/ayush-assessment') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        if (!body.session_id) return { json: async () => ({ error: 'Missing session_id' }), status: 400 };
        if (!body.dimension) return { json: async () => ({ error: 'Missing dimension' }), status: 400 };
        if (!['prakriti', 'vikriti', 'agni', 'koshtha', 'ahara_vihara', 'sattva'].includes(body.dimension)) {
          return { json: async () => ({ error: 'Invalid dimension' }), status: 400 };
        }
        return { json: async () => ({ success: true, assessment_id: 'test-id' }), status: 201 };
      }
      if (url.includes('/ayush-assessment') && !options) {
        if (url.includes('session_id=' + sessionId)) {
          return { json: async () => ({ items: [{ dimension: 'prakriti', value: 'vata' }] }), status: 200 };
        }
        return { json: async () => ({ items: [] }), status: 200 };
      }
      return { json: async () => ({}), status: 404 };
    });
  });

  it('should save a valid AYUSH assessment', async () => {
    const res = await fetch(`http://localhost:3001/ayush-assessment`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, dimension: 'prakriti', value: 'vata' })
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('should reject missing session_id', async () => {
    const res = await fetch(`http://localhost:3001/ayush-assessment`, {
      method: 'POST',
      body: JSON.stringify({ dimension: 'prakriti', value: 'vata' })
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing session_id');
  });

  it('should reject missing dimension', async () => {
    const res = await fetch(`http://localhost:3001/ayush-assessment`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, value: 'vata' })
    });
    await res.json();
    expect(res.status).toBe(400);
  });

  it('should reject invalid dimension', async () => {
    const res = await fetch(`http://localhost:3001/ayush-assessment`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, dimension: 'invalid', value: 'vata' })
    });
    await res.json();
    expect(res.status).toBe(400);
  });

  it('should retrieve items for a session', async () => {
    const res = await fetch(`http://localhost:3001/ayush-assessment?session_id=${sessionId}`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.items.length).toBeGreaterThan(0);
  });

  it('should return empty array for non-existent session', async () => {
    const res = await fetch(`http://localhost:3001/ayush-assessment?session_id=fake`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.items.length).toBe(0);
  });
});
