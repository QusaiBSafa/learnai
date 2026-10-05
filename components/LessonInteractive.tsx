'use client';
import Link from 'next/link';
import { useState } from 'react';
import RichText from './RichText';
import { setDone, useProgress } from '@/lib/progress';
import type { QuizQuestion } from '@/lib/types';

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  return (
    <div className="quiz">
      <b>Quick check</b>
      {questions.map((q, qi) => {
        const choice = picked[qi];
        const solved = choice === q.answer;
        return (
          <div className="q" key={qi}>
            <span><RichText text={q.q} /></span>
            {q.options.map((o, oi) => (
              <button
                key={oi}
                type="button"
                disabled={solved}
                className={choice === oi ? (oi === q.answer ? 'right' : 'wrong') : solved && oi === q.answer ? 'right' : ''}
                onClick={() => setPicked((p) => p.map((v, i) => (i === qi ? oi : v)))}
              >
                <RichText text={o} />
              </button>
            ))}
            {choice !== null && (
              <span className="explain" role="status">
                {solved ? '✓ Correct. ' : 'Not quite, try another answer. '}
                {solved && q.explain ? <RichText text={q.explain} /> : null}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CompleteButton({ course, lesson, nextHref, nextLabel }: { course: string; lesson: string; nextHref: string; nextLabel: string }) {
  const { isDone } = useProgress();
  const done = isDone(course, lesson);
  const [pop, setPop] = useState(false);
  return (
    <div className="row">
      <button
        type="button"
        className={`btn complete${done ? ' done' : ''}${pop ? ' celebrate' : ''}`}
        aria-pressed={done}
        onClick={() => {
          setDone(course, lesson, !done);
          setPop(!done);
        }}
        onAnimationEnd={() => setPop(false)}
      >
        {done ? '✓ Lesson done' : 'Mark as done'}
      </button>
      <Link className="btn primary" href={nextHref} onClick={() => !done && setDone(course, lesson, true)}>
        {nextLabel} →
      </Link>
    </div>
  );
}
