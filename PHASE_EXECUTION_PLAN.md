# MEDIKIOSK PHASE-WISE EXECUTION PLAN

## 0. Stabilisation (4 hours)
- Fix session state bleed.
- Ensure adaptive interview works for all 5 complaints.
- Implement red-flag UI lock (already done, but verify).
- Seed doctor login and test dashboard.

## 1. Gemini + Sarvam Integration (6 hours)
- **Gemini Integration**: Use Gemini 1.5 Flash for:
  - Semantic red-flag detection (secondary to deterministic).
  - Off-script follow-up generation (when "Other" is selected).
  - OCR assistance (if Sarvam fails).
- **Sarvam Integration**: Replace WebSpeech with Sarvam ASR/TTS; replace Tesseract with Sarvam Vision for multilingual OCR.

## 2. Full AYUSH (10 dimensions) (4 hours)
- Add remaining 5 dimensions: Sara, Samhanana, Pramana, Satmya, Vaya.
- Use Gemini (or Medra 4B) to generate clinician-guided questions for these.
- Add clinician verification step.

## 3. ABDM / FHIR + ABHA ID (6 hours)
- Implement ABHA ID entry/scan in patient registration.
- Generate valid FHIR bundles for sessions.
- Push to ABDM sandbox (if credentials available) or mock with documentation.

## 4. Patient Dashboard (6 hours)
- Supabase Auth for patients.
- Dashboard showing past visits, medical history, documents.

## 5. Advanced Features (4 hours)
- Parse lab values from OCR; highlight abnormal values.
- Hardcode drug interaction table and flag potential conflicts.
- Add large-text toggle.

## 6. Model Training (Parallel – 8 hours)
- Curate OPD dialogue dataset from Kaggle (e.g., patient-doctor conversations).
- Fine-tune Medra 4B (or Gemini) using QLoRA on a T4 GPU.
- Evaluate on a holdout set.
- Integrate the fine-tuned model as the primary off-script engine.

## 7. Deployment & Polish (4 hours)
- Deploy frontend to Vercel, backend + Ollama to Railway.
- Run full E2E tests.
- Record demo video.

## Timeline
Total development time: ~38 hours (excluding parallel training). We have 3 days (~72 hours) – feasible with focused effort.

## Jury Pitch
We will inform the jury that the core system is functional, and we are currently training the models on real-world OPD data to enhance accuracy and adaptability. The models will be fully integrated and production-ready by the deadline.
