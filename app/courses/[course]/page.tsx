import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CourseProgress, LessonList } from '@/components/Progress';
import { getAllCourses, getCourse } from '@/lib/db';

type Params = { course: string };

export function generateStaticParams(): Params[] {
  return getAllCourses().map((c) => ({ course: c.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const c = getCourse((await params).course);
  return c ? { title: c.title, description: c.blurb } : {};
}

export default async function CoursePage({ params }: { params: Promise<Params> }) {
  const course = getCourse((await params).course);
  if (!course) notFound();
  const lessons = course.lessons.map((l) => ({ slug: l.slug, title: l.title, summary: l.summary, minutes: l.minutes }));
  const resources = course.lessons.reduce((n, l) => n + l.resources.length, 0);

  return (
    <div className="wrap">
      <section className="course-hero">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/#roadmap">Roadmap</Link><span>/</span><span>Stage: {course.stageTitle}</span>
        </nav>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>{course.title}</h1>
        <p className="lede">{course.blurb}</p>
        <div className="row">
          <span className="pill">{course.level}</span>
          <span className="pill">{course.lessonCount} lessons</span>
          <span className="pill">~{Math.max(1, Math.round(course.minutes / 60))} h</span>
          <span className="pill">{resources} free resources</span>
        </div>
      </section>
      <div className="course-body">
        <LessonList course={course.slug} lessons={lessons} />
        <aside className="side-box">
          <span className="eyebrow">Your progress</span>
          <CourseProgress course={course.slug} lessons={lessons} />
        </aside>
      </div>
    </div>
  );
}
