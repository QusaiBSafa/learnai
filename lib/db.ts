import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import type { Course, CourseSummary, Lesson, Stage } from './types';

let db: DatabaseSync | null = null;
function conn() {
  db ??= new DatabaseSync(join(process.cwd(), 'data', 'learnai.db'), { readOnly: true });
  return db;
}

type CourseRow = { slug: string; stage_slug: string; title: string; short: string; level: string; blurb: string; position: number; lessons: number; minutes: number };

const toSummary = (r: CourseRow): CourseSummary => ({
  slug: r.slug, stage: r.stage_slug, title: r.title, short: r.short, level: r.level, blurb: r.blurb,
  position: r.position, lessonCount: r.lessons, minutes: r.minutes,
});

const COURSE_SQL = `
  SELECT c.*, COUNT(l.id) AS lessons, COALESCE(SUM(l.minutes), 0) AS minutes
  FROM courses c LEFT JOIN lessons l ON l.course_slug = c.slug`;

export function getStages(): Stage[] {
  const stages = conn().prepare('SELECT slug, title, position FROM stages ORDER BY position').all() as unknown as Omit<Stage, 'courses'>[];
  const courses = (conn().prepare(`${COURSE_SQL} GROUP BY c.slug ORDER BY c.position`).all() as unknown as CourseRow[]).map(toSummary);
  return stages.map((s) => ({ ...s, courses: courses.filter((c) => c.stage === s.slug) }));
}

export function getAllCourses(): CourseSummary[] {
  return getStages().flatMap((s) => s.courses);
}

type LessonRow = { id: number; course_slug: string; slug: string; title: string; summary: string; minutes: number; position: number; body: string; key_ideas: string; quiz: string; code: string | null };

function toLesson(r: LessonRow): Lesson {
  const resources = conn()
    .prepare('SELECT title, url, type, minutes FROM resources WHERE lesson_id = ? ORDER BY position')
    .all(r.id) as unknown as Lesson['resources'];
  return {
    slug: r.slug, course: r.course_slug, title: r.title, summary: r.summary, minutes: r.minutes, position: r.position,
    body: JSON.parse(r.body), keyIdeas: JSON.parse(r.key_ideas), quiz: JSON.parse(r.quiz),
    code: r.code ? JSON.parse(r.code) : null, resources: resources.map((x) => ({ ...x })),
  };
}

export function getCourse(slug: string): Course | null {
  const row = conn().prepare(`${COURSE_SQL} WHERE c.slug = ? GROUP BY c.slug`).get(slug) as unknown as CourseRow | undefined;
  if (!row) return null;
  const lessons = (conn().prepare('SELECT * FROM lessons WHERE course_slug = ? ORDER BY position').all(slug) as unknown as LessonRow[]).map(toLesson);
  const stage = conn().prepare('SELECT title FROM stages WHERE slug = ?').get(row.stage_slug) as unknown as { title: string };
  return { ...toSummary(row), stageTitle: stage.title, lessons };
}
