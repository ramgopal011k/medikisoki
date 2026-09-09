import fs from 'fs';
import path from 'path';

export interface DoctorAccount {
  doctor_id: string;
  name: string;
  email: string;
  password_hash: string;
  hospital_id?: string | null;
  role?: string;
  created_at: string;
}

const DATA_FILE = path.resolve(__dirname, '../../data/doctors.json');

function loadDoctors(): DoctorAccount[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read doctors.json:', err);
  }
  return [];
}

function saveDoctors(doctors: DoctorAccount[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(doctors, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write doctors.json:', err);
  }
}

export function getDoctorByEmail(email: string): DoctorAccount | undefined {
  const doctors = loadDoctors();
  return doctors.find((d) => d.email.toLowerCase() === email.toLowerCase());
}

export function saveDoctorAccount(doctor: DoctorAccount): void {
  const doctors = loadDoctors().filter((d) => d.email.toLowerCase() !== doctor.email.toLowerCase());
  doctors.push(doctor);
  saveDoctors(doctors);
}
