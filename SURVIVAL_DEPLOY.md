# MEDIKIOSK DEPLOYMENT CHECKLIST

## 1. Supabase
- [ ] Run `survival_migration.sql` in Supabase SQL Editor.
- [ ] Copy `SUPABASE_URL` and `SERVICE_ROLE_KEY` to `.env`.

## 2. Environment Variables
- `frontend/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `backend/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## 3. Deploy
- Frontend: `vercel --prod`
- Backend: `railway up`

## 4. Demo Check
- [ ] Chief Complaint screen loads.
- [ ] Follow-up questions render from JSON.
- [ ] Red-flag triggers lock screen.
- [ ] Doctor dashboard updates in realtime.
- [ ] OCR upload extracts text.
- [ ] Summary card displays.
- [ ] High-contrast toggle works.
