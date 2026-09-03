import type { InterviewTree } from '../../../../.agent/types/interview-tree';

export const backPainTree: InterviewTree = {
  complaint: 'Back pain',
  start_question_id: 'bp_location',
  questions: {
    bp_location: {
      id: 'bp_location',
      text: 'Where is the back pain exactly?',
      type: 'single_choice',
      options: [
        { value: 'upper', label: 'Upper back / Neck' },
        { value: 'lower', label: 'Lower back' },
        { value: 'buttocks', label: 'Buttocks or tailbone area' }
      ],
      next: (_answer) => {
        return 'bp_onset';
      }
    },
    bp_onset: {
      id: 'bp_onset',
      text: 'How did the pain start?',
      type: 'single_choice',
      options: [
        { value: 'trauma', label: 'After an injury or fall' },
        { value: 'lifting', label: 'After heavy lifting' },
        { value: 'spontaneous', label: 'It just started on its own' }
      ],
      next: (answer) => {
        if (answer === 'trauma') return { type: 'red_flag', flag_id: 'back_pain_trauma' };
        return 'bp_radiation';
      }
    },
    bp_radiation: {
      id: 'bp_radiation',
      text: 'Does the pain spread anywhere?',
      type: 'single_choice',
      options: [
        { value: 'one_leg', label: 'Down one leg' },
        { value: 'both_legs', label: 'Down both legs' },
        { value: 'arms', label: 'Into my arms' },
        { value: 'nowhere', label: 'No, it stays in my back' }
      ],
      next: (_answer) => {
        return 'bp_numbness';
      }
    },
    bp_numbness: {
      id: 'bp_numbness',
      text: 'Are you experiencing any of these serious symptoms?',
      type: 'multi_choice',
      options: [
        { value: 'saddle_anesthesia', label: 'Numbness in the groin/buttocks area' },
        { value: 'bladder', label: 'Loss of bladder or bowel control' },
        { value: 'leg_weakness', label: 'Severe weakness in legs' },
        { value: 'none', label: 'None of these' }
      ],
      next: (answer) => {
        if (Array.isArray(answer) && answer.includes('saddle_anesthesia')) return { type: 'red_flag', flag_id: 'back_pain_cauda_equina_saddle' };
        if (Array.isArray(answer) && answer.includes('bladder')) return { type: 'red_flag', flag_id: 'back_pain_cauda_equina_bladder' };
        if (Array.isArray(answer) && answer.includes('leg_weakness')) return { type: 'red_flag', flag_id: 'back_pain_cauda_equina_weakness' };
        return null;
      }
    }
  }
};
