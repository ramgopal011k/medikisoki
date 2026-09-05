import type { InterviewTree } from '../../../../.agent/types/interview-tree';

export const coughTree: InterviewTree = {
  complaint: 'Cough',
  start_question_id: 'cough_duration',
  questions: {
    cough_duration: {
      id: 'cough_duration',
      text: 'How long have you been coughing?',
      text_hi: 'आपको खांसी कब से आ रही है?',
      type: 'single_choice',
      options: [
        { value: 'less_3_weeks', label: 'Acute (Less than 3 weeks)', label_hi: 'हालिया (3 सप्ताह से कम)' },
        { value: '3_to_8_weeks', label: 'Subacute (3 to 8 weeks)', label_hi: '3 से 8 सप्ताह' },
        { value: 'more_8_weeks', label: 'Chronic (More than 8 weeks / Long standing)', label_hi: 'पुरानी खांसी (8 सप्ताह से अधिक)' }
      ],
      next: (_answer) => {
        return 'cough_type';
      }
    },
    cough_type: {
      id: 'cough_type',
      text: 'What kind of cough are you experiencing?',
      text_hi: 'खांसी किस प्रकार की है?',
      type: 'single_choice',
      options: [
        { value: 'dry', label: 'Dry, irritating, and tickly (No phlegm)', label_hi: 'सूखी और गले में खराश वाली (बिना बलगम)' },
        { value: 'productive', label: 'Wet / Productive (Coughing up mucus/phlegm)', label_hi: 'गीली / बलगम वाली खांसी' },
        { value: 'barking', label: 'Barking or seal-like harsh cough', label_hi: 'गंभीर या सीटी जैसी आवाज वाली' }
      ],
      next: (answer) => {
        if (answer === 'productive') return 'cough_color';
        return 'cough_timing';
      }
    },
    cough_color: {
      id: 'cough_color',
      text: 'What is the color or appearance of the phlegm/mucus?',
      text_hi: 'बलगम का रंग कैसा है?',
      type: 'single_choice',
      options: [
        { value: 'clear', label: 'Clear, watery or white', label_hi: 'सफेद या पानी जैसा पारदर्शी' },
        { value: 'yellow', label: 'Thick yellow, green or foul smelling', label_hi: 'गाढ़ा पीला या हरा' },
        { value: 'blood', label: 'Red streaks, rust colored, or coughing pure blood', label_hi: 'बलगम में खून या जंग जैसा लाल रंग' }
      ],
      next: (answer) => {
        if (answer === 'blood') return { type: 'red_flag', flag_id: 'cough_hemoptysis' };
        return 'cough_timing';
      }
    },
    cough_timing: {
      id: 'cough_timing',
      text: 'When is your cough most severe or triggered?',
      text_hi: 'खांसी किस समय या किस वजह से ज्यादा बढ़ जाती है?',
      type: 'single_choice',
      options: [
        { value: 'night', label: 'Worse at night or waking from sleep', label_hi: 'रात में या सोने पर ज्यादा' },
        { value: 'cold_air', label: 'Triggered by cold air, dust, pollution or smoke', label_hi: 'ठंडी हवा, धूल या धुएं से' },
        { value: 'post_meal', label: 'Worse after meals or lying flat (Acid reflux)', label_hi: 'खाना खाने या लेटने के बाद (एसिडिटी)' },
        { value: 'constant', label: 'Constant throughout the entire day', label_hi: 'पूरे दिन लगातार' }
      ],
      next: (_answer) => {
        return 'cough_associated';
      }
    },
    cough_associated: {
      id: 'cough_associated',
      text: 'Are you experiencing any of these other symptoms with your cough?',
      text_hi: 'क्या आपको खांसी के साथ इनमें से कोई अन्य लक्षण हैं?',
      type: 'multi_choice',
      options: [
        { value: 'breathless', label: 'Severe difficulty breathing or gasping for air', label_hi: 'सांस लेने में भारी तकलीफ या सांस फूलना' },
        { value: 'wheezing', label: 'Wheezing or whistling sound in chest while breathing', label_hi: 'सांस लेते समय छाती से सीटी जैसी आवाज (घरघराहट)' },
        { value: 'fever', label: 'High grade fever with chills', label_hi: 'कंपकंपी के साथ तेज बुखार' },
        { value: 'weight_loss', label: 'Unexplained weight loss or drenching night sweats', label_hi: 'अचानक वजन घटना या रात में पसीना आना' },
        { value: 'none', label: 'None of these', label_hi: 'इनमें से कोई नहीं' }
      ],
      next: (answer) => {
        if (Array.isArray(answer) && answer.includes('breathless')) return { type: 'red_flag', flag_id: 'cough_severe_breathlessness' };
        if (Array.isArray(answer) && answer.includes('weight_loss')) return { type: 'red_flag', flag_id: 'cough_unexplained_weight_loss' };
        return null;
      }
    }
  }
};
