# Database Schema

| Table | Key columns | Relationship |
|---|---|---|
| `hospitals` | `hospital_id` PK, `hospital_name`, `location`, `hospital_type` | 1—N `sessions` |
| `doctors` | `doctor_id` PK, `name`, `email`, `hospital_id` FK, `uid` | N—1 `hospitals` |
| `sessions` | `session_id` PK, `hospital_id` FK, `patient_name`, `dummy_aadhaar`, `language`, `chief_complaint`, `session_token`, `created_at` | 1—N facts/history/documents/flags; 1—1 `summaries` |
| `history_facts` | `fact_id` PK, `session_id` FK, `complaint`, `question_id`, `question_text`, `answer`, `answer_value`, `red_flag_id`, `provenance`, `verified`, `created_at` | N—1 `sessions` |
| `medical_history` | `item_id` PK, `session_id` FK, `category`, `value`, `provenance`, `verified` | N—1 `sessions` |
| `ayush_assessments` | `assessment_id` PK, `session_id` FK, `dimension`, `value`, `provenance` | N—1 `sessions` |
| `documents` | `document_id` PK, `session_id` FK, `file_url`, `upload_status`, `ocr_status`, `created_at` | N—1 `sessions`; 1—N `ocr_extractions` |
| `ocr_extractions` | `extraction_id` PK, `document_id` FK, `raw_text`, `field_name`, `field_value`, `confidence`, `corrected_value`, `provenance`, `verified` | N—1 `documents` |
| `red_flags` | `flag_id` PK, `session_id` FK, `rule_id`, `triggered_fact_id`, `created_at`, `acknowledged_by`, `acknowledged_at` | N—1 `sessions` |
| `summaries` | `summary_id` PK, `session_id` FK, `generated_at`, `finalized` | 1—1 `sessions`; 1—N `summary_fields` |
| `summary_fields` | `field_id` PK, `summary_id` FK, `section`, `label`, `value`, `provenance`, `verified`, `edited_by` | N—1 `summaries` |
