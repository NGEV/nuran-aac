import test from 'node:test';
import assert from 'node:assert/strict';

const basic = { name: 'Basic English', lang: 'en-US', localService: true, default: true, voiceURI: 'voice-basic' };
const enhanced = { name: 'Ava Enhanced', lang: 'en-US', localService: true, default: false, voiceURI: 'voice-enhanced' };
const remote = { name: 'Remote Natural', lang: 'en-US', localService: false, default: false, voiceURI: 'voice-remote' };
const somali = { name: 'Somali Local', lang: 'so-SO', localService: true, default: false, voiceURI: 'voice-so' };
const spoken = [];

globalThis.window = globalThis;
globalThis.DB = { logError() {} };
globalThis.SpeechSynthesisUtterance = class {
  constructor(text) { this.text = text; }
};
globalThis.speechSynthesis = {
  getVoices: () => [basic, enhanced, remote, somali],
  addEventListener() {},
  cancel() {},
  speak(utterance) { spoken.push(utterance); },
};
globalThis.window.speechSynthesis = globalThis.speechSynthesis;
globalThis.NuranVoice = { pitch: 1, voiceURI: 'auto' };
await import('../speech.js');

test('automatic voice mode ranks an installed enhanced voice first', () => {
  assert.equal(Speech.bestVoice('en-US').voiceURI, 'voice-enhanced');
  assert.deepEqual(Speech.availableVoices('en-US').map(voice => voice.voiceURI), ['voice-enhanced', 'voice-basic']);
});

test('a caregiver-selected installed voice is used for synthesis', async () => {
  await Speech.speakItem({ label: 'hello' }, { soundOn: true, rate: 0.55, voiceURI: 'voice-basic' });
  const utterance = spoken.at(-1);
  assert.equal(utterance.voice.voiceURI, 'voice-basic');
  assert.equal(utterance.lang, 'en-US');
});

test('language speech uses a matching installed voice instead of the English preference', async () => {
  await Speech.speakItem({ label: 'salaan', lang: 'so' }, { soundOn: true, voiceURI: 'voice-basic' });
  assert.equal(spoken.at(-1).voice.voiceURI, 'voice-so');
});

test('the displayed pronoun I sends pronunciation text to device speech', async () => {
  await Speech.speakItem(
    { label: 'I', symbolKey: 'i', speakAs: 'eye' },
    { soundOn: true, voiceURI: 'voice-basic' }
  );
  assert.equal(spoken.at(-1).text, 'eye');
});

test('a caregiver recording still takes priority over the I synthesis override', async () => {
  const before = spoken.length;
  const originalPlayBlob = Speech.playBlob;
  let played = 0;
  Speech.playBlob = async () => { played += 1; return true; };
  try {
    assert.equal(await Speech.speakItem(
      { label: 'I', symbolKey: 'i', speakAs: 'eye', audioBlob: new Blob(['family voice']) },
      { soundOn: true, voiceURI: 'voice-basic' }
    ), true);
  } finally {
    Speech.playBlob = originalPlayBlob;
  }
  assert.equal(played, 1);
  assert.equal(spoken.length, before);
});
