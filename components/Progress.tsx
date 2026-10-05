'use client';
import Link from 'next/link';
import { useProgress } from '@/lib/progress';

export function CourseBadge({ course, lessons }: { course: string; lessons: string[] }) {
  const { countIn } = useProgress();
  const n = countIn(course, lessons);
  if (!n) return null;
  return <span className="pill" style={{ color: 'var(--accent)' }}>{n === lessons.length ? '✓ complete' : `${n}/${lessons.length} done`}</span>;
}

/** Hero button that jumps to the first lesson not yet finished, across the whole roadmap. */
export function ContinueButton({ path }: { path: { course: string; lesson: string }[] }) {
  const { done, total } = useProgress();
  const next = path.find((p) => !done[`${p.course}/${p.lesson}`]) ?? path[0];
  return (
    <Link className="btn primary" href={`/courses/${next.course}/${next.lesson}`}>
      {total ? 'Continue where you left off' : 'Start learning'} →
    </Link>
  );
}

export function CourseProgress({ course, lessons }: { course: string; lessons: { slug: string; title: string; summary: string; minutes: number }[] }) {
  const { done, countIn } = useProgress();
  const n = countIn(course, lessons.map((l) => l.slug));
  const next = lessons.find((l) => !done[`${course}/${l.slug}`]) ?? lessons[0];
  return (
    <>
      <div className="progress"><b style={{ width: `${Math.round((n / lessons.length) * 100)}%` }} /></div>
      <span className="muted" style={{ fontSize: '.9rem' }}>{n} of {lessons.length} lessons done</span>
      <Link className="btn primary" href={`/courses/${course}/${next.slug}`}>
        {n === 0 ? 'Start course' : n === lessons.length ? 'Review from the start' : `Continue: ${next.title}`} →
      </Link>
    </>
  );
}

export function LessonList({ course, lessons }: { course: string; lessons: { slug: string; title: string; summary: string; minutes: number }[] }) {
  const { done } = useProgress();
  const next = lessons.find((l) => !done[`${course}/${l.slug}`]);
  return (
    <ol className="stops big">
      {lessons.map((l, j) => {
        const isDone = Boolean(done[`${course}/${l.slug}`]);
        return (
          <li key={l.slug} className={isDone ? 'done' : next?.slug === l.slug ? 'now' : ''}>
            <Link href={`/courses/${course}/${l.slug}`}>
              <span className="dot">{isDone ? '✓' : j + 1}</span>
              <span>
                <div className="t">{l.title}</div>
                <div className="s">{l.summary}</div>
              </span>
              <span className="m">{l.minutes} min</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
