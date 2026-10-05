'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useProgress } from '@/lib/progress';

export type RoadmapCourse = {
  slug: string;
  title: string;
  short: string;
  level: string;
  blurb: string;
  stageTitle: string;
  stageIndex: number;
  lessons: { slug: string; title: string; summary: string; minutes: number }[];
};

const W = 640, ROW = 128, TOP = 60, X0 = 110, X1 = 530;

export default function Roadmap({ courses }: { courses: RoadmapCourse[] }) {
  const { done } = useProgress();
  const trackRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const points = useMemo(() => {
    const byStage = new Map<number, number[]>();
    courses.forEach((c, i) => byStage.set(c.stageIndex, [...(byStage.get(c.stageIndex) ?? []), i]));
    const pts: { x: number; y: number; first: boolean }[] = [];
    [...byStage.keys()].sort((a, b) => a - b).forEach((si, row) => {
      const idx = byStage.get(si)!;
      idx.forEach((ci, k) => {
        let x = idx.length === 1 ? W / 2 : X0 + ((X1 - X0) * k) / (idx.length - 1);
        if (row % 2 === 1) x = W - x;
        pts[ci] = { x, y: TOP + row * ROW, first: k === 0 };
      });
    });
    return pts;
  }, [courses]);

  const d = useMemo(() => {
    let p = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (a.y === b.y) p += ` L ${b.x} ${b.y}`;
      else {
        const dx = b.x > W / 2 ? 125 : -125;
        p += ` C ${a.x + dx} ${a.y}, ${b.x + dx} ${b.y}, ${b.x} ${b.y}`;
      }
    }
    return p;
  }, [points]);
  const height = points[points.length - 1].y + 70;

  useEffect(() => {
    if (trackRef.current) setLen(Math.ceil(trackRef.current.getTotalLength()));
  }, [d]);

  const counts = courses.map((c) => c.lessons.filter((l) => done[`${c.slug}/${l.slug}`]).length);
  const current = Math.max(0, counts.findIndex((n, i) => n < courses[i].lessons.length));
  const allDone = counts.every((n, i) => n === courses[i].lessons.length);
  const sel = selected ?? current;
  const c = courses[sel];
  const doneHere = counts[sel];
  const nextLesson = c.lessons.find((l) => !done[`${c.slug}/${l.slug}`]) ?? c.lessons[0];

  return (
    <div className="device">
      <div className="map-grid">
        <div className={`map${len ? ' animate' : ''}`} style={{ ['--len' as string]: len }}>
          <svg viewBox={`0 0 ${W} ${height}`} role="group" aria-label={`Roadmap of ${courses.length} courses`}>
            <path className="track-bg" d={d} />
            <path className="track" ref={trackRef} d={d} />
            {courses.map((course, i) => {
              const p = points[i];
              const state = counts[i] === course.lessons.length ? 'done' : i === current && !allDone ? 'now' : '';
              return (
                <g key={course.slug}>
                  {p.first && (
                    <text className="stage-label" x={W / 2} y={p.y - 36} textAnchor="middle">
                      Stage {course.stageIndex + 1} · {course.stageTitle}
                    </text>
                  )}
                  <g
                    className={`station ${state} ${i === sel ? 'sel' : ''}`}
                    style={{ ['--i' as string]: i }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${course.title}: ${counts[i]} of ${course.lessons.length} lessons done`}
                    aria-pressed={i === sel}
                    onClick={() => setSelected(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected(i);
                      }
                    }}
                  >
                    <circle className="pulse" cx={p.x} cy={p.y} r={14} />
                    <circle className="ring" cx={p.x} cy={p.y} r={13} />
                    <circle className="core" cx={p.x} cy={p.y} r={5} />
                    <text x={p.x} y={p.y + 34} textAnchor="middle">{course.short}</text>
                    <text className="sub" x={p.x} y={p.y + 50} textAnchor="middle">
                      {counts[i] ? `${counts[i]}/${course.lessons.length} done` : `${course.lessons.length} lessons`}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="panel panel-enter" key={c.slug} aria-live="polite">
          <span className="eyebrow">Stage {c.stageIndex + 1} · {c.stageTitle}</span>
          <h3 style={{ fontSize: '1.5rem' }}>{c.title}</h3>
          <p className="muted" style={{ fontSize: '.95rem' }}>{c.blurb}</p>
          <div className="row">
            <span className="pill">{c.lessons.length} lessons</span>
            <span className="pill">{c.level}</span>
            <span className="pill">{doneHere}/{c.lessons.length} done</span>
          </div>
          <div className="progress"><b style={{ width: `${Math.round((doneHere / c.lessons.length) * 100)}%` }} /></div>
          <ol className="stops">
            {c.lessons.map((l, j) => {
              const isDone = Boolean(done[`${c.slug}/${l.slug}`]);
              const isNow = !isDone && l.slug === nextLesson.slug;
              return (
                <li key={l.slug} className={isDone ? 'done' : isNow ? 'now' : ''}>
                  <Link href={`/courses/${c.slug}/${l.slug}`}>
                    <span className="dot">{isDone ? '✓' : j + 1}</span>
                    <span>
                      <div className="t">{l.title}</div>
                      <div className="s">{l.summary}</div>
                    </span>
                    <span className="m">{l.minutes}m</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="row">
            <Link className="btn primary small" href={`/courses/${c.slug}/${nextLesson.slug}`}>
              {doneHere === 0 ? 'Start course' : doneHere === c.lessons.length ? 'Review course' : 'Continue'} →
            </Link>
            <Link className="btn small" href={`/courses/${c.slug}`}>Course overview</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
