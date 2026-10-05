import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CodeRunner from '@/components/CodeRunner';
import { CompleteButton, Quiz } from '@/components/LessonInteractive';
import RichText from '@/components/RichText';
import { getAllCourses, getCourse } from '@/lib/db';

type Params = { course: string; lesson: string };

export function generateStaticParams(): Params[] {
  return getAllCourses().flatMap((c) => getCourse(c.slug)!.lessons.map((l) => ({ course: c.slug, lesson: l.slug })));
}
export const dynamicParams = false;

function find(p: Params) {
  const course = getCourse(p.course);
  const idx = course?.lessons.findIndex((l) => l.slug === p.lesson) ?? -1;
  return course && idx >= 0 ? { course, lesson: course.lessons[idx], idx } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const f = find(await params);
  return f ? { title: `${f.lesson.title} · ${f.course.short}`, description: f.lesson.summary } : {};
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const f = find(await params);
  if (!f) notFound();
  const { course, lesson, idx } = f;
  const prev = course.lessons[idx - 1];
  const next = course.lessons[idx + 1];
  const nextCourse = !next ? getAllCourses().find((c) => c.position === course.position + 1) : undefined;
  const nextHref = next ? `/courses/${course.slug}/${next.slug}` : nextCourse ? `/courses/${nextCourse.slug}` : '/#roadmap';
  const nextLabel = next ? `Next: ${next.title}` : nextCourse ? `Next course: ${nextCourse.title}` : 'Back to the roadmap';

  return (
    <div className="wrap">
      <header className="lesson-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/#roadmap">Roadmap</Link><span>/</span>
          <Link href={`/courses/${course.slug}`}>{course.title}</Link><span>/</span>
          <span>Lesson {idx + 1} of {course.lessons.length}</span>
        </nav>
        <h1 style={{ fontSize: 'clamp(1.9rem, 4.6vw, 2.8rem)' }}>{lesson.title}</h1>
        <p className="muted" style={{ fontSize: '1.08rem' }}>{lesson.summary}</p>
        <div className="row"><span className="pill">about {lesson.minutes} min</span><span className="pill">{course.level}</span></div>
      </header>

      <div className={`lesson-grid${lesson.code ? '' : ' no-code'}`}>
        <article className="lesson-text">
          <div className="prose">{lesson.body.map((p, i) => <p key={i}><RichText text={p} /></p>)}</div>
          {lesson.keyIdeas.length > 0 && (
            <div className="key">
              <b>Key ideas</b>
              <ul>{lesson.keyIdeas.map((k, i) => <li key={i}><RichText text={k} /></li>)}</ul>
            </div>
          )}
          <div style={{ display: 'grid', gap: 10 }}>
            <b>Learn it from the best</b>
            <ul className="res">
              {lesson.resources.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    <span className={`type ${r.type}`}>{r.type}</span>
                    <span className="rt">{r.title}</span>
                    <span className="mins">{r.minutes ? `${r.minutes} min` : ''} ↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {lesson.quiz.length > 0 && <Quiz key={lesson.slug} questions={lesson.quiz} />}
        </article>
        {lesson.code && <CodeRunner key={lesson.slug} code={lesson.code} />}
      </div>

      <footer className="lesson-foot">
        {prev ? <Link className="btn" href={`/courses/${course.slug}/${prev.slug}`}>← {prev.title}</Link> : <span />}
        <CompleteButton course={course.slug} lesson={lesson.slug} nextHref={nextHref} nextLabel={nextLabel} />
      </footer>
    </div>
  );
}
