import type { InterviewTree } from "@/types/interview-tree";

export const backPainTree: InterviewTree = {
  complaint: 'Back pain',
  start_question_id: 'bp_location',
  questions: {
    bp_location: {
      id: 'bp_location',
      text: 'Where is the back pain located precisely?',
      text_hi: 'पीठ में दर्द ठीक कहाँ है?',
      type: 'single_choice',
      options: [
        { value: 'upper', label: 'Upper back / Between shoulder blades / Neck', label_hi: 'ऊपरी पीठ / कंधों के बीच / गर्दन' },
        { value: 'lower', label: 'Lower back (Lumbar area)', label_hi: 'निचली पीठ (कमर का निचला हिस्सा)' },
        { value: 'buttocks', label: 'Buttocks or tailbone area (Sacral/Coccyx)', label_hi: 'कूल्हों या टेलबोन के पास' }
      ],
      next: (_answer) => {
        return 'bp_onset';
      }
    },
    bp_onset: {
      id: 'bp_onset',
      text: 'How did the back pain start?',
      text_hi: 'पीठ का दर्द कैसे शुरू हुआ?',
      type: 'single_choice',
      options: [
        { value: 'trauma', label: 'After an accident, heavy fall, or direct injury', label_hi: 'दुर्घटना, गिरने या सीधी चोट के बाद' },
        { value: 'lifting', label: 'Immediately after lifting heavy weights or sudden twist', label_hi: 'भारी वजन उठाने या अचानक झुकने/मुड़ने से' },
        { value: 'spontaneous', label: 'Gradually on its own without any obvious injury', label_hi: 'बिना किसी चोट के धीरे-धीरे अपने आप' }
      ],
      next: (answer) => {
        if (answer === 'trauma') return { type: 'red_flag', flag_id: 'back_pain_trauma' };
        return 'bp_radiation';
      }
    },
    bp_radiation: {
      id: 'bp_radiation',
      text: 'Does the pain travel or shoot anywhere down your body?',
      text_hi: 'क्या दर्द नीचे पैरों या किसी अन्य हिस्से में फैलता है?',
      type: 'single_choice',
      options: [
        { value: 'one_leg', label: 'Shooting down one leg past the knee (Sciatica)', label_hi: 'एक पैर में घुटने के नीचे तक (साइटिका)' },
        { value: 'both_legs', label: 'Shooting down both legs', label_hi: 'दोनों पैरों में नीचे तक' },
        { value: 'arms', label: 'Into my shoulders or arms', label_hi: 'कंधों या हाथों में' },
        { value: 'nowhere', label: 'No, it stays confined to my back', label_hi: 'नहीं, सिर्फ पीठ/कमर तक सीमित है' }
      ],
      next: (_answer) => {
        return 'bp_stiffness';
      }
    },
    bp_stiffness: {
      id: 'bp_stiffness',
      text: 'Do you feel severe stiffness in your back when you wake up in the morning?',
      text_hi: 'क्या सुबह उठने पर कमर में तेज जकड़न महसूस होती है?',
      type: 'single_choice',
      options: [
        { value: 'prolonged', label: 'Yes, lasts longer than 30-45 minutes (improves with movement)', label_hi: 'हाँ, 30 मिनट से अधिक रहती है (चलने-फिरने से कम होती है)' },
        { value: 'brief', label: 'Brief stiffness (relieved in a few minutes)', label_hi: 'थोड़ी देर (कुछ मिनटों में ठीक हो जाती है)' },
        { value: 'no_stiffness', label: 'No morning stiffness, hurts more with activity', label_hi: 'सुबह जकड़न नहीं, काम करने से दर्द बढ़ता है' }
      ],
      next: (_answer) => {
        return 'bp_numbness';
      }
    },
    bp_numbness: {
      id: 'bp_numbness',
      text: 'Are you experiencing any of these critical red flag symptoms?',
      text_hi: 'क्या आपको इनमें से कोई गंभीर लक्षण महसूस हो रहे हैं?',
      type: 'multi_choice',
      options: [
        { value: 'saddle_anesthesia', label: 'Numbness in the groin, buttocks, or genital area', label_hi: 'कूल्हों, जांघों के बीच या जननांग क्षेत्र में सुन्नता' },
        { value: 'bladder', label: 'Loss of bladder / bowel control or inability to urinate', label_hi: 'पेशाब या शौच पर नियंत्रण खोना या पेशाब रुक जाना' },
        { value: 'leg_weakness', label: 'Severe weakness or foot drop (tripping while walking)', label_hi: 'पैरों में भारी कमजोरी या पैर का लड़खड़ाना' },
        { value: 'none', label: 'None of these', label_hi: 'इनमें से कोई नहीं' }
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
