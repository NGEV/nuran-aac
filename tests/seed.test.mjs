import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;

const stores = new Map();
const store = (name) => {
  if (!stores.has(name)) stores.set(name, new Map());
  return stores.get(name);
};

globalThis.DB = {
  async get(name, id) { return store(name).get(id); },
  async put(name, value) { store(name).set(value.id ?? value.key, structuredClone(value)); },
  async all(name) { return [...store(name).values()].map(value => structuredClone(value)); },
  async updateMirror() {},
};

await import('../core/settings.js');
await import('../seed.js');

const UNIVERSAL_36 = [
  'all', 'can', 'different', 'do', 'finished', 'get', 'go', 'good', 'he', 'help', 'here', 'I',
  'in', 'it', 'like', 'look', 'make', 'more', 'not', 'on', 'open', 'put', 'same', 'she', 'some',
  'stop', 'that', 'turn', 'up', 'want', 'what', 'when', 'where', 'who', 'why', 'you',
];

const SENTENCE_CONTRACT = [
  'is', 'am', 'are', 'a', 'the', 'and', 'but', 'because',
  'me', 'we', 'they', 'my', 'your', 'this', 'have', 'need',
  'see', 'feel', 'know', 'say', 'to', 'with', 'for', 'out',
  'off', 'down', 'there', 'how', 'again', 'now', 'later', 'wait',
  'bad', 'big', 'little', 'or',
];

function clearStores() {
  stores.clear();
}

test('fresh starter data preserves Project Core 36 and includes the sentence contract', async () => {
  clearStores();
  assert.equal(await Seed.seedIfEmpty(), true);

  assert.deepEqual([...Seed.UNIVERSAL_CORE_WORDS].sort(), [...UNIVERSAL_36].sort());
  assert.deepEqual([...Seed.SENTENCE_WORDS], SENTENCE_CONTRACT);

  const words = await DB.all('vocabulary');
  const coreLabels = words.filter(w => w.categoryId === 'cat-core').map(w => w.label);
  const sentenceWords = words
    .filter(w => w.categoryId === 'cat-sentence')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const label of UNIVERSAL_36) assert.ok(coreLabels.includes(label), `missing Project Core word: ${label}`);
  assert.deepEqual(sentenceWords.map(w => w.label), SENTENCE_CONTRACT);
  assert.equal(sentenceWords[0].id, 'core-is');
  assert.equal(sentenceWords[0].core, true);
  const iWord = await DB.get('vocabulary', 'core-i');
  assert.equal(iWord.label, 'I');
  assert.equal(iWord.speakAs, 'eye');
});

test('existing installs gain missing sentence words without reviving deliberate deletions', async () => {
  clearStores();
  const now = Date.now();
  await DB.put('categories', { id: 'cat-core', name: 'Core Words', sortOrder: 0, deleted: false });
  await DB.put('vocabulary', {
    id: 'core-is', label: 'is', categoryId: 'cat-sentence', core: true,
    sortOrder: 0, deleted: true, createdAt: now, updatedAt: now,
  });

  await Seed.ensureEssentials();
  await Seed.ensureEssentials();

  const sentenceCategory = await DB.get('categories', 'cat-sentence');
  const sentenceWords = (await DB.all('vocabulary')).filter(w => w.categoryId === 'cat-sentence');
  assert.equal(sentenceCategory.name, 'Sentence Words');
  assert.equal((await DB.get('vocabulary', 'core-is')).deleted, true);
  assert.equal(sentenceWords.length, SENTENCE_CONTRACT.length);
  assert.ok(await DB.get('vocabulary', 'core-am'));
  assert.ok(await DB.get('vocabulary', 'core-are'));
  assert.ok(await DB.get('vocabulary', 'core-the'));
  assert.ok(await DB.get('vocabulary', 'core-and'));
});

test('existing installs replace the ineffective lowercase I pronunciation without overwriting a custom one', async () => {
  clearStores();
  const now = Date.now();
  await DB.put('vocabulary', {
    id: 'core-i', label: 'I', symbolKey: 'i', speakAs: 'i',
    categoryId: 'cat-core', core: true, sortOrder: 3,
    deleted: false, createdAt: now, updatedAt: now,
  });

  await Seed.ensureEssentials();
  assert.equal((await DB.get('vocabulary', 'core-i')).speakAs, 'eye');

  const customized = await DB.get('vocabulary', 'core-i');
  customized.speakAs = 'I pronoun';
  await DB.put('vocabulary', customized);
  await Seed.ensureEssentials();
  assert.equal((await DB.get('vocabulary', 'core-i')).speakAs, 'I pronoun');
});
