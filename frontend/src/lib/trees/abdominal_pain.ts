import type { InterviewTree } from '../../../../.agent/types/interview-tree';

export const abdominalPainTree: InterviewTree = {
  complaint: 'Abdominal pain',
  start_question_id: 'abd_site',
  questions: {
    abd_site: {
      id: 'abd_site',
      text: 'Where does your stomach hurt the most?',
      type: 'single_choice',
      options: [
        { value: 'upper_right', label: 'Upper right' },
        { value: 'upper_left', label: 'Upper left' },
        { value: 'lower_right', label: 'Lower right' },
        { value: 'lower_left', label: 'Lower left' },
        { value: 'central', label: 'All over / Central' }
      ],
      next: (answer) => {
        if (answer === 'lower_right') return { type: 'red_flag', flag_id: 'abdominal_lower_right_appendicitis' };
        return 'abd_onset';
      }
    },
    abd_onset: {
      id: 'abd_onset',
      text: 'How did the pain start?',
      type: 'single_choice',
      options: [
        { value: 'sudden', label: 'Suddenly, out of nowhere' },
        { value: 'gradual', label: 'Gradually over hours or days' }
      ],
      next: (answer) => {
        if (answer === 'sudden') return { type: 'red_flag', flag_id: 'abdominal_sudden_onset' };
        return 'abd_character';
      }
    },
    abd_character: {
      id: 'abd_character',
      text: 'What kind of pain is it?',
      type: 'single_choice',
      options: [
        { value: 'sharp', label: 'Sharp and stabbing' },
        { value: 'cramping', label: 'Cramping or coming in waves' },
        { value: 'burning', label: 'Burning' },
        { value: 'dull', label: 'Dull ache' }
      ],
      next: (_answer) => {
        return 'abd_bowel';
      }
    },
    abd_bowel: {
      id: 'abd_bowel',
      text: 'Have you noticed any changes in your bowel movements?',
      type: 'single_choice',
      options: [
        { value: 'diarrhea', label: 'Diarrhea' },
        { value: 'constipation', label: 'Constipation' },
        { value: 'blood', label: 'Blood in stool' },
        { value: 'normal', label: 'Normal' }
      ],
      next: (answer) => {
        if (answer === 'blood') return { type: 'red_flag', flag_id: 'abdominal_blood_in_stool' };
        return null;
      }
    }
  }
};
