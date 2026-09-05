import { supabase } from './supabase';

const RED_FLAG_RULES = [
  { id: 'R1', condition: (answerText: string, _: any[], questionId: string) => (answerText === '7-10 Severe' && questionId === 'q_chest_severity') || (answerText === 'Worst headache of my life' && questionId === 'q_headache_severity') },
  { id: 'R2', condition: (answerText: string, _: any[], questionId: string) => answerText === 'Left arm' && questionId === 'q_chest_radiation' },
  { id: 'R3', condition: (answerText: string, _: any[], questionId: string) => answerText === 'Yes' && questionId === 'q_chest_breath' },
  { id: 'R4', condition: (answerText: string, _: any[], questionId: string) => answerText === 'Yes' && questionId === 'q_cough_blood' },
  { id: 'R5', condition: (answerText: string, _: any[], questionId: string) => answerText === 'High >103' && questionId === 'q_fever_temp' }
];

export async function evaluateAnswer(answer: any) {
  const { data: allAnswers } = await supabase
    .from('answers')
    .select('*')
    .eq('session_id', answer.session_id);

  if (!allAnswers) return;

  let isFlagged = false;
  let ruleIdTriggered = null;

  console.log(`Evaluating answer for session ${answer.session_id}: question_id=${answer.question_id}, answer_text=${answer.answer_text}`);

  for (const rule of RED_FLAG_RULES) {
    if (rule.condition(answer.answer_text, allAnswers, answer.question_id)) {
      console.log(`FLAGGED! Rule ${rule.id} triggered by answer_text=${answer.answer_text}`);
      isFlagged = true;
      ruleIdTriggered = rule.id;
      break;
    }
  }

  if (isFlagged && ruleIdTriggered) {
    console.log(`Updating session ${answer.session_id} to red_flag=true`);
    await supabase
      .from('sessions')
      .update({ red_flag: true })
      .eq('id', answer.session_id);
    // Realtime broadcast happens automatically through Supabase on the 'sessions' table, 
    // since we alter publication on sessions.
  } else if (answer.question_id !== 'chief_complaint') {
    console.log(`No deterministic red flag triggered for session ${answer.session_id}. Attempting semantic fallback...`);
    try {
      const res = await fetch('http://localhost:3001/api/gemini/red-flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: allAnswers })
      });
      const data: any = await res.json();
      if (data.isFlagged) {
        console.log(`SEMANTIC FLAG! Updating session ${answer.session_id} to red_flag=true`);
        await supabase
          .from('sessions')
          .update({ red_flag: true })
          .eq('id', answer.session_id);
      } else {
        console.log(`No semantic red flag triggered for session ${answer.session_id}`);
      }
    } catch (err) {
      console.error('Semantic Red-Flag evaluation failed:', err);
    }
  }
}
