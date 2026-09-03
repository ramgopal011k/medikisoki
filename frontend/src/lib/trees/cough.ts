import type { InterviewTree } from '../../../../.agent/types/interview-tree';

export const coughTree: InterviewTree = {
  complaint: 'Cough',
  start_question_id: 'cough_duration',
  questions: {
    cough_duration: {
      id: 'cough_duration',
      text: 'How long have you had this cough?',
      type: 'single_choice',
      options: [
        { value: 'less_3_weeks', label: 'Less than 3 weeks' },
        { value: '3_to_8_weeks', label: '3 to 8 weeks' },
        { value: 'more_8_weeks', label: 'More than 8 weeks' }
      ],
      next: (_answer) => {
        return 'cough_type';
      }
    },
    cough_type: {
      id: 'cough_type',
      text: 'What kind of cough is it?',
      type: 'single_choice',
      options: [
        { value: 'dry', label: 'Dry and tickly' },
        { value: 'productive', label: 'Productive (bringing up phlegm)' },
        { value: 'barking', label: 'Barking or seal-like' }
      ],
      next: (answer) => {
        if (answer === 'productive') return 'cough_color';
        return 'cough_associated';
      }
    },
    cough_color: {
      id: 'cough_color',
      text: 'What color is the phlegm?',
      type: 'single_choice',
      options: [
        { value: 'clear', label: 'Clear or white' },
        { value: 'yellow', label: 'Yellow or green' },
        { value: 'blood', label: 'Pink, red, or rust-colored (blood)' }
      ],
      next: (answer) => {
        if (answer === 'blood') return { type: 'red_flag', flag_id: 'cough_hemoptysis' };
        return 'cough_associated';
      }
    },
    cough_associated: {
      id: 'cough_associated',
      text: 'Are you experiencing any of these other symptoms?',
      type: 'multi_choice',
      options: [
        { value: 'breathless', label: 'Severe shortness of breath' },
        { value: 'fever', label: 'High fever' },
        { value: 'weight_loss', label: 'Unexplained weight loss' },
        { value: 'none', label: 'None of these' }
      ],
      next: (answer) => {
        if (Array.isArray(answer) && answer.includes('breathless')) return { type: 'red_flag', flag_id: 'cough_severe_breathlessness' };
        if (Array.isArray(answer) && answer.includes('weight_loss')) return { type: 'red_flag', flag_id: 'cough_unexplained_weight_loss' };
        return null;
      }
    }
  }
};
