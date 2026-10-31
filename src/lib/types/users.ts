export interface UserProfile {
  telegram_id: number;
  username: string;
  phone: string | null;
  full_name: string;
  last_login: string | null;
  is_owner: boolean;
  profile: {
    avatar: string | null;
    bio: string | null;
    website: string | null;
  } | null;
  stats: {
    xp: number;
    level: string;
  } | null;
}

export interface HeatmapResponse {
  telegram_id: number;
  start_date: string;
  end_date: string;
  total_active_days: number;
  current_streak: number;
  max_streak: number;
  heatmap: Record<string, number>;
}

export interface HistoryItem {
  id: number;
  problem: { id: number; title: string };
  language: string | null;
  status: boolean;
  verdict: string;
  verdict_display: string;
  progress: string;
  execution_time: number | null;
  execution_memory: number | null;
  submitted_at: string | null;
}

export interface HistoryResponse {
  results: HistoryItem[];
  count: number;
  has_more: boolean;
  next_cursor: string | null;
}

export interface SubmissionDetail {
  id: number;
  problem: { id: number; title: string };
  language: string | null;
  code: string | null;
  test_results: unknown | null;
  is_owner: boolean;
  status: boolean;
  verdict: string;
  verdict_display: string;
  progress: string;
  execution_time: number | null;
  execution_memory: number | null;
  submitted_at: string | null;
}



export type ActivityItem =
  | {
      type: "submission";
      id: number;
      title: string;
      verdict: string;
      verdict_display: string;
      timestamp: string;
    }
  | {
      type: "test";
      slug: string;
      title: string;
      grade: string | number | null;
      score: number | null;
      timestamp: string;
    }
  | {
      type: "contest";
      id: string;
      title: string;
      rank: number | null;
      xp: number | null;
      timestamp: string;
    };


export interface ActivityResponse {
  telegram_id: number;
  username: string;
  activity: ActivityItem[];
  count: number;
}


export interface CertificateItem {
  id: string;
  certificate_code: string;
  source_type: string;
  source_title: string;
  verify_url: string;
  pdf_url: string | null;
  issued_at: string | null;
}

export interface CertificatesResponse {
  telegram_id: number;
  username: string;
  certificates: CertificateItem[];
  count: number;
}

export interface EnrolledCourse {
  course: {
    id: number;
    slug: string;
    title: string;
    is_active: boolean;
  };
  is_paid: boolean | null;
  is_completed: boolean;
  finished_lessons: number;
  total_lessons: number;
  finished_tests: number;
  total_tests: number;
  progress_percent: number;
  completed_at: string | null;
  enrolled_at: string | null;
}

export interface UserCoursesResponse {
  telegram_id: number;
  username: string;
  courses: EnrolledCourse[];
  count: number;
}
