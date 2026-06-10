export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'professor' | 'aluno';
  academy_id: string;
  photo_url?: string | null;
  face_descriptor?: number[] | null;
  belt: string;
  belt_updated_at?: string | null;
  phone?: string | null;
  emergency_phone?: string | null;
  cep?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  created_at: string;
}

export interface Academy {
  id: string;
  owner_id: string;
  name: string;
  sport: string;
  monthly_price: number;
  due_day: number;
  stripe_customer_id?: string | null;
  subscription_status?: string | null;
  created_at: string;
}

export interface Class {
  id: string;
  academy_id: string;
  name: string;
  professor_id: string;
  weekdays: number[]; // e.g., [1, 3, 5] for Monday, Wednesday, Friday
  start_time: string; // e.g., "19:00"
  end_time: string; // e.g., "20:30"
  created_at: string;
}

export interface Checkin {
  id: string;
  academy_id: string;
  class_id: string;
  professor_id: string;
  photo_url: string;
  checked_in_at: string;
  confirmed_at?: string | null;
  status: 'pending' | 'confirmed';
}

export interface Attendance {
  id: string;
  checkin_id: string;
  student_id: string;
  academy_id: string;
  source: 'ai' | 'manual';
  similarity?: number | null;
  present_at: string;
}

export interface Financial {
  id: string;
  student_id: string;
  academy_id: string;
  amount: number;
  due_date: string;
  paid_at?: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

export interface BeltHistory {
  id: string;
  student_id: string;
  academy_id: string;
  belt: string;
  graded_at: string;
  graded_by: string;
  notes?: string | null;
  trainings_at_graduation?: number | null;
}
