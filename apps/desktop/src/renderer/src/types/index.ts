export type MascotState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export interface Task {
  id: string;
  task_date: string;
  time_slot: string;
  exact_time: string | null;
  start_time: string | null;
  end_time: string | null;
  content: string;
  note: string | null;
  is_important: boolean;
  is_completed: boolean;
  status: 'pending' | 'completed'; // For backward compatibility if used, but is_completed is the primary boolean
}

export interface ResponseMetadata {
  type: string;
  user_text: string;
  intent: string;
  reply_text: string;
  tasks?: Task[];
  has_audio: boolean;
}
