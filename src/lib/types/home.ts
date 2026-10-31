export type CourseHero = {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  teacher: { id: number; full_name: string };
};

export type TeacherCenter = { id: number; name: string; icon: string | null };

export type Teacher = {
  id: number;
  full_name: string;
  profile: { avatar: string | null; center: TeacherCenter | null } | null;
};

export type HomeStats = { s: number; l: number; p: number };

export type HomePageData = {
  stats: HomeStats;
  teachers: Teacher[];
  hero: CourseHero[];
};