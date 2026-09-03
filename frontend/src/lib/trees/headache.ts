import type { InterviewTree } from '../../../../.agent/types/interview-tree';

export const headacheTree: InterviewTree = {
  complaint: 'Headache',
  start_question_id: 'ha_onset',
  questions: {
    ha_onset: {
      id: 'ha_onset',
      text: 'How quickly did the headache start?',
      type: 'single_choice',
      options: [
        { value: 'thunderclap', label: 'Instantly, like a thunderclap (worst pain ever)' },
        { value: 'fast', label: 'Quickly over a few hours' },
        { value: 'slow', label: 'Gradually over days' },
        { value: 'chronic', label: 'I\'ve had this for a long time' }
      ],
      next: (answer) => {
        if (answer === 'thunderclap') return { type: 'red_flag', flag_id: 'headache_thunderclap' };
        return 'ha_location';
      }
    },
    ha_location: {
      id: 'ha_location',
      text: 'Where is the pain located?',
      type: 'single_choice',
      options: [
        { value: 'front', label: 'Front (forehead or eyes)' },
        { value: 'one_side', label: 'Only on one side' },
        { value: 'back', label: 'Back of the head / neck' },
        { value: 'all_over', label: 'All over my head' }
      ],
      next: (_answer) => {
        return 'ha_severity';
      }
    },
    ha_severity: {
      id: 'ha_severity',
      text: 'On a scale of 1 to 10, how severe is it?',
      type: 'number',
      next: (_answer) => {
        return 'ha_associated';
      }
    },
    ha_associated: {
      id: 'ha_associated',
      text: 'Are you experiencing any of these with your headache?',
      type: 'multi_choice',
      options: [
        { value: 'vision', label: 'Vision changes or blurriness' },
        { value: 'nausea', label: 'Nausea or vomiting' },
        { value: 'weakness', label: 'Weakness on one side of body' },
        { value: 'none', label: 'None of these' }
      ],
      next: (answer) => {
        if (Array.isArray(answer) && answer.includes('vision')) return { type: 'red_flag', flag_id: 'headache_vision_changes' };
        if (Array.isArray(answer) && answer.includes('weakness')) return { type: 'red_flag', flag_id: 'headache_unilateral_weakness' };
        return null;
      }
    }
  }
};
