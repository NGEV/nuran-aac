/* Nuran AAC — custom symbol library.
   Hand-drawn minimal SVGs, consistent stroke style, muted palette.
   MIT licensed with the app: families and contributors may reuse and adapt freely. */

(function () {
  'use strict';

  const INK = '#4a5a66';
  const ST = `stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const STF = (fill) => `stroke="${INK}" stroke-width="5" fill="${fill}" stroke-linecap="round" stroke-linejoin="round"`;
  // muted fills
  const BLUE = '#dbe7ee', GREEN = '#e2ebde', PEACH = '#f3e5d8', ROSE = '#f1e0e4',
        YELLOW = '#f3ecd4', LAV = '#e8e2f0', SAGE = '#e6ece9';

  const S = (inner) => `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${inner}</svg>`;

  // Reusable pieces
  const person = (x, y, sc, fill) =>
    `<g transform="translate(${x},${y}) scale(${sc})">` +
    `<circle cx="0" cy="-14" r="10" ${STF(fill || YELLOW)}/>` +
    `<path d="M -12 24 Q -12 2 0 2 Q 12 2 12 24 Z" ${STF(fill || YELLOW)}/></g>`;
  const face = (fill, features) =>
    `<circle cx="48" cy="48" r="30" ${STF(fill)}/>` + features;
  const eyes = `<circle cx="37" cy="42" r="3.5" fill="${INK}"/><circle cx="59" cy="42" r="3.5" fill="${INK}"/>`;
  const qmark = (x, y, sc) =>
    `<g transform="translate(${x},${y}) scale(${sc})"><path d="M -10 -14 Q -10 -26 2 -26 Q 14 -26 14 -15 Q 14 -6 2 -2 L 2 6" ${ST}/><circle cx="2" cy="18" r="3.5" fill="${INK}"/></g>`;
  const arrowR = (x1, y, x2) =>
    `<path d="M ${x1} ${y} L ${x2} ${y} M ${x2 - 12} ${y - 12} L ${x2} ${y} L ${x2 - 12} ${y + 12}" ${ST}/>`;
  const hand = (x, y, sc, rot) =>
    `<g transform="translate(${x},${y}) rotate(${rot || 0}) scale(${sc})">` +
    `<path d="M -14 20 L -14 -2 M -7 -8 L -7 20 M 0 -10 L 0 20 M 7 -8 L 7 20 M 14 -2 L 14 20 M -14 20 Q 0 30 14 20" ${ST}/></g>`;

  const SYMBOLS = {
    /* ---------- Core 36 (Universal Core, Project Core / UNC CLDS, CC BY 4.0 word list) ---------- */
    i:        S(person(58, 48, 1.4, YELLOW) + `<path d="M 14 48 Q 30 40 42 46 M 42 46 L 30 40 M 42 46 L 31 52" ${ST}/>`),
    you:      S(person(38, 48, 1.4, YELLOW) + `<path d="M 84 48 Q 68 40 56 46 M 56 46 L 68 40 M 56 46 L 67 52" ${ST}/>`),
    he:       S(face(YELLOW, eyes + `<path d="M 38 58 Q 48 64 58 58" ${ST}/><path d="M 26 34 Q 34 16 48 18 Q 64 16 70 34" ${ST}/>`)),
    she:      S(face(YELLOW, eyes + `<path d="M 38 58 Q 48 64 58 58" ${ST}/><path d="M 24 36 Q 26 12 48 14 Q 70 12 72 36 M 24 36 Q 20 52 26 60 M 72 36 Q 76 52 70 60" ${ST}/>`)),
    it:       S(`<rect x="34" y="34" width="28" height="28" rx="6" ${STF(LAV)}/><path d="M 14 20 L 30 32 M 30 32 L 18 30 M 30 32 L 24 22" ${ST}/>`),
    that:     S(`<rect x="56" y="36" width="26" height="26" rx="6" ${STF(LAV)}/><path d="M 14 50 L 48 50 M 48 50 L 36 40 M 48 50 L 36 60" ${ST}/>`),
    want:     S(`<path d="M 48 18 L 53 32 L 68 32 L 56 42 L 61 57 L 48 48 L 35 57 L 40 42 L 28 32 L 43 32 Z" ${STF(YELLOW)}/>` + hand(30, 76, 0.8, 0) + hand(66, 76, 0.8, 0)),
    like:     S(`<path d="M 48 74 C 20 56 18 34 32 26 C 42 20 48 30 48 34 C 48 30 54 20 64 26 C 78 34 76 56 48 74 Z" ${STF(ROSE)}/>`),
    not:      S(`<circle cx="48" cy="48" r="30" ${STF('none')}/><path d="M 27 27 L 69 69" ${ST}/>`),
    stop:     S(hand(48, 46, 1.5, 0) + `<path d="M 48 84 L 48 76" ${ST}/>`),
    go:       S(`<circle cx="48" cy="48" r="32" ${STF(GREEN)}/>` + arrowR(28, 48, 70)),
    more:     S(`<circle cx="30" cy="60" r="8" ${STF(BLUE)}/><circle cx="52" cy="60" r="8" ${STF(BLUE)}/><circle cx="74" cy="60" r="8" ${STF(BLUE)}/><path d="M 48 16 L 48 40 M 36 28 L 60 28" ${ST}/>`),
    finished: S(`<rect x="18" y="18" width="60" height="60" rx="10" ${STF(SAGE)}/><path d="M 32 50 L 44 62 L 66 36" ${ST}/>`),
    help:     S(hand(30, 30, 1.0, 180) + hand(64, 66, 1.0, 0) + `<path d="M 40 44 L 56 54" ${ST}/>`),
    open:     S(`<rect x="22" y="42" width="52" height="34" rx="6" ${STF(PEACH)}/><path d="M 22 42 L 40 18 L 92 18 L 74 42" ${STF(PEACH)}/>`),
    get:      S(`<circle cx="48" cy="34" r="12" ${STF(BLUE)}/>` + hand(48, 68, 1.1, 0) + `<path d="M 48 50 L 48 56" ${ST}/>`),
    put:      S(`<rect x="30" y="58" width="36" height="22" rx="5" ${STF(PEACH)}/><circle cx="48" cy="24" r="9" ${STF(BLUE)}/><path d="M 48 36 L 48 50 M 38 42 L 48 52 L 58 42" ${ST}/>`),
    make:     S(`<rect x="26" y="56" width="20" height="20" rx="4" ${STF(BLUE)}/><rect x="50" y="56" width="20" height="20" rx="4" ${STF(GREEN)}/><rect x="38" y="34" width="20" height="20" rx="4" ${STF(PEACH)}/><path d="M 68 26 L 72 18 M 74 32 L 82 30 M 62 22 L 60 14" ${ST}/>`),
    do:       S(`<circle cx="48" cy="48" r="16" ${STF(SAGE)}/><g ${ST}><path d="M 48 20 L 48 30 M 48 66 L 48 76 M 20 48 L 30 48 M 66 48 L 76 48 M 28 28 L 35 35 M 61 61 L 68 68 M 68 28 L 61 35 M 35 61 L 28 68"/></g>`),
    turn:     S(`<path d="M 70 34 A 28 28 0 1 0 76 52" ${ST}/><path d="M 70 16 L 70 34 L 52 34" ${ST}/>`),
    look:     S(`<path d="M 12 48 Q 48 16 84 48 Q 48 80 12 48 Z" ${STF(BLUE)}/><circle cx="48" cy="48" r="12" ${STF('#fffdf8')}/><circle cx="48" cy="48" r="5" fill="${INK}"/>`),
    can:      S(`<path d="M 24 72 L 24 48 Q 24 30 42 30 Q 58 30 58 44 L 58 50" ${ST}/><circle cx="58" cy="58" r="12" ${STF(YELLOW)}/><path d="M 24 72 L 40 72" ${ST}/>`),
    good:     S(`<path d="M 34 46 L 34 78 L 66 78 Q 76 78 76 68 L 76 52 Q 76 44 68 44 L 52 44 L 56 26 Q 57 18 50 16 Q 44 15 42 22 L 34 46 Z" ${STF(GREEN)}/><path d="M 22 46 L 34 46 L 34 78 L 22 78 Z" ${STF(SAGE)}/>`),
    here:     S(`<path d="M 48 14 Q 68 14 68 36 Q 68 52 48 76 Q 28 52 28 36 Q 28 14 48 14 Z" ${STF(ROSE)}/><circle cx="48" cy="36" r="8" ${STF('#fffdf8')}/><path d="M 24 84 L 72 84" ${ST}/>`),
    up:       S(`<path d="M 48 78 L 48 24 M 28 44 L 48 22 L 68 44" ${ST}/>`),
    "in":     S(`<rect x="30" y="44" width="40" height="32" rx="6" ${STF(PEACH)}/><path d="M 48 12 L 48 36 M 38 26 L 48 38 L 58 26" ${ST}/>`),
    on:       S(`<rect x="26" y="54" width="44" height="22" rx="5" ${STF(PEACH)}/><circle cx="48" cy="40" r="11" ${STF(BLUE)}/>`),
    all:      S(`<circle cx="48" cy="48" r="32" ${STF('none')}/><circle cx="38" cy="38" r="7" ${STF(BLUE)}/><circle cx="58" cy="38" r="7" ${STF(BLUE)}/><circle cx="38" cy="58" r="7" ${STF(BLUE)}/><circle cx="58" cy="58" r="7" ${STF(BLUE)}/><circle cx="48" cy="48" r="7" ${STF(BLUE)}/>`),
    some:     S(`<circle cx="48" cy="48" r="32" ${STF('none')}/><circle cx="38" cy="42" r="7" ${STF(BLUE)}/><circle cx="58" cy="52" r="7" ${STF(BLUE)}/><circle cx="56" cy="34" r="7" ${STF('none')}/><circle cx="38" cy="60" r="7" ${STF('none')}/>`),
    same:     S(`<rect x="16" y="34" width="26" height="26" rx="6" ${STF(GREEN)}/><rect x="54" y="34" width="26" height="26" rx="6" ${STF(GREEN)}/><path d="M 40 74 L 56 74 M 40 82 L 56 82" ${ST}/>`),
    different:S(`<rect x="16" y="34" width="26" height="26" rx="6" ${STF(GREEN)}/><path d="M 67 32 L 82 60 L 52 60 Z" ${STF(ROSE)}/>`),
    what:     S(qmark(48, 52, 1.9)),
    who:      S(`<circle cx="36" cy="52" r="22" ${STF(YELLOW)}/><circle cx="29" cy="48" r="3" fill="${INK}"/><circle cx="43" cy="48" r="3" fill="${INK}"/><path d="M 29 60 Q 36 64 43 60" ${ST}/>` + qmark(72, 42, 1.2)),
    where:    S(`<path d="M 36 20 Q 52 20 52 38 Q 52 50 36 68 Q 20 50 20 38 Q 20 20 36 20 Z" ${STF(ROSE)}/><circle cx="36" cy="38" r="6" ${STF('#fffdf8')}/>` + qmark(72, 46, 1.2)),
    when:     S(`<circle cx="38" cy="52" r="24" ${STF(BLUE)}/><path d="M 38 38 L 38 52 L 50 58" ${ST}/>` + qmark(76, 42, 1.2)),
    why:      S(`<ellipse cx="36" cy="44" rx="24" ry="18" ${STF(LAV)}/><circle cx="22" cy="66" r="5" ${STF(LAV)}/><circle cx="14" cy="76" r="3" ${STF(LAV)}/>` + qmark(74, 46, 1.2)),

    /* ---------- Food and drink ---------- */
    water:    S(`<path d="M 30 22 L 66 22 L 60 78 L 36 78 Z" ${STF('none')}/><path d="M 33 44 Q 41 40 48 44 Q 55 48 63 44 L 61 74 L 35 74 Z" ${STF(BLUE)}/>`),
    milk:     S(`<path d="M 34 14 L 62 14 L 62 26 L 70 40 L 70 80 L 26 80 L 26 40 L 34 26 Z" ${STF('#fffdf8')}/><path d="M 26 40 L 70 40" ${ST}/>`),
    juice:    S(`<path d="M 32 26 L 64 26 L 58 80 L 38 80 Z" ${STF(PEACH)}/><path d="M 52 26 L 62 10" ${ST}/>`),
    cookie:   S(`<circle cx="48" cy="48" r="30" ${STF(PEACH)}/><circle cx="38" cy="40" r="4" fill="${INK}"/><circle cx="58" cy="44" r="4" fill="${INK}"/><circle cx="44" cy="60" r="4" fill="${INK}"/>`),
    apple:    S(`<path d="M 48 34 Q 28 22 22 44 Q 18 66 40 76 Q 48 80 56 76 Q 78 66 74 44 Q 68 22 48 34 Z" ${STF(ROSE)}/><path d="M 48 32 Q 48 20 56 14" ${ST}/>`),
    banana:   S(`<path d="M 22 30 Q 26 66 62 72 Q 74 74 78 66 Q 72 78 54 80 Q 18 76 14 34 Q 14 26 22 30 Z" ${STF(YELLOW)}/>`),
    bread:    S(`<path d="M 20 46 Q 20 28 48 28 Q 76 28 76 46 L 76 72 L 20 72 Z" ${STF(PEACH)}/><path d="M 20 50 L 76 50" ${ST}/>`),
    snack:    S(`<path d="M 20 44 L 76 44 Q 76 74 48 74 Q 20 74 20 44 Z" ${STF(SAGE)}/><circle cx="38" cy="38" r="6" ${STF(PEACH)}/><circle cx="54" cy="34" r="6" ${STF(ROSE)}/>`),

    /* ---------- Body and needs ---------- */
    bathroom: S(`<path d="M 28 20 L 56 20 L 56 48 L 28 48 Z" ${STF('#fffdf8')}/><path d="M 28 48 L 70 48 Q 70 70 50 70 L 44 70 Q 28 70 28 48 Z" ${STF(BLUE)}/><path d="M 46 70 L 46 80 L 58 80" ${ST}/>`),
    hurt:     S(`<g transform="rotate(45 48 48)"><rect x="14" y="36" width="68" height="24" rx="12" ${STF(PEACH)}/><rect x="38" y="36" width="20" height="24" ${STF('#fffdf8')}/></g><circle cx="45" cy="45" r="2.5" fill="${INK}"/><circle cx="51" cy="51" r="2.5" fill="${INK}"/>`),
    tired:    S(`<path d="M 60 16 Q 34 22 34 48 Q 34 74 60 80 Q 40 82 28 66 Q 16 48 28 30 Q 40 14 60 16 Z" ${STF(LAV)}/><path d="M 62 28 L 76 28 L 62 42 L 76 42" ${ST}/>`),
    hungry:   S(`<circle cx="52" cy="52" r="26" ${STF('#fffdf8')}/><circle cx="52" cy="52" r="14" ${STF('none')}/><path d="M 16 26 L 16 46 M 22 26 L 22 46 M 19 46 L 19 78" ${ST}/>`),
    thirsty:  S(`<path d="M 48 14 Q 70 44 70 58 Q 70 78 48 78 Q 26 78 26 58 Q 26 44 48 14 Z" ${STF(BLUE)}/>`),
    sick:     S(`<rect x="42" y="16" width="12" height="52" rx="6" ${STF('#fffdf8')}/><circle cx="48" cy="74" r="10" ${STF(ROSE)}/><path d="M 48 68 L 48 40" stroke="${INK}" stroke-width="4"/>`),
    hot:      S(`<circle cx="48" cy="48" r="18" ${STF(YELLOW)}/><g ${ST}><path d="M 48 14 L 48 24 M 48 72 L 48 82 M 14 48 L 24 48 M 72 48 L 82 48 M 24 24 L 31 31 M 65 65 L 72 72 M 72 24 L 65 31 M 31 65 L 24 72"/></g>`),
    cold:     S(`<g ${ST}><path d="M 48 12 L 48 84 M 16 30 L 80 66 M 80 30 L 16 66 M 48 12 L 40 22 M 48 12 L 56 22 M 48 84 L 40 74 M 48 84 L 56 74"/></g>`),
    sleep:    S(`<path d="M 14 68 L 14 40 M 14 52 L 82 52 L 82 68 M 14 60 L 82 60" ${ST}/><circle cx="28" cy="44" r="8" ${STF(YELLOW)}/><path d="M 40 40 Q 58 34 82 44" ${STF(LAV)}/>`),

    /* ---------- Feelings ---------- */
    happy:    S(face(YELLOW, eyes + `<path d="M 34 56 Q 48 68 62 56" ${ST}/>`)),
    sad:      S(face(BLUE, eyes + `<path d="M 34 64 Q 48 54 62 64" ${ST}/><path d="M 62 50 Q 66 58 62 62" ${STF(BLUE)}/>`)),
    mad:      S(face(ROSE, eyes + `<path d="M 30 34 L 42 40 M 66 34 L 54 40 M 36 64 L 60 64" ${ST}/>`)),
    scared:   S(face(LAV, `<circle cx="37" cy="42" r="6" ${STF('#fffdf8')}/><circle cx="59" cy="42" r="6" ${STF('#fffdf8')}/><ellipse cx="48" cy="60" rx="7" ry="9" ${STF('#fffdf8')}/>`)),
    calm:     S(face(GREEN, `<path d="M 32 42 Q 37 39 42 42 M 54 42 Q 59 39 64 42 M 36 58 Q 48 64 60 58" ${ST}/>`)),
    silly:    S(face(PEACH, `<circle cx="37" cy="40" r="3.5" fill="${INK}"/><path d="M 54 38 L 64 42 M 38 56 Q 48 62 58 56 M 48 59 Q 50 70 44 72" ${ST}/>`)),

    /* ---------- Actions ---------- */
    eat:      S(`<circle cx="56" cy="52" r="24" ${STF('#fffdf8')}/><path d="M 18 20 L 18 40 M 25 20 L 25 40 M 21.5 40 L 21.5 76" ${ST}/><circle cx="56" cy="52" r="10" ${STF(PEACH)}/>`),
    drink:    S(`<path d="M 30 24 L 66 24 L 60 78 L 36 78 Z" ${STF('none')}/><path d="M 33 40 L 63 40 L 60 74 L 36 74 Z" ${STF(BLUE)}/><path d="M 48 12 L 58 24" ${ST}/>`),
    play:     S(`<circle cx="36" cy="56" r="20" ${STF(ROSE)}/><path d="M 24 48 Q 36 40 48 48 M 36 36 L 36 76" ${ST}/><rect x="58" y="36" width="22" height="22" rx="4" ${STF(BLUE)}/>`),
    wash:     S(hand(42, 48, 1.2, 0) + `<path d="M 66 22 Q 70 30 66 34 M 76 30 Q 80 38 76 42 M 70 44 Q 74 52 70 56" ${ST}/>`),
    hug:      S(person(34, 48, 1.2, YELLOW) + person(62, 48, 1.2, PEACH) + `<path d="M 30 64 Q 48 76 66 64" ${ST}/>`),
    sit:      S(`<path d="M 30 20 L 30 56 L 64 56 L 64 76 M 30 56 L 30 76 M 30 36 L 56 36 L 56 56" ${ST}/><circle cx="44" cy="26" r="8" ${STF(YELLOW)}/>`),
    come:     S(person(70, 48, 1.4, YELLOW) + `<path d="M 12 48 L 44 48 M 44 48 L 32 38 M 44 48 L 32 58" ${ST}/>`),
    give:     S(hand(36, 60, 1.1, 0) + `<circle cx="36" cy="34" r="10" ${STF(ROSE)}/>` + `<path d="M 58 48 L 82 48 M 82 48 L 72 40 M 82 48 L 72 56" ${ST}/>`),

    /* ---------- Places ---------- */
    home:     S(`<path d="M 18 48 L 48 20 L 78 48" ${ST}/><path d="M 26 46 L 26 78 L 70 78 L 70 46" ${STF(PEACH)}/><rect x="42" y="58" width="14" height="20" ${STF('#fffdf8')}/>`),
    school:   S(`<rect x="20" y="40" width="56" height="38" rx="4" ${STF(YELLOW)}/><path d="M 20 40 L 48 22 L 76 40" ${ST}/><path d="M 48 22 L 48 10 L 62 10 L 62 16 L 48 16" ${STF(ROSE)}/><rect x="42" y="58" width="12" height="20" ${STF('#fffdf8')}/>`),
    park:     S(`<circle cx="40" cy="36" r="20" ${STF(GREEN)}/><path d="M 40 56 L 40 80 M 20 80 L 82 80 M 66 80 L 66 60 L 78 60 L 78 80" ${ST}/>`),
    outside:  S(`<circle cx="32" cy="32" r="14" ${STF(YELLOW)}/><path d="M 32 10 L 32 16 M 10 32 L 16 32 M 17 17 L 21 21 M 47 17 L 43 21" ${ST}/><path d="M 40 66 Q 40 54 52 54 Q 56 44 68 46 Q 80 48 80 58 Q 88 60 86 68 Q 84 74 76 74 L 46 74 Q 38 74 40 66 Z" ${STF('#fffdf8')}/>`),
    car:      S(`<path d="M 18 58 L 22 42 Q 24 34 34 34 L 60 34 Q 68 34 72 42 L 78 58 L 78 70 L 18 70 Z" ${STF(BLUE)}/><circle cx="32" cy="70" r="8" ${STF('#fffdf8')}/><circle cx="64" cy="70" r="8" ${STF('#fffdf8')}/>`),
    store:    S(`<rect x="20" y="40" width="56" height="38" ${STF('#fffdf8')}/><path d="M 16 40 L 24 20 L 72 20 L 80 40 Q 80 48 72 48 Q 64 48 64 40 Q 64 48 56 48 Q 48 48 48 40 Q 48 48 40 48 Q 32 48 32 40 Q 32 48 24 48 Q 16 48 16 40 Z" ${STF(ROSE)}/><rect x="40" y="56" width="16" height="22" ${STF(PEACH)}/>`),

    /* ---------- Play ---------- */
    ball:     S(`<circle cx="48" cy="48" r="30" ${STF(ROSE)}/><path d="M 24 36 Q 48 48 72 36 M 24 60 Q 48 48 72 60" ${ST}/>`),
    bubbles:  S(`<circle cx="36" cy="40" r="20" ${STF(BLUE)}/><circle cx="66" cy="30" r="10" ${STF(BLUE)}/><circle cx="64" cy="62" r="14" ${STF(BLUE)}/><circle cx="30" cy="34" r="4" ${STF('#fffdf8')}/>`),
    book:     S(`<path d="M 48 26 Q 34 18 18 22 L 18 70 Q 34 66 48 74 Q 62 66 78 70 L 78 22 Q 62 18 48 26 Z" ${STF(SAGE)}/><path d="M 48 26 L 48 74" ${ST}/>`),
    music:    S(`<path d="M 36 70 L 36 24 L 70 18 L 70 62" ${ST}/><ellipse cx="28" cy="70" rx="9" ry="7" ${STF(LAV)}/><ellipse cx="62" cy="62" rx="9" ry="7" ${STF(LAV)}/>`),
    blocks:   S(`<rect x="22" y="52" width="24" height="24" rx="4" ${STF(BLUE)}/><rect x="52" y="52" width="24" height="24" rx="4" ${STF(ROSE)}/><rect x="37" y="26" width="24" height="24" rx="4" ${STF(GREEN)}/>`),
    swing:    S(`<path d="M 24 14 L 24 60 M 72 14 L 72 60 M 16 14 L 80 14" ${ST}/><rect x="32" y="58" width="32" height="8" rx="4" ${STF(PEACH)}/><path d="M 32 60 L 28 14 M 64 60 L 68 14" ${ST}/>`),
    tv:       S(`<rect x="16" y="24" width="64" height="44" rx="6" ${STF(BLUE)}/><path d="M 36 78 L 60 78" ${ST}/><path d="M 42 38 L 58 46 L 42 54 Z" ${STF('#fffdf8')}/>`),
    tablet:   S(`<rect x="26" y="16" width="44" height="64" rx="8" ${STF('#fffdf8')}/><rect x="32" y="24" width="32" height="44" ${STF(BLUE)}/><circle cx="48" cy="74" r="3" fill="${INK}"/>`),

    yes:      S(`<circle cx="48" cy="48" r="32" ${STF(GREEN)}/><path d="M 32 50 L 44 62 L 66 34" ${ST}/>`),
    no:       S(`<circle cx="48" cy="48" r="32" ${STF(ROSE)}/><path d="M 34 34 L 62 62 M 62 34 L 34 62" ${ST}/>`),

    hello:    S(`<circle cx="40" cy="44" r="22" ${STF(YELLOW)}/><circle cx="33" cy="40" r="3" fill="${INK}"/><circle cx="47" cy="40" r="3" fill="${INK}"/><path d="M 33 52 Q 40 57 47 52" ${ST}/><g transform="translate(72,34) rotate(15)">${''}<path d="M -8 22 L -8 -2 M -3 -6 L -3 22 M 2 -8 L 2 22 M 7 -6 L 7 22 M -8 22 Q 0 30 7 22" ${ST}/></g>`),

    /* ---------- Celebration cards (calm, static — games only) ---------- */
    cele_star:    S(`<path d="M 48 10 L 58 36 L 86 36 L 63 52 L 71 80 L 48 63 L 25 80 L 33 52 L 10 36 L 38 36 Z" ${STF(YELLOW)}/><g ${ST}><path d="M 48 2 L 48 7 M 14 20 L 18 24 M 82 20 L 78 24"/></g>`),
    cele_rainbow: S(`<path d="M 12 72 A 36 36 0 0 1 84 72" stroke="#B3808F" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M 22 72 A 26 26 0 0 1 74 72" stroke="#B3A266" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M 32 72 A 16 16 0 0 1 64 72" stroke="#82A077" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M 42 72 A 6 6 0 0 1 54 72" stroke="#7D9CB0" stroke-width="7" fill="none" stroke-linecap="round"/>`),
    cele_balloons:S(`<ellipse cx="30" cy="34" rx="14" ry="17" ${STF(ROSE)}/><ellipse cx="62" cy="26" rx="13" ry="16" ${STF(BLUE)}/><ellipse cx="52" cy="56" rx="12" ry="15" ${STF(YELLOW)}/><path d="M 30 51 Q 28 66 34 80 M 62 42 Q 64 60 58 80 M 52 71 Q 52 76 54 82" ${ST}/>`),
    cele_check:   S(`<circle cx="48" cy="48" r="34" ${STF(GREEN)}/><path d="M 30 50 L 43 63 L 67 34" ${ST}/>`),

    /* ---------- Category icons ---------- */
    _body:    S(person(44, 52, 1.8, YELLOW) + `<path d="M 74 34 C 62 26 60 16 68 12 C 73 10 76 15 76 17 C 76 15 79 10 84 12 C 92 16 90 26 78 34 Z" ${STF(ROSE)}/>`),

    /* ---------- App chrome icons ---------- */
    _talk:    S(`<path d="M 16 24 Q 16 16 24 16 L 72 16 Q 80 16 80 24 L 80 52 Q 80 60 72 60 L 44 60 L 28 74 L 28 60 L 24 60 Q 16 60 16 52 Z" ${STF(GREEN)}/><circle cx="36" cy="38" r="4" fill="${INK}"/><circle cx="48" cy="38" r="4" fill="${INK}"/><circle cx="60" cy="38" r="4" fill="${INK}"/>`),
    _people:  S(person(32, 46, 1.5, YELLOW) + person(66, 50, 1.2, PEACH)),
    _help:    S(`<path d="M 48 14 Q 66 14 66 32 L 66 48 Q 66 56 72 62 L 24 62 Q 30 56 30 48 L 30 32 Q 30 14 48 14 Z" ${STF(ROSE)}/><path d="M 42 70 Q 48 76 54 70" ${ST}/>`),
    _star:    S(`<path d="M 48 14 L 56 36 L 80 36 L 61 50 L 68 74 L 48 60 L 28 74 L 35 50 L 16 36 L 40 36 Z" ${STF(YELLOW)}/>`),
    _learn:   S(`<path d="M 48 34 Q 34 26 18 30 L 18 74 Q 34 70 48 78 Q 62 70 78 74 L 78 30 Q 62 26 48 34 Z" ${STF(SAGE)}/><path d="M 48 34 L 48 78" ${ST}/><path d="M 48 6 L 51 14 L 60 14 L 53 19 L 56 28 L 48 22 L 40 28 L 43 19 L 36 14 L 45 14 Z" ${STF(YELLOW)}/>`),
  };

  // Public API
  window.Symbols = {
    get(key) { return SYMBOLS[key] || null; },
    has(key) { return !!SYMBOLS[key]; },
    keys() { return Object.keys(SYMBOLS).filter(k => !k.startsWith('_')); },
    letterTile(label) {
      const ch = (label || '?').trim().charAt(0).toUpperCase();
      return S(`<rect x="14" y="14" width="68" height="68" rx="14" ${STF('#efece5')}/>` +
        `<text x="48" y="64" text-anchor="middle" font-family="inherit" font-size="44" font-weight="700" fill="${INK}">${ch.replace(/[<>&]/g, '')}</text>`);
    },
  };
})();
