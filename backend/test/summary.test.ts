import assert from 'assert';

// Mock supabase client
const mockBuilder: any = {
  select: () => mockBuilder,
  insert: () => Promise.resolve(),
  update: () => mockBuilder,
  eq: () => mockBuilder,
  order: () => Promise.resolve({ data: [
    { question_id: 'q_pain', answer_text: 'throbbing', provenance: 'patient_reported' },
    { question_id: 'ocr_medication', answer_text: 'aspirin', provenance: 'ocr_extracted' }
  ], error: null }),
  single: () => Promise.resolve({ data: { id: 's1', chief_complaint: 'Headache' }, error: null }),
  maybeSingle: () => Promise.resolve({ data: null, error: null })
};

const supabaseMock = {
  from: (table: string) => {
    if (table === 'medical_history') {
      return {
        ...mockBuilder,
        select: () => ({ eq: () => Promise.resolve({ data: [
          { category: 'Past Medical History', value: 'Diabetes' }
        ], error: null }) })
      };
    }
    if (table === 'ayush_assessments') {
      return {
        ...mockBuilder,
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) })
      };
    }
    if (table === 'answers') {
        return {
          ...mockBuilder,
          select: () => ({ eq: () => ({ order: mockBuilder.order }) })
        };
    }
    if (table === 'sessions') {
      return {
        ...mockBuilder,
        select: () => ({ eq: () => ({ single: mockBuilder.single }) })
      };
    }
    return mockBuilder;
  }
};

// Hack to mock required modules in node
require.cache[require.resolve('../src/supabase')] = {
  id: require.resolve('../src/supabase'),
  filename: require.resolve('../src/supabase'),
  loaded: true,
  exports: { supabase: supabaseMock }
} as any;

import { generateTriageSummary } from '../src/summary';

async function runTests() {
  console.log('Running summary.test.ts...');
  
  // Test 1: generates distinct clinical sections
  const result = await generateTriageSummary('s1');
  const summary = result.summary;
  
  assert.strictEqual(summary.chief_complaint, 'Headache', 'Chief complaint should be Headache');
  assert.ok(summary.hpi.some((h: string) => h.includes('pain: throbbing')), 'HPI should contain pain details');
  assert.ok(summary.pmh.some((p: string) => p.includes('Diabetes')), 'PMH should contain Diabetes');
  assert.deepStrictEqual(summary.psh, ['None reported'], 'PSH should be empty');
  
  console.log('PASS: generates distinct clinical sections');

  console.log('All tests passed.');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
