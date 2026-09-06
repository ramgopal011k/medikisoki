import type { InterviewTree } from "@/types/interview-tree";

export const abdominalPainTree: InterviewTree = {
  complaint: 'Abdominal pain',
  start_question_id: 'abd_site',
  questions: {
    abd_site: {
      id: 'abd_site',
      text: 'Where does your stomach or abdomen hurt the most?',
      text_hi: 'पेट में दर्द सबसे ज्यादा कहाँ हो रहा है?',
      type: 'single_choice',
      options: [
        { value: 'upper_right', label: 'Upper right (below ribs)', label_hi: 'ऊपर दाईं ओर (पसलियों के नीचे)' },
        { value: 'upper_left', label: 'Upper left', label_hi: 'ऊपर बाईं ओर' },
        { value: 'lower_right', label: 'Lower right (near hip/groin)', label_hi: 'नीचे दाईं ओर (अपेंडिक्स क्षेत्र)' },
        { value: 'lower_left', label: 'Lower left', label_hi: 'नीचे बाईं ओर' },
        { value: 'central', label: 'All over / Around navel (Central)', label_hi: 'नाभि के पास या पूरे पेट में' }
      ],
      next: (answer) => {
        if (answer === 'lower_right') return { type: 'red_flag', flag_id: 'abdominal_lower_right_appendicitis' };
        return 'abd_onset';
      }
    },
    abd_onset: {
      id: 'abd_onset',
      text: 'How did the abdominal pain start?',
      text_hi: 'पेट का दर्द कैसे शुरू हुआ?',
      type: 'single_choice',
      options: [
        { value: 'sudden', label: 'Suddenly like a lightning bolt (Instantly severe)', label_hi: 'अचानक और बहुत तेजी से' },
        { value: 'gradual', label: 'Gradually developing over hours or days', label_hi: 'धीरे-धीरे घंटों या दिनों में' }
      ],
      next: (answer) => {
        if (answer === 'sudden') return { type: 'red_flag', flag_id: 'abdominal_sudden_onset' };
        return 'abd_character';
      }
    },
    abd_character: {
      id: 'abd_character',
      text: 'What does the pain feel like?',
      text_hi: 'दर्द किस प्रकार का महसूस होता है?',
      type: 'single_choice',
      options: [
        { value: 'sharp', label: 'Sharp, stabbing or cutting', label_hi: 'तेज, चुभने वाला या काटने जैसा' },
        { value: 'cramping', label: 'Colicky / Cramping (comes in waves)', label_hi: 'मरोड़ या लहरों में उठने वाला दर्द' },
        { value: 'burning', label: 'Burning sensation in upper belly', label_hi: 'ऊपरी पेट में तेज जलन' },
        { value: 'dull', label: 'Constant dull continuous ache', label_hi: 'लगातार मीठा/हल्का भारी दर्द' }
      ],
      next: (answer) => {
        if (answer === 'burning') return 'abd_food_relation';
        return 'abd_radiation';
      }
    },
    abd_radiation: {
      id: 'abd_radiation',
      text: 'Does the pain spread or shoot to other areas?',
      text_hi: 'क्या दर्द पेट से निकलकर कहीं और फैलता है?',
      type: 'single_choice',
      options: [
        { value: 'to_back', label: 'Straight through to my back', label_hi: 'सीधे पीठ की तरफ' },
        { value: 'to_shoulder', label: 'Up to the right shoulder blade', label_hi: 'दाहिने कंधे की तरफ' },
        { value: 'to_groin', label: 'Downwards into the groin / inner thigh', label_hi: 'नीचे जांघ या कमर की तरफ' },
        { value: 'nowhere', label: 'No, it stays strictly in the stomach', label_hi: 'नहीं, सिर्फ पेट में ही रहता है' }
      ],
      next: (_answer) => {
        return 'abd_food_relation';
      }
    },
    abd_food_relation: {
      id: 'abd_food_relation',
      text: 'How is the pain affected by eating meals or oily food?',
      text_hi: 'खाना या तला-भुना खाने से दर्द पर क्या असर पड़ता है?',
      type: 'single_choice',
      options: [
        { value: 'worse_after_food', label: 'Worse after eating (especially heavy/fatty food)', label_hi: 'खाने के बाद बढ़ जाता है (खासकर भारी खाने से)' },
        { value: 'relieved_by_food', label: 'Relieved temporarily after eating or milk', label_hi: 'खाना खाने या दूध पीने से आराम मिलता है' },
        { value: 'no_relation', label: 'No relation to food or meals', label_hi: 'भोजन से कोई संबंध नहीं' }
      ],
      next: (_answer) => {
        return 'abd_bowel';
      }
    },
    abd_bowel: {
      id: 'abd_bowel',
      text: 'Have you noticed any changes in your bowel movements or stool?',
      text_hi: 'क्या आपको शौच या पेट साफ होने में कोई बदलाव दिखा है?',
      type: 'single_choice',
      options: [
        { value: 'diarrhea', label: 'Watery diarrhea or loose stools', label_hi: 'दस्त या पतला शौच' },
        { value: 'constipation', label: 'Unable to pass gas or stool (Constipation)', label_hi: 'कब्ज या गैस/मल बिल्कुल न निकलना' },
        { value: 'blood', label: 'Red blood or black tarry stool', label_hi: 'मल में खून या काला मल' },
        { value: 'normal', label: 'Normal bowel movements', label_hi: 'सामान्य' }
      ],
      next: (answer) => {
        if (answer === 'blood') return { type: 'red_flag', flag_id: 'abdominal_blood_in_stool' };
        return 'abd_jaundice';
      }
    },
    abd_jaundice: {
      id: 'abd_jaundice',
      text: 'Have you noticed any yellowish discoloration of your eyes or skin?',
      text_hi: 'क्या आपने अपनी आँखों या त्वचा में पीलापन देखा है (पीलिया)?',
      type: 'single_choice',
      options: [
        { value: 'yes', label: 'Yes', label_hi: 'हाँ' },
        { value: 'no', label: 'No', label_hi: 'नहीं' }
      ],
      next: (_answer) => {
        return 'abd_urinary';
      }
    },
    abd_urinary: {
      id: 'abd_urinary',
      text: 'Are you experiencing any pain or burning sensation when you urinate?',
      text_hi: 'क्या आपको पेशाब करते समय कोई दर्द या जलन महसूस होती है?',
      type: 'single_choice',
      options: [
        { value: 'yes', label: 'Yes', label_hi: 'हाँ' },
        { value: 'no', label: 'No', label_hi: 'नहीं' }
      ],
      next: (_answer) => {
        return 'abd_vomiting';
      }
    },
    abd_vomiting: {
      id: 'abd_vomiting',
      text: 'Are you experiencing persistent nausea or vomiting?',
      text_hi: 'क्या आपको लगातार उल्टी या जी मिचलाने की समस्या है?',
      type: 'single_choice',
      options: [
        { value: 'coffee_ground', label: 'Vomiting blood or coffee-ground material', label_hi: 'उल्टी में खून या काले रंग का पदार्थ' },
        { value: 'food_bile', label: 'Vomiting food or greenish bile', label_hi: 'भोजन या हरे/पीले पानी की उल्टी' },
        { value: 'nausea_only', label: 'Nausea without vomiting', label_hi: 'सिर्फ जी मिचलाना, उल्टी नहीं' },
        { value: 'none', label: 'No nausea or vomiting', label_hi: 'कोई उल्टी नहीं' }
      ],
      next: (answer) => {
        if (answer === 'coffee_ground') return { type: 'red_flag', flag_id: 'abdominal_hematemesis' };
        return null;
      }
    }
  }
};
