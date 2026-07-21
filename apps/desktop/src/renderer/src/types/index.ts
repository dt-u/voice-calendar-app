export type MascotState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export interface Task {
  id?: number;
  task_date: string;
  time_slot: string;
  exact_time: string | null;
  content: string;
  is_important: boolean;
  status: 'pending' | 'completed';
}

export interface ResponseMetadata {
  type: string;
  user_text: string;
  intent: string;
  reply_text: string;
  tasks?: Task[];
  has_audio: boolean;
}
