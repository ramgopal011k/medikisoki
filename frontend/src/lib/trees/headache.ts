import type { InterviewTree } from "@/types/interview-tree";

export const headacheTree: InterviewTree = {
  complaint: 'Headache',
  start_question_id: 'ha_onset',
  questions: {
    ha_onset: {
      id: 'ha_onset',
      text: 'How quickly did the headache start?',
      text_hi: 'सिरदर्द कितनी तेजी से शुरू हुआ?',
      type: 'single_choice',
      options: [
        { value: 'thunderclap', label: 'Instantly severe, like a thunderclap (Worst pain of my life)', label_hi: 'अचानक बिजली की तरह (जीवन का सबसे तेज दर्द)' },
        { value: 'fast', label: 'Quickly over a few hours', label_hi: 'कुछ घंटों में तेजी से बढ़ा' },
        { value: 'slow', label: 'Gradually over several days', label_hi: 'कई दिनों में धीरे-धीरे' },
        { value: 'chronic', label: 'I\'ve had recurring headaches for months/years', label_hi: 'महीनों या सालों से बार-बार होता है' }
      ],
      next: (answer) => {
        if (answer === 'thunderclap') return { type: 'red_flag', flag_id: 'headache_thunderclap' };
        return 'ha_location';
      }
    },
    ha_location: {
      id: 'ha_location',
      text: 'Where is the pain located on your head?',
      text_hi: 'सिर में दर्द किस हिस्से में है?',
      type: 'single_choice',
      options: [
        { value: 'front', label: 'Front (Forehead, temples or behind eyes)', label_hi: 'सामने (माथा, कनपटी या आंखों के पीछे)' },
        { value: 'one_side', label: 'Strictly on one side of head (Half head)', label_hi: 'सिर्फ एक तरफ (आधे सिर का दर्द / माइग्रेन)' },
        { value: 'back', label: 'Back of the head and upper neck', label_hi: 'सिर के पीछे और गर्दन के ऊपरी हिस्से में' },
        { value: 'all_over', label: 'Band-like pressure all over the head', label_hi: 'पूरे सिर पर पट्टी जैसा दबाव' }
      ],
      next: (_answer) => {
        return 'ha_character';
      }
    },
    ha_character: {
      id: 'ha_character',
      text: 'What kind of sensation is the headache?',
      text_hi: 'सिरदर्द किस तरह का महसूस होता है?',
      type: 'single_choice',
      options: [
        { value: 'throbbing', label: 'Throbbing or pulsating (Pounding with heartbeat)', label_hi: 'धड़कन की तरह टीस मारने वाला (माइग्रेन लक्षण)' },
        { value: 'tight_band', label: 'Constant dull heavy pressure / Tight band', label_hi: 'भारी दबाव या कसाव (तनाव सिरदर्द)' },
        { value: 'sharp_piercing', label: 'Sharp, piercing or electric shock-like', label_hi: 'तेज चुभने वाला या बिजली के झटके जैसा' }
      ],
      next: (_answer) => {
        return 'ha_triggers';
      }
    },
    ha_triggers: {
      id: 'ha_triggers',
      text: 'Is the headache worsened by bright lights or loud noises?',
      text_hi: 'क्या तेज रोशनी या शोर से आपका सिरदर्द बढ़ जाता है?',
      type: 'single_choice',
      options: [
        { value: 'yes', label: 'Yes', label_hi: 'हाँ' },
        { value: 'no', label: 'No', label_hi: 'नहीं' }
      ],
      next: (_answer) => {
        return 'ha_aura';
      }
    },
    ha_aura: {
      id: 'ha_aura',
      text: 'Did you experience any visual changes (like flashing lights or blind spots) before the headache started?',
      text_hi: 'क्या सिरदर्द शुरू होने से पहले आपको चमकती रोशनी या धुंधलापन महसूस हुआ था?',
      type: 'single_choice',
      options: [
        { value: 'yes', label: 'Yes', label_hi: 'हाँ' },
        { value: 'no', label: 'No', label_hi: 'नहीं' }
      ],
      next: (_answer) => {
        return 'ha_severity';
      }
    },
    ha_severity: {
      id: 'ha_severity',
      text: 'How severe is the headache?',
      text_hi: 'सिरदर्द कितना तेज है?',
      type: 'single_choice',
      options: [
        { value: 'mild', label: 'Mild (Noticeable but manageable)', label_hi: 'हल्का (महसूस होता है पर काम कर सकते हैं)' },
        { value: 'moderate', label: 'Moderate (Affects daily activities)', label_hi: 'मध्यम (रोजमर्रा के कामों में दिक्कत)' },
        { value: 'severe', label: 'Severe (Unbearable or worst ever)', label_hi: 'गंभीर (असहनीय या अब तक का सबसे तेज दर्द)' }
      ],
      next: (_answer) => {
        return 'ha_associated';
      }
    },
    ha_associated: {
      id: 'ha_associated',
      text: 'Are you experiencing any of these other symptoms with your headache?',
      text_hi: 'क्या आपको सिरदर्द के साथ इनमें से कोई अन्य लक्षण हैं?',
      type: 'multi_choice',
      options: [
        { value: 'vision', label: 'Vision changes, blurry sight, or flashing lights (Aura)', label_hi: 'धुंधला दिखना, रोशनी की चमक या नजर कम होना' },
        { value: 'weakness', label: 'Weakness / Numbness on one side of face or body', label_hi: 'चेहरे या शरीर के एक तरफ कमजोरी/सुन्नता' },
        { value: 'speech', label: 'Difficulty speaking or slurred words', label_hi: 'बोलने में लड़खड़ाहट' },
        { value: 'photophobia', label: 'Extreme sensitivity to light and loud sounds', label_hi: 'तेज रोशनी या आवाज बर्दाश्त न होना' },
        { value: 'nausea', label: 'Nausea or vomiting', label_hi: 'जी मिचलाना या उल्टी' },
        { value: 'none', label: 'None of these', label_hi: 'इनमें से कोई नहीं' }
      ],
      next: (answer) => {
        if (Array.isArray(answer) && answer.includes('vision')) return { type: 'red_flag', flag_id: 'headache_vision_changes' };
        if (Array.isArray(answer) && answer.includes('weakness')) return { type: 'red_flag', flag_id: 'headache_unilateral_weakness' };
        if (Array.isArray(answer) && answer.includes('speech')) return { type: 'red_flag', flag_id: 'headache_slurred_speech' };
        return null;
      }
    }
  }
};
