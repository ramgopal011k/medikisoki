// Hardcoded interaction map for the hackathon
const DRUG_INTERACTIONS: Record<string, string[]> = {
  'amlodipine': ['simvastatin', 'clarithromycin'],
  'simvastatin': ['amlodipine', 'diltiazem', 'amiodarone'],
  'warfarin': ['aspirin', 'ibuprofen', 'fluconazole'],
  'aspirin': ['warfarin', 'ibuprofen']
};

export function analyzeText(text: string) {
  const normalizedText = text.toLowerCase();
  
  const findings = {
    drugsDetected: [] as string[],
    interactions: [] as { drugA: string, drugB: string, risk: string }[],
    abnormalLabs: [] as string[]
  };

  // 1. Detect drugs and interactions
  Object.keys(DRUG_INTERACTIONS).forEach(drug => {
    if (normalizedText.includes(drug)) {
      findings.drugsDetected.push(drug);
    }
  });

  // Check for conflicts within detected drugs
  for (let i = 0; i < findings.drugsDetected.length; i++) {
    const drugA = findings.drugsDetected[i];
    const conflicts = DRUG_INTERACTIONS[drugA];
    
    for (let j = i + 1; j < findings.drugsDetected.length; j++) {
      const drugB = findings.drugsDetected[j];
      if (conflicts.includes(drugB)) {
        findings.interactions.push({
          drugA,
          drugB,
          risk: `High Risk: Co-administration of ${drugA} and ${drugB} may cause severe adverse effects.`
        });
      }
    }
  }

  // 2. Parse mock abnormal labs (regex matching common patterns)
  // E.g., "HbA1c 7.2" or "Glucose 130"
  
  const hba1cMatch = text.match(/HbA1c\s*(?:of|is|:)?\s*(\d+\.?\d*)/i);
  if (hba1cMatch && parseFloat(hba1cMatch[1]) > 6.5) {
    findings.abnormalLabs.push(`HbA1c is elevated at ${hba1cMatch[1]}% (Normal < 5.7%)`);
  }

  const glucoseMatch = text.match(/(?:fasting\s*)?glucose\s*(?:of|is|:)?\s*(\d+)/i);
  if (glucoseMatch && parseInt(glucoseMatch[1]) > 100) {
    findings.abnormalLabs.push(`Glucose is elevated at ${glucoseMatch[1]} mg/dL (Normal < 100)`);
  }
  
  const bpMatch = text.match(/BP\s*(?:of|is|:)?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i);
  if (bpMatch) {
    const sys = parseInt(bpMatch[1]);
    const dia = parseInt(bpMatch[2]);
    if (sys > 130 || dia > 80) {
      findings.abnormalLabs.push(`Blood Pressure is elevated at ${sys}/${dia} mmHg`);
    }
  }

  return findings;
}
