import Link from 'next/link';
import Roadmap, { type RoadmapCourse } from '@/components/Roadmap';
import { ContinueButton, CourseBadge } from '@/components/Progress';
import { getCourse, getStages } from '@/lib/db';

const SWATCHES = ['--accent', '--sky', '--gold', '--signal', '--plum'];

export default function Home() {
  const stages = getStages();
  const courses = stages.flatMap((s, si) =>
    s.courses.map((summary) => {
      const full = getCourse(summary.slug)!;
      return { ...full, stageTitle: s.title, stageIndex: si };
    }),
  );
  const roadmap: RoadmapCourse[] = courses.map((c) => ({
    slug: c.slug, title: c.title, short: c.short, level: c.level, blurb: c.blurb,
    stageTitle: c.stageTitle, stageIndex: c.stageIndex,
    lessons: c.lessons.map((l) => ({ slug: l.slug, title: l.title, summary: l.summary, minutes: l.minutes })),
  }));
  const path = courses.flatMap((c) => c.lessons.map((l) => ({ course: c.slug, lesson: l.slug })));
  const lessonCount = path.length;
  const resourceCount = courses.reduce((n, c) => n + c.lessons.reduce((m, l) => m + l.resources.length, 0), 0);
  const hours = Math.round(courses.reduce((n, c) => n + c.minutes, 0) / 60);

  return (
    <div className="wrap">
      <section className="hero">
        <span className="eyebrow">Free · no sign-up · runs in your browser</span>
        <h1>
          Learn AI one <span className="hl">station</span> at a time.
        </h1>
        <p className="lede">
          Follow one roadmap from &ldquo;what is AI?&rdquo; to building RAG apps and agents. Every lesson explains the idea in plain words, links the
          best free resource for it, and gives you code to run right here.
        </p>
        <div className="row">
          <ContinueButton path={path} />
          <Link className="btn" href="#courses">Browse courses</Link>
        </div>
        <div className="stats">
          <div><b>{courses.length}</b><span>courses</span></div>
          <div><b>{lessonCount}</b><span>lessons</span></div>
          <div><b>{resourceCount}</b><span>free resources</span></div>
          <div><b>~{hours} h</b><span>of lessons</span></div>
        </div>
      </section>

      <section className="block" id="roadmap">
        <header>
          <span className="eyebrow">The roadmap</span>
          <h2>Pick a station, start a lesson</h2>
          <p className="muted">Courses are ordered from first steps to shipping real AI apps. Click any station to see its lessons. Your current course pulses.</p>
        </header>
        <Roadmap courses={roadmap} />
      </section>

      <section className="block">
        <div className="how">
          <div><span className="n">01</span><h3>Read the idea</h3><p>Each lesson starts with a short, plain-English explanation and the key ideas to remember.</p></div>
          <div><span className="n">02</span><h3>Learn from the best</h3><p>We picked one or two free resources per lesson: official docs, top videos and interactive explainers.</p></div>
          <div><span className="n">03</span><h3>Run the code</h3><p>Edit and run Python or JavaScript in your browser. Nothing to install, nothing leaves your device.</p></div>
          <div><span className="n">04</span><h3>Check yourself</h3><p>Two quick questions, then mark the lesson done and watch your roadmap fill in.</p></div>
        </div>
      </section>

      <section className="block" id="courses">
        <header>
          <span className="eyebrow">All courses</span>
          <h2>Choose what you want to learn</h2>
          <p className="muted">Jump into any course. Each one stands on its own, and the roadmap order is just a suggestion.</p>
        </header>
        {stages.map((s, si) => (
          <div className="stage-group" key={s.slug}>
            <h3>Stage {si + 1} · {s.title}</h3>
            <div className="cards">
              {s.courses.map((c) => {
                const full = courses.find((x) => x.slug === c.slug)!;
                return (
                  <Link className="card" href={`/courses/${c.slug}`} key={c.slug} style={{ ['--c' as string]: `var(${SWATCHES[(c.position - 1) % SWATCHES.length]})` }}>
                    <div className="head"><span className="sw" /><span className="name">{c.title}</span></div>
                    <span className="blurb">{c.blurb}</span>
                    <div className="meta">
                      <span className="pill">{c.level}</span>
                      <span className="pill">{c.lessonCount} lessons</span>
                      <span className="pill">~{Math.max(1, Math.round(c.minutes / 60))} h</span>
                      <CourseBadge course={c.slug} lessons={full.lessons.map((l) => l.slug)} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
