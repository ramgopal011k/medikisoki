# Data Research: Schema Reference

**Source**: Kaggle Dataset `indian-healthcare-patient-records`

## Fields and Types

| Field Name | Type / Example | Description / Notes |
| :--- | :--- | :--- |
| `Patient_ID` | String (`21D74F65-E20`) | Hexadecimal ID. We'll use UUIDv4 for sessions. |
| `Age` | Integer (`53`) | Patient age in years. |
| `Gender` | String (`Female`, `Male`) | Biological sex/gender. |
| `Region` | String (`Andhra Pradesh`, `Delhi`) | State or Union Territory in India. |
| `Socioeconomic_Status` | String (`Low`, `Middle`, `High`) | Derived SES indicator. |
| `Occupation` | String (`Clinical research associate`) | Broad range of jobs. |
| `Visit_Date` | Date (`2025-09-18`) | YYYY-MM-DD format. |
| `Symptoms` | String (`Fever, fatigue...`) | Comma-separated list of chief complaints. |
| `Primary_Diagnosis` | String (`Dengue`, `Malaria`) | Diagnostic outcome. |
| `Blood_Glucose_mg_dL` | Float (`100.9`) | Lab test metric. |
| `HbA1c_%` | Float (`5.9`) | Lab test metric. |
| `Total_Cholesterol_mg_dL` | Float (`233.4`) | Lab test metric. |
| `Treatment_Type` | String (`Lifestyle Changes`) | Prescribed treatment. |
| `Treatment_Outcome` | String (`Improved`, `Referred`) | Result of treatment. |
| `Imaging_Type` | String (`Ultrasound`, `None`) | Diagnostic imaging used. |
| `Imaging_Findings` | String (`Normal study`) | Free-text or categorical findings. |
| `Hospital_Type` | String (`Government`, `Private`) | Type of facility visited. |
| `Insurance_Covered` | Boolean (`True`, `False`) | Insurance status. |
| `BMI` | Float (`23.3`) | Body Mass Index. |

## Relevance to MediKiosk
- **Symptoms** aligns directly with our `chief_complaint` column (string of issues).
- **Hospital_Type** (`Government`, `Private`, `Corporate`) is a good indicator for adding a `type` to our `hospitals` table.
- **Region** maps to our `state` requirement.
- This gives us a solid baseline for generating synthetic Indian patient records.
