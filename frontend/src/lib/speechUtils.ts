/**
 * Utility functions to parse and normalize spoken ASR inputs (English, Hindi, Hinglish)
 */

const WORD_TO_DIGIT: Record<string, string> = {
  // English words
  zero: '0',
  oh: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',

  // Hindi words in Devanagari
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
  'शून्य': '0',
  'एक': '1',
  'दो': '2',
  'तीन': '3',
  'चार': '4',
  'पाँच': '5',
  'पांच': '5',
  'छह': '6',
  'छः': '6',
  'सात': '7',
  'आठ': '8',
  'नौ': '9',

  // Hinglish transliterated words
  shunya: '0',
  ek: '1',
  do: '2',
  teen: '3',
  char: '4',
  chaar: '4',
  paanch: '5',
  panch: '5',
  che: '6',
  chhe: '6',
  saat: '7',
  sat: '7',
  aath: '8',
  ath: '8',
  nau: '9',
};

/**
 * Extracts a sequence of digits from spoken text, handling raw digits,
 * English number words ("one two three"), Hindi number words ("एक दो तीन"),
 * and Hinglish phonetic words ("ek do teen").
 */
export function extractDigitsFromSpokenText(spokenText: string): string {
  if (!spokenText) return '';

  // Clean and split into individual word tokens
  const tokens = spokenText
    .toLowerCase()
    .replace(/[,.-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let result = '';

  for (const token of tokens) {
    // If token directly contains digits (e.g. "123", "91")
    if (/\d/.test(token)) {
      result += token.replace(/\D/g, '');
    } else if (WORD_TO_DIGIT[token]) {
      result += WORD_TO_DIGIT[token];
    } else {
      // Check for compound spoken tokens or Devanagari numerals
      for (const char of token) {
        if (WORD_TO_DIGIT[char]) {
          result += WORD_TO_DIGIT[char];
        } else if (/\d/.test(char)) {
          result += char;
        }
      }
    }
  }

  return result;
}

/**
 * Matches spoken language selection keywords
 */
export function matchSpokenLanguage(text: string): 'en' | 'hi' | null {
  const lower = text.toLowerCase();
  if (
    lower.includes('hindi') ||
    lower.includes('हिंदी') ||
    lower.includes('हिन्दी') ||
    lower.includes('hind')
  ) {
    return 'hi';
  }
  if (
    lower.includes('english') ||
    lower.includes('अंग्रेजी') ||
    lower.includes('अंग्रेज़ी') ||
    lower.includes('angrezi') ||
    lower.includes('eng')
  ) {
    return 'en';
  }
  return null;
}
