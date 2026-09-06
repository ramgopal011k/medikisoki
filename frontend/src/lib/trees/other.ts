import type { InterviewQuestion as QuestionType, InterviewQuestion } from "@/types/interview-tree";

export const otherTree: InterviewTree = {
  complaint: 'Other',
  start_question_id: 'q1_description',
  questions: {
    q1_description: {
      id: 'q1_description',
      text: 'Please describe your main health concern or symptoms',
      text_hi: 'कृपया अपनी मुख्य स्वास्थ्य समस्या या लक्षणों का वर्णन करें',
      type: 'text',
      next: () => 'q2_duration'
    },
    q2_duration: {
      id: 'q2_duration',
      text: 'How long has this issue been going on?',
      text_hi: 'यह समस्या कब से हो रही है?',
      type: 'single_choice',
      options: [
        { value: 'today', label: 'Started today (Acute)', label_hi: 'आज ही शुरू हुआ' },
        { value: 'this_week', label: 'In the last few days / this week', label_hi: 'पिछले कुछ दिनों / इस सप्ताह से' },
        { value: 'this_month', label: 'A few weeks / this month', label_hi: 'कुछ हफ्तों या इस महीने से' },
        { value: 'longer', label: 'Longer than a month (Chronic condition)', label_hi: 'एक महीने से अधिक समय से' }
      ],
      next: () => 'q3_severity'
    },
    q3_severity: {
      id: 'q3_severity',
      text: 'How severe is your discomfort?',
      text_hi: 'आपकी तकलीफ कितनी तेज है?',
      type: 'single_choice',
      options: [
        { value: 'mild', label: 'Mild (Noticeable but manageable)', label_hi: 'हल्का (महसूस होता है पर काम कर सकते हैं)' },
        { value: 'moderate', label: 'Moderate (Affects daily activities)', label_hi: 'मध्यम (रोजमर्रा के कामों में दिक्कत)' },
        { value: 'severe', label: 'Severe (Unbearable)', label_hi: 'गंभीर (असहनीय)' }
      ],
      next: () => 'q4_systemic'
    },
    q4_systemic: {
      id: 'q4_systemic',
      text: 'Are you experiencing any generalized or systemic symptoms?',
      text_hi: 'क्या आपको पूरे शरीर में इनमें से कोई अन्य लक्षण महसूस हो रहे हैं?',
      type: 'multi_choice',
      options: [
        { value: 'fever_chills', label: 'Fever or chills', label_hi: 'बुखार या ठंड लगना' },
        { value: 'dizziness', label: 'Dizziness, lightheadedness, or feeling faint', label_hi: 'चक्कर आना या बेहोशी जैसा लगना' },
        { value: 'weight_loss', label: 'Unexplained significant weight loss', label_hi: 'अचानक वजन कम होना' },
        { value: 'fatigue', label: 'Extreme weakness or exhaustion', label_hi: 'अत्यधिक कमजोरी या थकान' },
        { value: 'none', label: 'None of these', label_hi: 'इनमें से कोई नहीं' }
      ],
      next: (answer) => {
        if (Array.isArray(answer) && answer.includes('dizziness')) return { type: 'red_flag', flag_id: 'general_severe_dizziness' };
        return 'q5_daily_impact';
      }
    },
    q5_daily_impact: {
      id: 'q5_daily_impact',
      text: 'How much does this condition affect your normal daily activities or work?',
      text_hi: 'यह समस्या आपके दैनिक कामकाज को कितना प्रभावित कर रही है?',
      type: 'single_choice',
      options: [
        { value: 'severe_bedridden', label: 'Unable to perform basic tasks (Bedridden / Severe restriction)', label_hi: 'दैनिक काम करने में असमर्थ / बिस्तर पर आराम' },
        { value: 'moderate', label: 'Moderate limitation (Able to do light work only)', label_hi: 'मध्यम प्रभाव (केवल हल्का काम कर पा रहे हैं)' },
        { value: 'mild', label: 'Mild (Able to manage routine normally)', label_hi: 'हल्का प्रभाव (सामान्य दिनचर्या जारी है)' }
      ],
      next: () => 'q6_additional'
    },
    q6_additional: {
      id: 'q6_additional',
      text: 'Is there any specific detail or allergy you would like the doctor to know?',
      text_hi: 'क्या आप डॉक्टर को कोई विशेष बात या दवा से एलर्जी बताना चाहते हैं?',
      type: 'text',
      next: () => null // end interview
    }
  }
};
