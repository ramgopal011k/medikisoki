import type { InterviewTree } from "@/types/interview-tree";
import { chestPainTree } from './chest_pain';
import { feverTree } from './fever';
import { abdominalPainTree } from './abdominal_pain';
import { headacheTree } from './headache';
import { backPainTree } from './back_pain';
import { coughTree } from './cough';
import { otherTree } from './other';

export const trees: Record<string, InterviewTree> = {
  'Chest pain': chestPainTree,
  'Fever': feverTree,
  'Abdominal pain': abdominalPainTree,
  'Headache': headacheTree,
  'Back pain': backPainTree,
  'Cough': coughTree,
  'Other': otherTree,
  'छाती में दर्द': chestPainTree,
  'बुखार': feverTree,
  'पेट में दर्द': abdominalPainTree,
  'सिरदर्द': headacheTree,
  'पीठ में दर्द': backPainTree,
  'खांसी': coughTree,
  'अन्य': otherTree
};

export const getInterviewTree = (complaint: string): InterviewTree | null => {
  return trees[complaint] || null;
};
