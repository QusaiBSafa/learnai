// Seeds data/learnai.db from content/stages.json and content/courses/*.json.
// Usage: node scripts/seed.mjs          validate, then rebuild the database
//        node scripts/seed.mjs --check  validate only
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = process.env.LEARNAI_CONTENT_DIR || join(root, 'content');
const dbPath = join(root, 'data', 'learnai.db');
const checkOnly = process.argv.includes('--check');

const RESOURCE_TYPES = new Set(['video', 'article', 'docs', 'interactive', 'course']);
const CODE_LANGS = new Set(['python', 'javascript']);
const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

const stages = JSON.parse(readFileSync(join(contentDir, 'stages.json'), 'utf8'));
const stageSlugs = new Set(stages.map((s) => s.slug));
const courses = readdirSync(join(contentDir, 'courses'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ file: f, ...JSON.parse(readFileSync(join(contentDir, 'courses', f), 'utf8')) }))
  .sort((a, b) => a.order - b.order);

const courseSlugs = new Set();
for (const c of courses) {
  const at = c.file;
  for (const k of ['slug', 'title', 'short', 'level', 'blurb', 'stage']) if (!isStr(c[k])) fail(at, `missing ${k}`);
  if (courseSlugs.has(c.slug)) fail(at, `duplicate course slug ${c.slug}`);
  courseSlugs.add(c.slug);
  if (!stageSlugs.has(c.stage)) fail(at, `unknown stage ${c.stage}`);
  if (!Array.isArray(c.lessons) || c.lessons.length === 0) fail(at, 'no lessons');
  const lessonSlugs = new Set();
  (c.lessons || []).forEach((l, i) => {
    const lat = `${at} lesson ${i + 1}`;
    for (const k of ['slug', 'title', 'summary']) if (!isStr(l[k])) fail(lat, `missing ${k}`);
    if (lessonSlugs.has(l.slug)) fail(lat, `duplicate lesson slug ${l.slug}`);
    lessonSlugs.add(l.slug);
    if (!Number.isInteger(l.minutes) || l.minutes <= 0) fail(lat, 'minutes must be a positive integer');
    if (!Array.isArray(l.body) || l.body.length === 0 || !l.body.every(isStr)) fail(lat, 'body must be a list of paragraphs');
    if (!Array.isArray(l.keyIdeas) || !l.keyIdeas.every(isStr)) fail(lat, 'keyIdeas must be a list of strings');
    if (!Array.isArray(l.quiz)) fail(lat, 'quiz must be a list');
    (l.quiz || []).forEach((q, qi) => {
      if (!isStr(q.q) || !Array.isArray(q.options) || q.options.length < 2) fail(lat, `quiz ${qi + 1} is malformed`);
      else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) fail(lat, `quiz ${qi + 1} answer out of range`);
    });
    if (l.code != null) {
      if (!CODE_LANGS.has(l.code.lang)) fail(lat, `code.lang must be python or javascript`);
      if (!isStr(l.code.source)) fail(lat, 'code.source is empty');
      if (typeof l.code.runnable !== 'boolean') fail(lat, 'code.runnable must be true or false');
    }
    if (!Array.isArray(l.resources) || l.resources.length === 0) fail(lat, 'no resources');
    (l.resources || []).forEach((r, ri) => {
      const rat = `${lat} resource ${ri + 1}`;
      if (!isStr(r.title)) fail(rat, 'missing title');
      if (!/^https:\/\//.test(r.url || '')) fail(rat, 'url must start with https://');
      if (!RESOURCE_TYPES.has(r.type)) fail(rat, `unknown type ${r.type}`);
    });
  });
}

if (errors.length) {
  console.error(`Content has ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
const lessonCount = courses.reduce((n, c) => n + c.lessons.length, 0);
console.log(`Content OK: ${stages.length} stages, ${courses.length} courses, ${lessonCount} lessons.`);
if (checkOnly) process.exit(0);

mkdirSync(dirname(dbPath), { recursive: true });
if (existsSync(dbPath)) rmSync(dbPath);
const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE stages (slug TEXT PRIMARY KEY, title TEXT NOT NULL, position INTEGER NOT NULL);
  CREATE TABLE courses (
    slug TEXT PRIMARY KEY, stage_slug TEXT NOT NULL REFERENCES stages(slug),
    title TEXT NOT NULL, short TEXT NOT NULL, level TEXT NOT NULL, blurb TEXT NOT NULL, position INTEGER NOT NULL);
  CREATE TABLE lessons (
    id INTEGER PRIMARY KEY, course_slug TEXT NOT NULL REFERENCES courses(slug), slug TEXT NOT NULL,
    title TEXT NOT NULL, summary TEXT NOT NULL, minutes INTEGER NOT NULL, position INTEGER NOT NULL,
    body TEXT NOT NULL, key_ideas TEXT NOT NULL, quiz TEXT NOT NULL, code TEXT,
    UNIQUE (course_slug, slug));
  CREATE TABLE resources (
    id INTEGER PRIMARY KEY, lesson_id INTEGER NOT NULL REFERENCES lessons(id),
    title TEXT NOT NULL, url TEXT NOT NULL, type TEXT NOT NULL, minutes INTEGER, position INTEGER NOT NULL);
`);

const insStage = db.prepare('INSERT INTO stages VALUES (?, ?, ?)');
const insCourse = db.prepare('INSERT INTO courses VALUES (?, ?, ?, ?, ?, ?, ?)');
const insLesson = db.prepare(
  'INSERT INTO lessons (course_slug, slug, title, summary, minutes, position, body, key_ideas, quiz, code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
);
const insRes = db.prepare('INSERT INTO resources (lesson_id, title, url, type, minutes, position) VALUES (?, ?, ?, ?, ?, ?)');

db.exec('BEGIN');
stages.forEach((s) => insStage.run(s.slug, s.title, s.order));
courses.forEach((c, ci) => {
  insCourse.run(c.slug, c.stage, c.title, c.short, c.level, c.blurb, ci + 1);
  c.lessons.forEach((l, li) => {
    const { lastInsertRowid } = insLesson.run(
      c.slug, l.slug, l.title, l.summary, l.minutes, li + 1,
      JSON.stringify(l.body), JSON.stringify(l.keyIdeas), JSON.stringify(l.quiz), l.code ? JSON.stringify(l.code) : null,
    );
    l.resources.forEach((r, ri) => insRes.run(lastInsertRowid, r.title, r.url, r.type, r.minutes ?? null, ri + 1));
  });
});
db.exec('COMMIT');
db.close();
console.log(`Seeded ${dbPath}`);
