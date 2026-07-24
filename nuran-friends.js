/* Nuran AAC — Nuran Friends, the complete child-facing vocabulary art set.
   Every seeded word resolves to an original, code-native storybook SVG.  The
   generator is intentionally deterministic: it gives 120 stable semantic
   assets without a network, API key, or a mixed visual fallback. */

(function (root) {
  'use strict';

  const INK = '#39485a';
  const SKIN = '#8a552f';
  const SKIN_LIGHT = '#b87548';
  const HAIR = '#30251f';
  const CREAM = '#fff4e6';
  const COLORS = Object.freeze({ coral: '#ef8c7f', sun: '#ffd873', teal: '#4db7b0', sky: '#8bc8e8', leaf: '#72b883', violet: '#a799d0', berry: '#d98aa5', sand: '#edc996' });
  const stroke = `stroke="${INK}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"`;
  const fillStroke = (fill) => `fill="${fill}" ${stroke}`;
  const svg = (key, inner) => `<svg class="nuran-friends-art" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" data-nuran-friend="${key}">${inner}</svg>`;
  const background = (accent = COLORS.sun) => `<rect width="128" height="128" rx="22" fill="${CREAM}"/><circle cx="106" cy="24" r="20" fill="${accent}" opacity=".3"/><path d="M 0 100 Q 30 88 57 104 T 128 100 V 128 H 0 Z" fill="#e7f2df"/>`;

  const HUMAN = Object.freeze([
    'yes', 'no', 'hello', 'i', 'you', 'he', 'she', 'want', 'like', 'get', 'make', 'go', 'stop', 'do', 'put', 'turn', 'help', 'open', 'look', 'can', 'finished', 'not',
    'me', 'we', 'they', 'my', 'your', 'have', 'need', 'see', 'feel', 'know', 'say', 'wait',
    'hurt', 'tired', 'hungry', 'thirsty', 'sick', 'sleep', 'happy', 'sad', 'mad', 'scared', 'calm', 'silly',
    'eat', 'drink', 'play', 'wash', 'hug', 'sit', 'come', 'give',
  ]);
  const OBJECT = Object.freeze([
    'it', 'that', 'more', 'good', 'a', 'the', 'water', 'milk', 'juice', 'cookie', 'apple', 'banana', 'bread', 'snack', 'bathroom',
    'home', 'school', 'park', 'outside', 'car', 'store', 'ball', 'bubbles', 'book', 'music', 'blocks', 'swing', 'tv', 'tablet',
  ]);
  const RELATION = Object.freeze([
    'all', 'some', 'same', 'different', 'in', 'on', 'up', 'here', 'is', 'am', 'are', 'and', 'but', 'because', 'this', 'to', 'with', 'for', 'out', 'off', 'down', 'there', 'again', 'now', 'later', 'bad', 'big', 'little', 'or', 'hot', 'cold',
  ]);
  const QUESTION = Object.freeze(['what', 'when', 'where', 'who', 'why', 'how']);
  const FRIEND_KEYS = Object.freeze([...HUMAN, ...OBJECT, ...RELATION, ...QUESTION]);
  const FRIEND_SET = new Set(FRIEND_KEYS);
  const ALIASES = Object.freeze({
    _talk: 'hello', _people: 'hug', _learn: 'school', _help: 'help', _piano: 'music', _body: 'calm', _star: 'good', _paint: 'play',
    cele_star: 'good', cele_rainbow: 'good', cele_balloons: 'bubbles', cele_check: 'finished',
  });

  function person(x, y, options) {
    const o = options || {};
    const scale = o.scale || 1;
    const skin = o.skin || SKIN;
    const shirt = o.shirt || COLORS.coral;
    const pants = o.pants || COLORS.teal;
    const expression = o.expression || 'smile';
    const arm = o.arm || 'down';
    const hair = o.hair === 'wrap'
      ? `<path d="M ${x - 18} ${y - 29} Q ${x} ${y - 48} ${x + 18} ${y - 29} L ${x + 14} ${y - 9} Q ${x} ${y - 4} ${x - 14} ${y - 9} Z" ${fillStroke(COLORS.violet)}/>`
      : `<path d="M ${x - 17} ${y - 23} Q ${x} ${y - 44} ${x + 17} ${y - 23} L ${x + 14} ${y - 12} Q ${x} ${y - 22} ${x - 14} ${y - 12} Z" ${fillStroke(HAIR)}/>`;
    const mouth = expression === 'sad' ? `<path d="M ${x - 5} ${y - 7} Q ${x} ${y - 12} ${x + 5} ${y - 7}" ${stroke} fill="none"/>`
      : expression === 'mad' ? `<path d="M ${x - 5} ${y - 6} L ${x + 5} ${y - 6}" ${stroke} fill="none"/><path d="M ${x - 11} ${y - 19} L ${x - 4} ${y - 16} M ${x + 11} ${y - 19} L ${x + 4} ${y - 16}" ${stroke} fill="none"/>`
      : expression === 'scared' ? `<ellipse cx="${x}" cy="${y - 7}" rx="4" ry="6" fill="#fff" ${stroke}/>`
      : expression === 'sleep' ? `<path d="M ${x - 10} ${y - 17} Q ${x - 6} ${y - 13} ${x - 2} ${y - 17} M ${x + 2} ${y - 17} Q ${x + 6} ${y - 13} ${x + 10} ${y - 17}" ${stroke} fill="none"/>`
      : expression === 'silly' ? `<path d="M ${x - 5} ${y - 6} Q ${x} ${y + 2} ${x + 5} ${y - 6}" ${stroke} fill="none"/><circle cx="${x + 11}" cy="${y - 16}" r="2.2" fill="${INK}"/>`
      : `<path d="M ${x - 7} ${y - 8} Q ${x} ${y - 1} ${x + 7} ${y - 8}" ${stroke} fill="none"/>`;
    const eyes = expression === 'sleep' ? '' : `<ellipse cx="${x - 7}" cy="${y - 17}" rx="2.4" ry="3" fill="#fff" ${stroke}/><ellipse cx="${x + 7}" cy="${y - 17}" rx="2.4" ry="3" fill="#fff" ${stroke}/><circle cx="${x - 7}" cy="${y - 17}" r="1.1" fill="${INK}"/><circle cx="${x + 7}" cy="${y - 17}" r="1.1" fill="${INK}"/>`;
    const raised = arm === 'up';
    const armPaths = raised
      ? `<path d="M ${x - 13} ${y + 9} Q ${x - 26} ${y - 4} ${x - 25} ${y - 22} Q ${x - 25} ${y - 28} ${x - 20} ${y - 28} Q ${x - 15} ${y - 11} ${x - 6} ${y + 6} Z" ${fillStroke(shirt)}/><circle cx="${x - 22}" cy="${y - 30}" r="5.4" ${fillStroke(skin)}/><path d="M ${x + 13} ${y + 9} Q ${x + 25} ${y + 17} ${x + 22} ${y + 30} Q ${x + 18} ${y + 34} ${x + 13} ${y + 29} Z" ${fillStroke(shirt)}/><circle cx="${x + 20}" cy="${y + 32}" r="5.4" ${fillStroke(skin)}/>`
      : `<path d="M ${x - 13} ${y + 9} Q ${x - 28} ${y + 21} ${x - 23} ${y + 37} Q ${x - 18} ${y + 41} ${x - 12} ${y + 30} Z" ${fillStroke(shirt)}/><circle cx="${x - 21}" cy="${y + 39}" r="5.4" ${fillStroke(skin)}/><path d="M ${x + 13} ${y + 9} Q ${x + 28} ${y + 21} ${x + 23} ${y + 37} Q ${x + 18} ${y + 41} ${x + 12} ${y + 30} Z" ${fillStroke(shirt)}/><circle cx="${x + 21}" cy="${y + 39}" r="5.4" ${fillStroke(skin)}/>`;
    return `<g transform="translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})" id="friend-person-${o.id || 'child'}">
      <path d="M ${x - 13} ${y + 26} L ${x - 16} ${y + 49} L ${x - 4} ${y + 49} L ${x} ${y + 32} L ${x + 4} ${y + 49} L ${x + 16} ${y + 49} L ${x + 13} ${y + 26} Z" ${fillStroke(pants)}/>
      <rect x="${x - 16}" y="${y + 2}" width="32" height="31" rx="13" ${fillStroke(shirt)}/>
      ${armPaths}<circle cx="${x}" cy="${y - 17}" r="20" ${fillStroke(skin)}/>${hair}${eyes}${mouth}
      <circle cx="${x - 14}" cy="${y - 5}" r="3" fill="#e88f83" opacity=".5"/><circle cx="${x + 14}" cy="${y - 5}" r="3" fill="#e88f83" opacity=".5"/>
    </g>`;
  }

  const ball = (x, y, r, color = COLORS.coral) => `<circle cx="${x}" cy="${y}" r="${r}" ${fillStroke(color)}/><path d="M ${x - r + 4} ${y - 4} Q ${x} ${y} ${x + r - 4} ${y - 4} M ${x - r + 4} ${y + 5} Q ${x} ${y} ${x + r - 4} ${y + 5}" ${stroke} fill="none"/>`;
  const basket = (x, y) => `<path d="M ${x - 22} ${y - 7} Q ${x} ${y - 22} ${x + 22} ${y - 7} L ${x + 16} ${y + 20} Q ${x} ${y + 28} ${x - 16} ${y + 20} Z" ${fillStroke(COLORS.sand)}/><path d="M ${x - 17} ${y + 1} L ${x + 17} ${y + 1}" ${stroke} fill="none"/>`;
  const cup = (x, y, fill = COLORS.sky) => `<path d="M ${x - 14} ${y - 20} H ${x + 14} L ${x + 10} ${y + 25} H ${x - 10} Z" ${fillStroke(fill)}/><path d="M ${x + 14} ${y - 9} Q ${x + 28} ${y - 5} ${x + 16} ${y + 9}" ${stroke} fill="none"/>`;
  const box = (x, y, fill = COLORS.teal) => `<rect x="${x - 22}" y="${y - 15}" width="44" height="32" rx="7" ${fillStroke(fill)}/><path d="M ${x - 22} ${y - 15} L ${x} ${y - 28} L ${x + 22} ${y - 15}" ${fillStroke(fill)}/>`;
  const food = (key, x, y) => {
    if (key === 'apple') return `<path d="M ${x} ${y - 12} C ${x - 27} ${y - 32} ${x - 32} ${y + 20} ${x} ${y + 28} C ${x + 32} ${y + 20} ${x + 27} ${y - 32} ${x} ${y - 12} Z" ${fillStroke(COLORS.coral)}/><path d="M ${x} ${y - 13} Q ${x + 7} ${y - 31} ${x + 20} ${y - 27}" ${stroke} fill="none"/>`;
    if (key === 'banana') return `<path d="M ${x - 28} ${y - 15} Q ${x - 12} ${y + 35} ${x + 30} ${y + 12} Q ${x + 10} ${y + 38} ${x - 23} ${y + 10} Z" ${fillStroke(COLORS.sun)}/>`;
    if (key === 'cookie') return `<circle cx="${x}" cy="${y}" r="26" ${fillStroke(COLORS.sand)}/><circle cx="${x - 9}" cy="${y - 7}" r="3" fill="${INK}"/><circle cx="${x + 10}" cy="${y - 3}" r="3" fill="${INK}"/><circle cx="${x - 2}" cy="${y + 12}" r="3" fill="${INK}"/>`;
    if (key === 'bread') return `<path d="M ${x - 29} ${y + 22} V ${y - 5} Q ${x - 25} ${y - 30} ${x} ${y - 20} Q ${x + 25} ${y - 30} ${x + 29} ${y - 5} V ${y + 22} Z" ${fillStroke(COLORS.sand)}/><path d="M ${x - 14} ${y - 10} Q ${x - 8} ${y - 3} ${x - 2} ${y - 10} M ${x + 5} ${y - 10} Q ${x + 11} ${y - 3} ${x + 17} ${y - 10}" ${stroke} fill="none"/>`;
    return `<path d="M ${x - 24} ${y - 18} H ${x + 24} L ${x + 18} ${y + 26} H ${x - 18} Z" ${fillStroke(key === 'milk' ? '#fffdf8' : key === 'juice' ? COLORS.coral : COLORS.sky)}/><path d="M ${x - 15} ${y + 3} Q ${x} ${y - 2} ${x + 15} ${y + 3}" ${stroke} fill="none"/>`;
  };

  function objectPortrait(key) {
    let object = '';
    if (['water', 'milk', 'juice'].includes(key)) object = food(key, 64, 67);
    else if (['cookie', 'apple', 'banana', 'bread'].includes(key)) object = food(key, 64, 65);
    else if (key === 'snack') object = `<ellipse cx="64" cy="78" rx="42" ry="12" fill="#fff" ${stroke}/>${food('cookie', 48, 64)}${food('apple', 78, 64)}`;
    else if (key === 'bathroom') object = `<rect x="18" y="26" width="92" height="72" rx="12" ${fillStroke('#e9f5f4')}/><path d="M 31 57 H 62 V 82 H 38 Q 31 76 31 57 Z" ${fillStroke('#fff')}/><path d="M 78 46 H 102 V 62 H 78 Z" ${fillStroke(COLORS.sky)}/><path d="M 82 62 V 87 H 100" ${stroke} fill="none"/>`;
    else if (key === 'home') object = `<path d="M 18 61 L 64 23 L 110 61 V 103 H 18 Z" ${fillStroke(COLORS.sand)}/><rect x="54" y="73" width="20" height="30" rx="5" ${fillStroke(COLORS.coral)}/><rect x="28" y="68" width="17" height="17" rx="4" ${fillStroke(COLORS.sky)}/>`;
    else if (key === 'school') object = `<path d="M 16 54 L 64 25 L 112 54 V 101 H 16 Z" ${fillStroke(COLORS.sun)}/><rect x="54" y="72" width="20" height="29" rx="5" ${fillStroke(COLORS.coral)}/><path d="M 64 25 V 12 H 82" ${stroke} fill="none"/><path d="M 82 12 V 25" ${stroke} fill="none"/>`;
    else if (key === 'park') object = `<path d="M 8 99 H 120" ${stroke} fill="none"/><path d="M 38 93 V 48 M 20 68 H 56" ${stroke} fill="none"/><circle cx="38" cy="34" r="24" ${fillStroke(COLORS.leaf)}/><path d="M 78 92 V 57 H 106 V 92" ${stroke} fill="none"/><path d="M 82 56 Q 92 81 102 56" ${stroke} fill="none"/>`;
    else if (key === 'outside') object = `<rect x="17" y="25" width="44" height="78" rx="8" ${fillStroke(COLORS.sand)}/><path d="M 49 42 L 99 22 V 103 H 49 Z" ${fillStroke(COLORS.sky)}/><circle cx="82" cy="41" r="12" fill="${COLORS.sun}"/><path d="M 51 85 Q 77 68 99 85 V 103 H 51 Z" fill="#d7ecb4"/>`;
    else if (key === 'car') object = `<path d="M 20 79 L 28 55 Q 32 47 44 47 H 82 Q 92 47 98 62 L 108 79 V 94 H 20 Z" ${fillStroke(COLORS.teal)}/><circle cx="42" cy="94" r="10" ${fillStroke('#fff')}/><circle cx="86" cy="94" r="10" ${fillStroke('#fff')}/><path d="M 37 55 L 50 55 V 71 H 29 Z M 56 55 H 78 L 89 71 H 56 Z" fill="#dff2f6" ${stroke}/>`;
    else if (key === 'store') object = `<rect x="19" y="52" width="90" height="51" rx="6" ${fillStroke('#fff')}/><path d="M 13 52 L 23 27 H 105 L 115 52 Z" ${fillStroke(COLORS.coral)}/><path d="M 24 52 V 40 H 38 V 52 M 52 52 V 40 H 66 V 52 M 80 52 V 40 H 94 V 52" ${stroke} fill="none"/><rect x="57" y="74" width="17" height="29" rx="4" ${fillStroke(COLORS.teal)}/>`;
    else if (key === 'ball') object = ball(64, 67, 34, COLORS.coral);
    else if (key === 'bubbles') object = `<circle cx="44" cy="72" r="25" fill="${COLORS.sky}" opacity=".55" ${stroke}/><circle cx="78" cy="48" r="17" fill="${COLORS.violet}" opacity=".5" ${stroke}/><circle cx="86" cy="81" r="11" fill="${COLORS.teal}" opacity=".5" ${stroke}/><path d="M 21 24 L 33 32" ${stroke} fill="none"/>`;
    else if (key === 'book') object = `<path d="M 64 37 Q 42 24 19 37 V 93 Q 42 80 64 94 Q 86 80 109 93 V 37 Q 86 24 64 37 Z" ${fillStroke(COLORS.violet)}/><path d="M 64 37 V 94" ${stroke} fill="none"/><path d="M 30 51 H 52 M 76 51 H 98" ${stroke} fill="none"/>`;
    else if (key === 'music') object = `<circle cx="43" cy="88" r="10" ${fillStroke(COLORS.violet)}/><circle cx="85" cy="76" r="10" ${fillStroke(COLORS.violet)}/><path d="M 53 88 V 34 L 96 22 V 76 M 53 46 L 96 34" ${stroke} fill="none"/>`;
    else if (key === 'blocks') object = `<rect x="25" y="72" width="30" height="29" rx="5" ${fillStroke(COLORS.coral)}/><rect x="57" y="72" width="30" height="29" rx="5" ${fillStroke(COLORS.teal)}/><rect x="41" y="42" width="30" height="29" rx="5" ${fillStroke(COLORS.sun)}/>`;
    else if (key === 'swing') object = `<path d="M 29 100 L 45 23 H 83 L 99 100" ${stroke} fill="none"/><path d="M 54 43 V 76 M 74 43 V 76 M 50 76 H 78" ${stroke} fill="none"/><rect x="50" y="76" width="28" height="11" rx="5" ${fillStroke(COLORS.coral)}/>`;
    else if (key === 'tv' || key === 'tablet') object = `<rect x="${key === 'tv' ? 18 : 31}" y="${key === 'tv' ? 31 : 19}" width="${key === 'tv' ? 92 : 66}" height="${key === 'tv' ? 60 : 90}" rx="10" ${fillStroke('#39485a')}/><rect x="${key === 'tv' ? 26 : 37}" y="${key === 'tv' ? 39 : 27}" width="${key === 'tv' ? 76 : 54}" height="${key === 'tv' ? 44 : 74}" rx="5" fill="${COLORS.sky}"/><circle cx="64" cy="${key === 'tv' ? 61 : 55}" r="12" fill="${COLORS.sun}"/><path d="M ${key === 'tv' ? 26 : 37} ${key === 'tv' ? 74 : 70} Q 64 54 ${key === 'tv' ? 102 : 91} ${key === 'tv' ? 74 : 70} V ${key === 'tv' ? 83 : 81} H ${key === 'tv' ? 26 : 37} Z" fill="#d6edb5"/>`;
    else if (key === 'more') object = `${ball(40, 72, 18, COLORS.sky)}${ball(67, 65, 22, COLORS.coral)}${ball(93, 74, 14, COLORS.sun)}`;
    else if (key === 'good') object = `<path d="M 36 69 L 55 87 L 93 42" ${stroke} fill="none" stroke-width="9"/><circle cx="64" cy="64" r="47" fill="${COLORS.sun}" opacity=".3"/>`;
    else if (key === 'a' || key === 'the' || key === 'it' || key === 'that') object = box(64, 68, key === 'that' ? COLORS.violet : COLORS.teal);
    return svg(key, background(key === 'good' ? COLORS.sun : COLORS.sky) + `<g id="friend-object-${key}">${object}</g>`);
  }

  function humanScene(key) {
    const expression = ['sad', 'mad', 'scared', 'tired', 'sick', 'sleep', 'calm', 'silly'].includes(key)
      ? (key === 'tired' ? 'sleep' : key) : key === 'happy' || key === 'like' || key === 'can' || key === 'finished' ? 'smile' : 'smile';
    const raised = ['yes', 'hello', 'i', 'stop', 'say', 'come', 'finished', 'can', 'want', 'need'].includes(key) ? 'up' : 'down';
    const prop = key === 'hurt' ? `<rect x="73" y="80" width="18" height="11" rx="4" ${fillStroke('#fff')}/>`
      : ['hungry', 'eat'].includes(key) ? food('apple', 91, 84)
      : ['thirsty', 'drink'].includes(key) ? cup(91, 82)
      : key === 'help' ? `${box(92, 77, COLORS.teal)}${person(94, 78, { id: 'caregiver', skin: SKIN_LIGHT, shirt: COLORS.violet, pants: COLORS.teal, scale: .48, arm: 'down', hair: 'wrap' })}`
      : key === 'open' ? box(94, 78, COLORS.sun)
      : ['make', 'put', 'do', 'get'].includes(key) ? box(93, 86, COLORS.teal)
      : ['look', 'see'].includes(key) ? `<path d="M 92 49 Q 103 34 112 49 Q 103 64 92 49 Z" ${fillStroke(COLORS.sky)}/><circle cx="103" cy="49" r="5" fill="${INK}"/>`
      : key === 'wash' ? `<path d="M 79 72 H 111 V 92 H 79 Z" ${fillStroke(COLORS.sky)}/><path d="M 89 72 V 61 Q 97 53 104 61 V 72" ${stroke} fill="none"/>`
      : ['play', 'turn'].includes(key) ? ball(94, 81, 16, COLORS.coral)
      : key === 'sleep' || key === 'sick' ? `<rect x="22" y="88" width="82" height="17" rx="8" ${fillStroke(COLORS.violet)}/><path d="M 20 87 H 106" ${stroke} fill="none"/>`
      : key === 'scared' ? person(96, 78, { id: 'caregiver', skin: SKIN_LIGHT, shirt: COLORS.violet, pants: COLORS.teal, scale: .52, arm: 'down', hair: 'wrap' })
      : key === 'hug' || key === 'we' || key === 'they' || key === 'with' ? person(95, 79, { id: 'friend', skin: SKIN_LIGHT, shirt: COLORS.teal, pants: COLORS.violet, scale: .52, arm: 'down' })
      : key === 'sit' ? `<rect x="83" y="72" width="31" height="10" rx="5" ${fillStroke(COLORS.teal)}/><path d="M 88 77 V 103 M 109 77 V 103" ${stroke} fill="none"/>`
      : key === 'wait' ? `<rect x="81" y="65" width="29" height="32" rx="6" ${fillStroke('#fff')}/><path d="M 95 73 V 84 L 103 89" ${stroke} fill="none"/>`
      : key === 'give' || key === 'for' ? `<path d="M 81 77 H 110 V 98 H 81 Z" ${fillStroke(COLORS.coral)}/><path d="M 95 77 V 98 M 81 87 H 110" ${stroke} fill="none"/>`
      : key === 'not' || key === 'no' ? `<path d="M 90 64 Q 105 55 112 68" ${stroke} fill="none"/><circle cx="101" cy="81" r="15" ${fillStroke(COLORS.sky)}/>`
      : '';
    const secondary = key === 'you' ? person(96, 79, { id: 'caregiver', skin: SKIN_LIGHT, shirt: COLORS.violet, pants: COLORS.teal, scale: .52, arm: 'down', hair: 'wrap' }) : '';
    return svg(key, background(key === 'scared' ? COLORS.violet : COLORS.coral) + `<g id="friend-scene-${key}">${person(53, 74, { id: 'child', shirt: key === 'mad' ? COLORS.coral : COLORS.sun, pants: COLORS.teal, expression, arm: raised })}${secondary}${prop}</g>`);
  }

  function relationScene(key) {
    const left = key === 'different' || key === 'or' ? ball(42, 75, 17, COLORS.coral) : box(42, 75, COLORS.teal);
    const right = key === 'different' || key === 'or' ? box(88, 75, COLORS.violet) : ball(88, 75, 17, COLORS.coral);
    let inner = `${left}${right}`;
    if (key === 'all' || key === 'some') inner = `${basket(64, 78)}${key === 'all' ? `${ball(48, 71, 10, COLORS.coral)}${ball(64, 65, 10, COLORS.sky)}${ball(80, 71, 10, COLORS.sun)}` : `${ball(45, 72, 10, COLORS.coral)}${ball(93, 72, 10, COLORS.sky)}`}`;
    else if (key === 'same') inner = `${cup(43, 74, COLORS.teal)}${cup(85, 74, COLORS.teal)}`;
    else if (key === 'in') inner = `${basket(64, 81)}${ball(64, 72, 13, COLORS.coral)}`;
    else if (key === 'on') inner = `<rect x="28" y="83" width="72" height="14" rx="6" ${fillStroke(COLORS.sand)}/>${ball(64, 64, 17, COLORS.coral)}`;
    else if (key === 'out') inner = `${basket(45, 81)}${ball(92, 78, 16, COLORS.coral)}`;
    else if (key === 'up' || key === 'down') inner = `${person(46, 78, { id: 'child', shirt: COLORS.sun, pants: COLORS.teal, arm: 'up', scale: .82 })}${ball(92, key === 'up' ? 38 : 94, 15, COLORS.coral)}`;
    else if (key === 'hot' || key === 'cold') inner = `${cup(64, 80, key === 'hot' ? COLORS.coral : COLORS.sky)}${key === 'hot' ? '<path d="M 52 48 Q 57 40 52 32 M 64 48 Q 69 40 64 32 M 76 48 Q 81 40 76 32" ' + stroke + ' fill="none"/>' : '<path d="M 64 31 V 53 M 53 42 H 75 M 56 34 L 72 50 M 72 34 L 56 50" ' + stroke + ' fill="none"/>'}`;
    else if (key === 'big' || key === 'little') inner = `${ball(43, 77, key === 'big' ? 31 : 12, COLORS.coral)}${ball(91, 77, key === 'big' ? 11 : 30, COLORS.sky)}`;
    else if (key === 'off') inner = `<rect x="42" y="52" width="44" height="50" rx="8" ${fillStroke('#eef2ed')}/><path d="M 64 61 V 83 M 54 73 H 74" ${stroke} fill="none"/><path d="M 39 35 L 89 105" ${stroke} fill="none"/>`;
    else if (key === 'there' || key === 'here' || key === 'to') inner = `${person(key === 'there' ? 37 : 56, 82, { id: 'child', shirt: COLORS.sun, pants: COLORS.teal, scale: .7 })}${box(key === 'there' ? 98 : 94, 79, COLORS.teal)}<path d="M 57 76 Q 75 55 88 70" ${stroke} fill="none"/>`;
    else if (key === 'because' || key === 'but' || key === 'again' || key === 'later' || key === 'now') inner = `<rect x="18" y="48" width="42" height="43" rx="9" ${fillStroke(COLORS.sky)}/><rect x="68" y="48" width="42" height="43" rx="9" ${fillStroke(key === 'but' ? COLORS.violet : COLORS.sun)}/><path d="M 61 69 H 67" ${stroke} fill="none"/>`;
    else if (key === 'is' || key === 'am' || key === 'are' || key === 'and' || key === 'with' || key === 'this') inner = `${person(43, 80, { id: 'child', shirt: COLORS.sun, pants: COLORS.teal, scale: .72 })}${key === 'are' || key === 'with' ? person(90, 80, { id: 'friend', skin: SKIN_LIGHT, shirt: COLORS.violet, pants: COLORS.teal, scale: .72, hair: 'wrap' }) : ball(93, 80, 16, COLORS.coral)}`;
    else if (key === 'bad') inner = `<path d="M 34 90 L 55 48 L 93 85 L 78 98 H 39 Z" ${fillStroke(COLORS.sand)}/><path d="M 55 48 L 48 73 L 70 75" ${stroke} fill="none"/>`;
    return svg(key, background(COLORS.teal) + `<g id="friend-relationship-${key}">${inner}</g>`);
  }

  function questionScene(key) {
    const object = key === 'where' ? `${basket(88, 82)}${ball(88, 71, 13, COLORS.coral)}`
      : key === 'who' ? person(91, 80, { id: 'visitor', skin: SKIN_LIGHT, shirt: COLORS.violet, pants: COLORS.teal, scale: .7, hair: 'wrap' })
      : key === 'why' ? `<path d="M 85 43 Q 98 31 111 44 Q 113 57 97 58 Q 81 58 85 43 Z" ${fillStroke(COLORS.sky)}/><path d="M 97 59 V 80" ${stroke} fill="none"/>`
      : key === 'when' ? `<rect x="77" y="54" width="38" height="38" rx="7" ${fillStroke('#fff')}/><path d="M 86 54 V 45 M 106 54 V 45 M 84 68 H 108" ${stroke} fill="none"/>`
      : key === 'how' ? `${box(89, 80, COLORS.teal)}${ball(84, 49, 10, COLORS.coral)}${ball(104, 49, 10, COLORS.sun)}`
      : `${box(91, 79, COLORS.teal)}<path d="M 75 61 Q 90 49 105 61" ${stroke} fill="none"/>`;
    return svg(key, background(COLORS.violet) + `<g id="friend-question-${key}">${person(41, 81, { id: 'child', shirt: COLORS.sun, pants: COLORS.teal, scale: .75, expression: 'smile' })}${object}<path d="M 57 38 Q 57 25 69 25 Q 80 25 80 36 Q 80 45 69 49 V 55" ${stroke} fill="none"/><circle cx="69" cy="63" r="3" fill="${INK}"/></g>`);
  }

  function clean(value) { return String(value == null ? '' : value).trim().toLowerCase(); }
  function keyFor(item) {
    const record = item || {};
    const candidates = [record.symbolKey, record.label, record.name].map(clean);
    for (const candidate of candidates) {
      const resolved = ALIASES[candidate] || candidate;
      if (FRIEND_SET.has(resolved)) return resolved;
    }
    return null;
  }
  function html(item) {
    const key = keyFor(item);
    if (!key) return letterTile((item && (item.label || item.name)) || '?');
    if (HUMAN.includes(key)) return humanScene(key);
    if (OBJECT.includes(key)) return objectPortrait(key);
    if (RELATION.includes(key)) return relationScene(key);
    return questionScene(key);
  }
  function letterTile(label) {
    const initial = clean(label).slice(0, 1).toUpperCase() || '?';
    return svg('letter', `${background(COLORS.sky)}<rect x="25" y="25" width="78" height="78" rx="20" ${fillStroke('#fff')}/><text x="64" y="80" text-anchor="middle" font-family="Atkinson Hyperlegible, sans-serif" font-size="52" font-weight="700" fill="${INK}">${initial.replace(/[<>&]/g, '')}</text>`);
  }

  root.NuranFriends = Object.freeze({
    html,
    has(item) { return !!keyFor(item); },
    keyFor,
    letterTile,
    keys: FRIEND_KEYS,
    aliases: ALIASES,
  });
})(typeof window !== 'undefined' ? window : globalThis);
