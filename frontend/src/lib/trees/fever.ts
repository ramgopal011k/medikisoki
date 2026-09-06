import type { InterviewTree } from '../../../../.agent/types/interview-tree';

export const feverTree: InterviewTree = {
  complaint: 'Fever',
  start_question_id: 'fever_duration',
  questions: {
    fever_duration: {
      id: 'fever_duration',
      text: 'How long have you had the fever?',
      text_hi: 'आपको बुखार कब से है?',
      type: 'single_choice',
      options: [
        { value: 'less_3_days', label: 'Less than 3 days', label_hi: '3 दिन से कम' },
        { value: '3_to_7_days', label: '3 to 7 days', label_hi: '3 से 7 दिन' },
        { value: 'more_than_week', label: 'More than a week', label_hi: 'एक सप्ताह से अधिक' }
      ],
      next: (answer) => {
        if (answer === 'more_than_week') return 'fever_travel';
        return 'fever_temp';
      }
    },
    fever_temp: {
      id: 'fever_temp',
      text: 'How high is your body temperature?',
      text_hi: 'आपका तापमान कितना तेज है?',
      type: 'single_choice',
      options: [
        { value: 'mild', label: 'Mild (Below 100°F / 37.8°C)', label_hi: 'हल्का (100°F से कम)' },
        { value: 'moderate', label: 'Moderate (100°F - 102°F)', label_hi: 'मध्यम (100°F - 102°F)' },
        { value: 'high', label: 'High (Above 102°F / 38.9°C)', label_hi: 'तेज (102°F से अधिक)' },
        { value: 'unknown', label: 'I haven\'t measured it', label_hi: 'नापा नहीं है' }
      ],
      next: (answer) => {
        if (answer === 'high') return { type: 'red_flag', flag_id: 'fever_high_temp' };
        return 'fever_pattern';
      }
    },
    fever_pattern: {
      id: 'fever_pattern',
      text: 'What pattern does your fever follow throughout the day?',
      text_hi: 'दिन भर में आपका बुखार किस तरह रहता है?',
      type: 'single_choice',
      options: [
        { value: 'continuous', label: 'Continuous (Stay elevated all day)', label_hi: 'लगातार बना रहता है' },
        { value: 'intermittent', label: 'Comes and goes in spikes with chills', label_hi: 'कंपकंपी के साथ चढ़ता-उतरता है' },
        { value: 'evening_rise', label: 'Rises mainly in the evening or night', label_hi: 'शाम या रात में बढ़ जाता है' },
        { value: 'irregular', label: 'Irregular / Unpredictable', label_hi: 'अनियमित' }
      ],
      next: (answer) => {
        if (answer === 'intermittent') return 'fever_rigors';
        return 'fever_med_response';
      }
    },
    fever_rigors: {
      id: 'fever_rigors',
      text: 'Do you experience severe shaking chills followed by heavy sweating?',
      text_hi: 'क्या आपको तेज कंपकंपी के बाद बहुत पसीना आता है?',
      type: 'single_choice',
      options: [
        { value: 'yes_shivering', label: 'Yes, severe shivering and sweats', label_hi: 'हाँ, तेज कंपकंपी और पसीना' },
        { value: 'no', label: 'No, just normal fever', label_hi: 'नहीं, सामान्य बुखार' }
      ],
      next: (_answer) => {
        return 'fever_med_response';
      }
    },
    fever_med_response: {
      id: 'fever_med_response',
      text: 'Does fever medicine (like Paracetamol) bring your temperature down?',
      text_hi: 'क्या बुखार की दवा (जैसे पैरासिटामोल) लेने पर बुखार कम होता है?',
      type: 'single_choice',
      options: [
        { value: 'yes_temporary', label: 'Yes, but it returns after a few hours', label_hi: 'हाँ, पर कुछ घंटों बाद फिर आ जाता है' },
        { value: 'no_response', label: 'No, fever remains high despite medicine', label_hi: 'नहीं, दवा से भी बुखार नहीं उतरता' },
        { value: 'not_taken', label: 'I haven\'t taken any medicine yet', label_hi: 'अभी तक कोई दवा नहीं ली है' }
      ],
      next: (_answer) => {
        return 'fever_associated';
      }
    },
    fever_travel: {
      id: 'fever_travel',
      text: 'Have you traveled outside your local area or visited forested/waterlogged areas recently?',
      text_hi: 'क्या आपने हाल ही में किसी अन्य क्षेत्र या जलभराव वाले स्थान की यात्रा की है?',
      type: 'single_choice',
      options: [
        { value: 'yes', label: 'Yes', label_hi: 'हाँ' },
        { value: 'no', label: 'No', label_hi: 'नहीं' }
      ],
      next: (_answer) => {
        return 'fever_contacts';
      }
    },
    fever_contacts: {
      id: 'fever_contacts',
      text: 'Have you been in close contact with anyone who has been sick recently?',
      text_hi: 'क्या आप हाल ही में किसी बीमार व्यक्ति के संपर्क में आए हैं?',
      type: 'single_choice',
      options: [
        { value: 'yes', label: 'Yes', label_hi: 'हाँ' },
        { value: 'no', label: 'No', label_hi: 'नहीं' }
      ],
      next: (_answer) => {
        return 'fever_joint_pain';
      }
    },
    fever_joint_pain: {
      id: 'fever_joint_pain',
      text: 'Are you experiencing severe joint or muscle pain?',
      text_hi: 'क्या आपको जोड़ों या मांसपेशियों में गंभीर दर्द हो रहा है?',
      type: 'single_choice',
      options: [
        { value: 'yes_severe', label: 'Yes, very severe (bone-breaking pain)', label_hi: 'हाँ, बहुत तेज (हड्डी टूटने जैसा दर्द)' },
        { value: 'mild', label: 'Mild body ache', label_hi: 'हल्का बदन दर्द' },
        { value: 'no', label: 'No', label_hi: 'नहीं' }
      ],
      next: (answer) => {
        if (answer === 'yes_severe') return { type: 'red_flag', flag_id: 'fever_suspected_dengue' };
        return 'fever_associated';
      }
    },
    fever_associated: {
      id: 'fever_associated',
      text: 'Are you experiencing any of these other symptoms?',
      text_hi: 'क्या आपको इनमें से कोई अन्य लक्षण महसूस हो रहा है?',
      type: 'multi_choice',
      options: [
        { value: 'chills', label: 'Chills or body shivering', label_hi: 'ठंड लगना या कंपकंपी' },
        { value: 'rash', label: 'A new skin rash or red spots', label_hi: 'शरीर पर लाल दाने या चकत्ते' },
        { value: 'neck_stiffness', label: 'Severe stiff neck / Inability to bend neck', label_hi: 'गर्दन में तेज अकड़न' },
        { value: 'burning_urine', label: 'Pain or burning while urinating', label_hi: 'पेशाब में जलन या दर्द' },
        { value: 'severe_headache', label: 'Intense headache behind the eyes', label_hi: 'आंखों के पीछे तेज सिरदर्द' },
        { value: 'none', label: 'None of these', label_hi: 'इनमें से कोई नहीं' }
      ],
      next: (answer) => {
        if (Array.isArray(answer) && answer.includes('neck_stiffness')) return { type: 'red_flag', flag_id: 'fever_neck_stiffness' };
        return 'fever_hydration';
      }
    },
    fever_hydration: {
      id: 'fever_hydration',
      text: 'Are you able to drink water and retain oral fluids without vomiting?',
      text_hi: 'क्या आप बिना उल्टी किए पर्याप्त पानी और तरल पदार्थ पी पा रहे हैं?',
      type: 'single_choice',
      options: [
        { value: 'drinking_well', label: 'Yes, drinking adequate water and fluids', label_hi: 'हाँ, पर्याप्त पानी पी पा रहा हूँ' },
        { value: 'reduced_intake', label: 'Drinking less due to nausea or low appetite', label_hi: 'भूख/उल्टी की वजह से कम पी पा रहा हूँ' },
        { value: 'unable_to_retain', label: 'Unable to keep any liquids down (vomiting everything)', label_hi: 'बिल्कुल पानी नहीं पच रहा (लगातार उल्टी)' }
      ],
      next: (answer) => {
        if (answer === 'unable_to_retain') return { type: 'red_flag', flag_id: 'fever_severe_dehydration' };
        return null;
      }
    }
  }
};
