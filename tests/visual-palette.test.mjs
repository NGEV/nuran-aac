import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255);
  const linear = channels.map(value => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrast(a, b) {
  const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (bright + 0.05) / (dark + 0.05);
}

test('every muted category background exceeds WCAG AA contrast with label ink', async () => {
  const css = await readFile('visual-system.css', 'utf8');
  const expected = {
    people: '#f0e6c6',
    action: '#d7e7d9',
    describe: '#d6e4ef',
    thing: '#ecdac9',
    social: '#ecd7de',
    question: '#dcd6ec',
    place: '#d0e3df',
    neutral: '#e6e2ed',
  };
  for (const [token, background] of Object.entries(expected)) {
    assert.match(css, new RegExp(`--cat-${token}-bg:\\s*${background}`, 'i'));
    assert.ok(contrast('#1b2540', background) >= 4.5, `${token} contrast fell below 4.5:1`);
  }
});
