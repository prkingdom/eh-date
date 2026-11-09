import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('critical routes exist', () => {
  for (const route of ['onboarding','discover','profile','likes','matches','matches/[id]','messages']) {
    assert.ok(existsSync(new URL('../app/' + route + '/page.tsx', import.meta.url)), route);
  }
});

test('matches card keeps compact top-left avatar and horizontal identity', () => {
  const matches = read('app/matches/page.tsx');
  assert.match(matches, /className="eh-match-card"/);
  assert.match(matches, /borderRadius:"50%"/);
  assert.match(matches, /match\.display_name\}, \{match\.age\}/);
  assert.doesNotMatch(matches, /eh-match-gallery|eh-match-carousel/);
});

test('full matched profile keeps photo gallery before profile details', () => {
  const profile = read('app/matches/[id]/page.tsx');
  const gallery = profile.indexOf('className="eh-full-gallery"');
  const details = profile.indexOf('className="eh-full-details"');
  assert.ok(gallery !== -1 && details > gallery, 'gallery must precede details');
  assert.match(profile, /my_matched_member_profile/);
});

test('critical pages use authenticated Supabase user checks', () => {
  for (const route of ['discover','profile','matches','messages','likes']) {
    assert.match(read('app/' + route + '/page.tsx'), /auth\.getUser\(/, route);
  }
});

test('account deletion and safety actions remain wired', () => {
  assert.match(read('app/profile/page.tsx'), /delete-my-account/);
  const safety = read('app/components/SafetyActions.tsx');
  assert.match(safety, /report/i);
  assert.match(safety, /block/i);
});
