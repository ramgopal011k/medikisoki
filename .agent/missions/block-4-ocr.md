# Block 4 (Part B): Real OCR Pipeline

## Scope
- OCR Upload UI in Medical History Flow
- In-browser Tesseract.js processing
- Manual correction form
- SQLite persistence (`documents`, `ocr_extractions`)

## Owned Paths
- `frontend/src/pages/DocumentUploadFlow.tsx`
- `backend/src/index.ts` (POST documents, POST ocr-extractions)

## Exit Criteria
- Camera upload works
- Tesseract extracts text
- Corrected values saved with `ocr_extracted` provenance
