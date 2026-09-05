import { describe, it, expect } from 'vitest';
import { getInterviewTree } from '../src/lib/trees';
import { isRedFlag } from '../../.agent/types/interview-tree';

describe('Interview Trees Branching Logic', () => {

  describe('Chest Pain Tree', () => {
    it('routes right side to exacerbating', () => {
      const tree = getInterviewTree('Chest pain');
      const next = tree!.questions['cp_site'].next('right');
      expect(next).toBe('cp_exacerbating');
    });

    it('routes left arm radiation to red flag with flag_id', () => {
      const tree = getInterviewTree('Chest pain');
      const next = tree!.questions['cp_radiation'].next('left_arm');
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('chest_pain_left_arm_radiation');
    });

    it('routes jaw radiation to red flag with flag_id', () => {
      const tree = getInterviewTree('Chest pain');
      const next = tree!.questions['cp_radiation'].next('jaw');
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('chest_pain_jaw_radiation');
    });

    it('routes crushing character to cardiac symptoms', () => {
      const tree = getInterviewTree('Chest pain');
      const next = tree!.questions['cp_character'].next('crushing');
      expect(next).toBe('cp_associated_cardiac');
    });

    it('routes sweating in cardiac associated to red flag', () => {
      const tree = getInterviewTree('Chest pain');
      const next = tree!.questions['cp_associated_cardiac'].next(['sweating']);
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('chest_pain_sweating');
    });

    it('routes breathlessness in cardiac associated to red flag', () => {
      const tree = getInterviewTree('Chest pain');
      const next = tree!.questions['cp_associated_cardiac'].next(['breathless']);
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('chest_pain_breathlessness');
    });
  });

  describe('Fever Tree', () => {
    it('routes >1 week duration to travel', () => {
      const tree = getInterviewTree('Fever');
      const next = tree!.questions['fever_duration'].next('more_than_week');
      expect(next).toBe('fever_travel');
    });

    it('routes <3 days duration to temp', () => {
      const tree = getInterviewTree('Fever');
      const next = tree!.questions['fever_duration'].next('less_3_days');
      expect(next).toBe('fever_temp');
    });

    it('routes high temp to red flag with flag_id', () => {
      const tree = getInterviewTree('Fever');
      const next = tree!.questions['fever_temp'].next('high');
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('fever_high_temp');
    });

    it('routes neck stiffness to red flag with flag_id', () => {
      const tree = getInterviewTree('Fever');
      const next = tree!.questions['fever_associated'].next(['neck_stiffness']);
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('fever_neck_stiffness');
    });
  });

  describe('Abdominal Pain Tree', () => {
    it('routes lower right to red flag (appendicitis)', () => {
      const tree = getInterviewTree('Abdominal pain');
      const next = tree!.questions['abd_site'].next('lower_right');
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('abdominal_lower_right_appendicitis');
    });

    it('routes upper left to onset', () => {
      const tree = getInterviewTree('Abdominal pain');
      const next = tree!.questions['abd_site'].next('upper_left');
      expect(next).toBe('abd_onset');
    });

    it('routes sudden onset to red flag', () => {
      const tree = getInterviewTree('Abdominal pain');
      const next = tree!.questions['abd_onset'].next('sudden');
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('abdominal_sudden_onset');
    });

    it('routes blood in stool to red flag', () => {
      const tree = getInterviewTree('Abdominal pain');
      const next = tree!.questions['abd_bowel'].next('blood');
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('abdominal_blood_in_stool');
    });
  });

  describe('Headache Tree', () => {
    it('routes thunderclap onset to red flag', () => {
      const tree = getInterviewTree('Headache');
      const next = tree!.questions['ha_onset'].next('thunderclap');
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('headache_thunderclap');
    });

    it('routes slow onset to location', () => {
      const tree = getInterviewTree('Headache');
      const next = tree!.questions['ha_onset'].next('slow');
      expect(next).toBe('ha_location');
    });

    it('routes vision changes to red flag', () => {
      const tree = getInterviewTree('Headache');
      const next = tree!.questions['ha_associated'].next(['vision', 'nausea']);
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('headache_vision_changes');
    });

    it('routes nausea only to null (no red flag)', () => {
      const tree = getInterviewTree('Headache');
      const next = tree!.questions['ha_associated'].next(['nausea']);
      expect(next).toBe(null);
    });
  });

  describe('Back Pain Tree', () => {
    it('routes upper back to onset', () => {
      const tree = getInterviewTree('Back pain');
      const next = tree!.questions['bp_location'].next('upper');
      expect(next).toBe('bp_onset');
    });

    it('routes trauma onset to red flag', () => {
      const tree = getInterviewTree('Back pain');
      const next = tree!.questions['bp_onset'].next('trauma');
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('back_pain_trauma');
    });

    it('routes spontaneous onset to radiation', () => {
      const tree = getInterviewTree('Back pain');
      const next = tree!.questions['bp_onset'].next('spontaneous');
      expect(next).toBe('bp_radiation');
    });

    it('routes saddle anesthesia to red flag', () => {
      const tree = getInterviewTree('Back pain');
      const next = tree!.questions['bp_numbness'].next(['saddle_anesthesia']);
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('back_pain_cauda_equina_saddle');
    });
  });

  describe('Cough Tree', () => {
    it('routes productive cough to color check', () => {
      const tree = getInterviewTree('Cough');
      const next = tree!.questions['cough_type'].next('productive');
      expect(next).toBe('cough_color');
    });

    it('routes dry cough to timing / triggers question', () => {
      const tree = getInterviewTree('Cough');
      const next = tree!.questions['cough_type'].next('dry');
      expect(next).toBe('cough_timing');
    });

    it('routes bloody phlegm to red flag', () => {
      const tree = getInterviewTree('Cough');
      const next = tree!.questions['cough_color'].next('blood');
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('cough_hemoptysis');
    });

    it('routes breathlessness to red flag', () => {
      const tree = getInterviewTree('Cough');
      const next = tree!.questions['cough_associated'].next(['breathless']);
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('cough_severe_breathlessness');
    });

    it('routes clear phlegm to cough timing', () => {
      const tree = getInterviewTree('Cough');
      const next = tree!.questions['cough_color'].next('clear');
      expect(next).toBe('cough_timing');
    });
  });

  describe('Other / General Tree', () => {
    it('routes description to duration', () => {
      const tree = getInterviewTree('Other');
      const next = tree!.questions['q1_description'].next('body ache');
      expect(next).toBe('q2_duration');
    });

    it('routes duration to severity scale', () => {
      const tree = getInterviewTree('Other');
      const next = tree!.questions['q2_duration'].next('this_week');
      expect(next).toBe('q3_severity');
    });

    it('routes severity to systemic symptoms', () => {
      const tree = getInterviewTree('Other');
      const next = tree!.questions['q3_severity'].next('7');
      expect(next).toBe('q4_systemic');
    });

    it('routes severe dizziness in systemic check to red flag', () => {
      const tree = getInterviewTree('Other');
      const next = tree!.questions['q4_systemic'].next(['dizziness']);
      expect(isRedFlag(next)).toBe(true);
      if (isRedFlag(next)) expect(next.flag_id).toBe('general_severe_dizziness');
    });
  });

  describe('isRedFlag type guard', () => {
    it('returns false for null', () => {
      expect(isRedFlag(null)).toBe(false);
    });

    it('returns false for string', () => {
      expect(isRedFlag('cp_onset')).toBe(false);
    });

    it('returns true for RedFlagResult object', () => {
      expect(isRedFlag({ type: 'red_flag', flag_id: 'test' })).toBe(true);
    });
  });

});
