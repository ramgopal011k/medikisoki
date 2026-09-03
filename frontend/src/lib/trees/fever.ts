import type { InterviewTree } from '../../../../.agent/types/interview-tree';

export const feverTree: InterviewTree = {
  complaint: 'Fever',
  start_question_id: 'fever_duration',
  questions: {
    fever_duration: {
      id: 'fever_duration',
      text: 'How long have you had the fever?',
      type: 'single_choice',
      options: [
        { value: 'less_3_days', label: 'Less than 3 days' },
        { value: '3_to_7_days', label: '3 to 7 days' },
        { value: 'more_than_week', label: 'More than a week' }
      ],
      next: (answer) => {
        if (answer === 'more_than_week') return 'fever_travel';
        return 'fever_temp';
      }
    },
    fever_temp: {
      id: 'fever_temp',
      text: 'How high is your fever?',
      type: 'single_choice',
      options: [
        { value: 'mild', label: 'Mild (Below 100°F / 37.8°C)' },
        { value: 'moderate', label: 'Moderate (100°F - 102°F)' },
        { value: 'high', label: 'High (Above 102°F / 38.9°C)' },
        { value: 'unknown', label: 'I haven\'t measured it' }
      ],
      next: (answer) => {
        if (answer === 'high') return { type: 'red_flag', flag_id: 'fever_high_temp' };
        return 'fever_associated';
      }
    },
    fever_travel: {
      id: 'fever_travel',
      text: 'Have you traveled outside your local area recently?',
      type: 'single_choice',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' }
      ],
      next: (_answer) => {
        return 'fever_associated';
      }
    },
    fever_associated: {
      id: 'fever_associated',
      text: 'Are you experiencing any of these?',
      type: 'multi_choice',
      options: [
        { value: 'chills', label: 'Chills or shivering' },
        { value: 'rash', label: 'A new skin rash' },
        { value: 'neck_stiffness', label: 'Stiff neck' },
        { value: 'none', label: 'None of these' }
      ],
      next: (answer) => {
        if (Array.isArray(answer) && answer.includes('neck_stiffness')) return { type: 'red_flag', flag_id: 'fever_neck_stiffness' };
        return null;
      }
    }
  }
};
