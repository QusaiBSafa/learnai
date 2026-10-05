export type ResourceType = 'video' | 'article' | 'docs' | 'interactive' | 'course';

export type Resource = { title: string; url: string; type: ResourceType; minutes: number | null };

export type QuizQuestion = { q: string; options: string[]; answer: number; explain?: string };

export type CodeSample = {
  lang: 'python' | 'javascript';
  title?: string;
  source: string;
  runnable: boolean;
  note?: string;
};

export type Lesson = {
  slug: string;
  course: string;
  title: string;
  summary: string;
  minutes: number;
  position: number;
  body: string[];
  keyIdeas: string[];
  quiz: QuizQuestion[];
  code: CodeSample | null;
  resources: Resource[];
};

export type CourseSummary = {
  slug: string;
  stage: string;
  title: string;
  short: string;
  level: string;
  blurb: string;
  position: number;
  lessonCount: number;
  minutes: number;
};

export type Course = CourseSummary & { stageTitle: string; lessons: Lesson[] };

export type Stage = { slug: string; title: string; position: number; courses: CourseSummary[] };
