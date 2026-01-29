/**
 * Grammar forbidden rules + validators
 * (migrated & enhanced from workGrammarRules.ts)
 */

export const FORBIDDEN_TRANSFORMATIONS_PROMPT = `
**🎯 MOST IMPORTANT PRINCIPLE (어법 문제의 최우선 원칙):**
The incorrect (transformed) grammar option MUST be **plausible** — i.e. a form that **actually exists and is used somewhere in English grammar**. You must NEVER invent or create grammar patterns, word forms, or structures that do not exist in English at all. Wrong answers must be "wrong in this context" but "valid in other contexts".

**ABSOLUTELY FORBIDDEN:**
- Transforming to a completely unrelated word family (e.g., "though" → "thought")
- Spelling/typo errors (not grammar errors)
- Creating non-existent words (e.g., "coulding", "howeverly", "to continuing", "of be", "to to reinvent")

**🚨 CRITICAL (EdgeEnglish specific bans):**
- NEVER create errors by placing "to + verb" immediately after a preposition (of/for/about/by/with/without/in/on/at/from/into/onto/over/under...).
  Examples forbidden: "of to V", "for to V", "with to V", "without to V".
  Exception: idiom "be about to V" is allowed ONLY when the pattern is exactly "be about to V" (NOT "the thought of to V").
- NEVER transform "the thought/idea of + (noun / V-ing)" into "the thought/idea of + to V".
- NEVER do gerund(-ing) → "to + base verb" mechanical transformation. (Too easy / unnatural in CSAT-quality items.)
- **🚨 to 부정사 변형 절대 금지:** "to + 동사원형"을 "to + 동사ing"(예: to reinvent → to reinventing)으로 바꾸는 것은 **비문**이므로 절대 금지.
  - **허용되는 to 부정사 변형은 오직 다음 두 가지뿐:** (1) **to be + 동사ing** (예: to reinvent → to be reinventing), (2) **to be + 과거분사** (예: to reinvent → to be reinvented).
  - "to create" → "to creating", "to reinvent" → "to reinventing" 등 "to + V-ing" 형태는 영어에 존재하지 않으며 절대 생성 금지.
- **🚨 "like to / want to" 등 뒤 동사 변형:** "we like to imagine"에서 **to를 제거하면 "we like be imagining" 비문**이 됩니다. "like to", "want to", "love to" 등 뒤의 동사를 변형할 때는 **반드시 "to"를 유지**하고 **수동태(be + 과거분사)**로만 변형하세요. 예: like to imagine → like to be imagined. ❌ 금지: like be imagining (to 누락).
- **🚨 전치사 + 동명사(by/without/of 등 + V-ing) 변형:** "by reducing", "of looking" 등을 변형할 때 (1) **과거분사 단독** (by reduced, of looked)은 비문 금지. (2) **"being + 동사ing"** (by being reducing, of being looking)도 비문입니다. **허용되는 변형은 오직 "being + 과거분사"** (by being reduced, of being looked)만.
- **🚨 주어 + be동사:** 주어 다음의 be동사(are, is, am, was, were)는 **절대로 "be + 동사ing"로 변형하면 안 됩니다.** (예: Categories are → Categories be aring 은 비문). 주어+be 자리에는 be+V-ing 형태를 넣지 마세요.
- **🚨 조동사/조동사 축약 + 동사:** "didn't mean", "don't think" 등을 **"didn't to mean", "don't to think"**로 변형하면 완전히 비문입니다. 조동사(didn't, don't, won't, can't 등) 뒤에는 **to 부정사를 넣지 마세요.**
- Avoid trivial, instantly obvious transformations that do not require clause-level checking.
`;

export const FORBIDDEN_EXAMPLES_PROMPT = `
**❌ FORBIDDEN examples**
- **to 부정사 → to + 동사ing (비문):** to reinvent → to reinventing, to create → to creating, to continue → to continuing (이 패턴은 영어에 없음. 반드시 to be + 동사ing 또는 to be + 과거분사로만 변형)
- to reinvent → to to reinvent
- of being → of be / of been / of being being
- **by/without/of + 동명사:** by reducing → by reduced (비문). by being reducing (비문). 반드시 by being reduced (being + 과거분사만).
- **주어 + be동사:** Categories are → Categories be aring (비문). 주어 다음 be동사를 be+V-ing로 변형 금지.
- **조동사 + to:** didn't mean → didn't to mean (비문). don't/didn't/won't/can't 등 뒤에 to 부정사 금지.
- could → coulding
- however → howeverly
- the thought of being → the thought of to be
- of ~ → of to V  (preposition + to-infinitive right after it)
`;

/**
 * ---- Code-level validators ----
 */

export type ValidationResult = { isValid: boolean; errorMessage?: string };

const normalize = (s: string) => s.toLowerCase().trim();

/**
 * Existing validator (ported from workGrammarRules.ts) + small enhancements.
 * This works at "word/phrase" level (no context).
 */
export function validateTransformation(originalWord: string, transformedWord: string): ValidationResult {
  const original = normalize(originalWord);
  const transformed = normalize(transformedWord);

  // 0) Empty / identical
  if (!transformed) return { isValid: false, errorMessage: `변형 결과가 비어 있습니다.` };
  if (original === transformed) return { isValid: false, errorMessage: `원본과 변형이 동일합니다.` };

  // 1) Modal + ing forbidden
  const modalVerbs = ['could', 'should', 'would', 'can', 'may', 'might', 'must', 'will', 'shall'];
  const forbiddenModalIng = modalVerbs.some((m) => transformed === `${m}ing` || transformed.startsWith(`${m}ing `));
  if (forbiddenModalIng) {
    return {
      isValid: false,
      errorMessage: `조동사에 "-ing"를 붙인 변형("${transformedWord}")은 절대 금지됩니다.`,
    };
  }

  // 2) Non-existent -ly words
  const forbiddenAdverbLy = new Set([
    'howeverly',
    'ratherly',
    'neverthelessly',
    'moreoverly',
    'furthermorely',
    'thereforely',
    'thusly',
    'whatly',
    'whyly',
    'wherely',
    'howly',
    'whateverly',
  ]);
  if (forbiddenAdverbLy.has(transformed)) {
    return {
      isValid: false,
      errorMessage: `존재하지 않는 -ly 단어("${transformedWord}") 생성은 절대 금지됩니다.`,
    };
  }

  // 3) Subject pronoun swaps / possessive swaps (too trivial)
  const forbiddenPronounPairs: Array<[string, string]> = [
    ['it', 'its'],
    ['they', 'their'],
    ['he', 'his'],
    ['she', 'her'],
    ['we', 'our'],
    ['you', 'your'],
    ['i', 'my'],
    ['this', "this's"],
    ['those', "those's"],
    ['these', "these's"],
    ['that', "that's"],
    ['they', 'those'],
    ['this', 'that'],
    ['these', 'those'],
    ['i', 'you'],
    ['he', 'she'],
  ];
  if (forbiddenPronounPairs.some(([a, b]) => (original === a && transformed === b) || (original === b && transformed === a))) {
    return {
      isValid: false,
      errorMessage: `대명사 기계적 교체("${originalWord}" → "${transformedWord}")는 금지됩니다.`,
    };
  }

  // 4) be-verb -> being forbidden
  const beVerbs = new Set(['am', 'is', 'are', 'was', 'were', 'be']);
  if (beVerbs.has(original) && transformed === 'being') {
    return {
      isValid: false,
      errorMessage: `be동사를 단순히 being으로 바꾸는 변형("${originalWord}" → "${transformedWord}")은 금지됩니다.`,
    };
  }
  // 4b) 주어+be동사 → "be + 동사ing" 금지 (Categories are → Categories be aring 비문)
  if (beVerbs.has(original) && /^be\s+[a-z]+ing$/i.test(transformed.trim())) {
    return {
      isValid: false,
      errorMessage: `주어 다음 be동사("${originalWord}")를 "be + 동사ing"("${transformedWord}")으로 변형하면 비문입니다. 주어+be 자리에는 be+V-ing 형태를 사용하지 마세요.`,
    };
  }
  // 4c) "being + 현재분사" 금지 (by being reducing, of being looking 비문 — being + 과거분사만 허용)
  if (/^being\s+[a-z]+ing$/i.test(transformed.trim()) && !transformed.toLowerCase().includes('being being')) {
    return {
      isValid: false,
      errorMessage: `"being + 동사ing"("${transformedWord}")은 비문입니다. 전치사(of/by 등)+동명사 변형은 "being + 과거분사"만 허용합니다. (예: being reduced, being looked)`,
    };
  }

  // 5) to + V -> to + Ving forbidden (비문: "to reinventing" 등)
  const toInfToIng = /^to\s+[a-z]+ing$/i;
  const toInf = /^to\s+[a-z]+$/i;
  if (toInfToIng.test(transformedWord) && toInf.test(originalWord)) {
    return {
      isValid: false,
      errorMessage: `"to + 동사원형" → "to + 동사ing" 변형("${originalWord}" → "${transformedWord}")은 비문이므로 절대 금지됩니다. to 부정사는 to be + 동사ing, to be + 과거분사로만 변형하세요.`,
    };
  }

  // 5b) 동사원형 → 동사ing (선택 단어가 "reinvent"일 때 AI가 "reinventing"을 반환하면 지문에 "to reinventing"이 됨)
  const baseToIng =
    transformed === original + 'ing' ||
    (original.endsWith('e') && transformed === original.slice(0, -1) + 'ing');
  if (baseToIng && !original.includes(' ')) {
    return {
      isValid: false,
      errorMessage: `동사원형("${originalWord}")을 "동사ing"("${transformedWord}")으로 바꾸면 "to ${transformedWord}"(예: to reinventing) 비문이 됩니다. to 부정사는 to be + 동사ing, to be + 과거분사로만 변형하세요.`,
    };
  }

  // 6) to to V forbidden
  if (/^to\s+to\s+/i.test(transformedWord.trim())) {
    return {
      isValid: false,
      errorMessage: `"to + to + 동사원형" 형태("${transformedWord}")는 절대 금지됩니다.`,
    };
  }

  // 6b) "to + 동사원형" 단독 비문 (didn't to mean, don't to think 등 — 조동사 뒤에 to 부정사 삽입 금지)
  const toPlusSingleVerb = /^to\s+([a-z]+)$/i.exec(transformedWord.trim());
  if (toPlusSingleVerb && toPlusSingleVerb[1].toLowerCase() !== 'be') {
    return {
      isValid: false,
      errorMessage: `"to + 동사원형" 단독("${transformedWord}")은 "didn't to mean", "don't to think" 등 비문을 만듭니다. 조동사(didn't, don't 등) 뒤에는 to 부정사를 넣지 마세요.`,
    };
  }

  // 7) of being -> of be/been/being being already covered partly, but keep explicit
  if (original === 'being' && (transformed === 'be' || transformed === 'been')) {
    return {
      isValid: false,
      errorMessage: `"being"을 "${transformedWord}"로 바꾸면 "of ${transformedWord}" 류 비문을 만들 가능성이 높아 금지합니다.`,
    };
  }
  if (transformed.includes('being being')) {
    return { isValid: false, errorMessage: `"being being"은 영어에 없는 형태입니다.` };
  }

  // 8) NEW: gerund(-ing) -> "to + base verb" mechanical transformation forbidden
  // Example: being -> to be, doing -> to do, working -> to work
  if (original.endsWith('ing') && /^to\s+[a-z]+$/i.test(transformedWord.trim())) {
    return {
      isValid: false,
      errorMessage: `동명사/현재분사(-ing)를 "to + 동사원형"으로 바꾸는 기계적 변형("${originalWord}" → "${transformedWord}")은 금지합니다.`,
    };
  }

  // 8b) 동명사(-ing) → 과거분사(-ed) 단독 금지 (전치사 뒤 "by reducing" → "by reduced" 비문 방지)
  // 전치사 뒤 V-ing 변형은 반드시 "being + V-ing" 또는 "being + 과거분사"만 허용.
  if (original.endsWith('ing') && !original.includes(' ') && !transformed.startsWith('being ')) {
    const baseFromIng = original.slice(0, -3);
    const base = baseFromIng.length >= 2 && !/[aeiou]/i.test(baseFromIng.slice(-1)) ? baseFromIng + 'e' : baseFromIng;
    const ppForm = base.endsWith('e') ? base + 'd' : base + 'ed';
    if (transformed === ppForm) {
      return {
        isValid: false,
        errorMessage: `동명사("${originalWord}")를 과거분사("${transformedWord}")만으로 바꾸면 전치사 뒤 "by ${transformedWord}" 등 비문이 됩니다. 전치사+동명사 변형은 반드시 "being ${originalWord}" 또는 "being ${transformedWord}"로 하세요.`,
      };
    }
  }

  // 9) Unrelated word pairs (classic confusions)
  const unrelatedPairs: Array<[string, string]> = [
    ['though', 'thought'],
    ['through', 'thorough'],
    ['whether', 'weather'],
    ['desert', 'dessert'],
    ['principal', 'principle'],
  ];
  if (unrelatedPairs.some(([a, b]) => (original === a && transformed === b) || (original === b && transformed === a))) {
    return { isValid: false, errorMessage: `전혀 다른 단어로 치환하는 변형은 금지됩니다.` };
  }

  return { isValid: true };
}

/**
 * Context-level validation:
 * After you inject the transformed option into the passage, validate the whole passage.
 * This catches "of to V" patterns like "the thought of to be".
 */
export function validatePassageForForbiddenPatterns(passage: string): ValidationResult {
  const text = passage;

  // Preposition + to-infinitive right after it (forbid)
  // We exclude the idiom "be about to V" using a lightweight exception.
  const preps = '(of|for|about|by|with|without|in|on|at|from|into|onto|over|under|after|before|around|during|through|across|within|among|between)';
  const re = new RegExp(`\\b${preps}\\s+to\\s+[a-z]+\\b`, 'i');

  const m = text.match(re);
  if (m) {
    const snippet = m[0];
    // exception 1: "be about to V" idiom only
    if (/^about to\b/i.test(snippet)) {
      const idx = m.index ?? -1;
      const before = idx >= 0 ? text.slice(Math.max(0, idx - 20), idx) : '';
      if (/\b(is|are|was|were|be|been|being)\s*$/i.test(before)) {
        return { isValid: true };
      }
    }
    // exception 2: "to be" / "to have"는 올바른 부정사(to be creating, to be created, to have been)의 일부이므로 허용
    if (/to\s+(be|have)\b$/i.test(snippet)) {
      return { isValid: true };
    }
    return {
      isValid: false,
      errorMessage: `전치사 뒤에 "to + 동사원형"이 오는 형태("${snippet}")가 감지되었습니다. (예: "of to V") 이런 방식의 오류 생성은 금지입니다.`,
    };
  }

  // Explicit ban: "thought/idea of to V" (단, "to be" / "to have"는 부정사 보조이므로 제외)
  const thoughtOfTo = text.match(/\b(the\s+(thought|idea)\s+of)\s+to\s+([a-z]+)\b/gi);
  if (thoughtOfTo) {
    for (const phrase of thoughtOfTo) {
      const afterTo = phrase.replace(/.*\s+to\s+/i, '').trim().toLowerCase();
      if (afterTo !== 'be' && afterTo !== 'have') {
        return {
          isValid: false,
          errorMessage: `"the thought/idea of to V" 패턴이 감지되었습니다. (예: "${phrase.trim()}") 금지입니다.`,
        };
      }
    }
  }

  // "to + 동사ing" 비문 패턴 (예: to reinventing, to creating)
  // [a-z]{2,}ing: "sing"(to부정사)이 "s"+"ing"으로 오매칭되지 않도록 최소 2자 이상 후 "ing"만 매칭.
  const toPlusVingRe = /\bto\s+[a-z]{2,}ing\b/gi;
  let toPlusVingMatch: RegExpExecArray | null;
  const disallowed: Array<{ phrase: string; index: number; context: string }> = [];
  while ((toPlusVingMatch = toPlusVingRe.exec(text)) !== null) {
    const phrase = toPlusVingMatch[0].toLowerCase();
    const idx = toPlusVingMatch.index;
    const afterMatch = text.slice(idx + toPlusVingMatch[0].length);
    const beforeMatch = text.slice(Math.max(0, idx - 20), idx);
    // "to be reinventing" 등: to 다음이 "be"이면 [a-z]+ing 매칭이 "being"만 됨. "to reinventing"은 비문.
    if (phrase === 'to being') continue; // "to being" 가능한 맥락 있음
    // 전치사 to + 형용사 + 명사: "listen to mounting evidence", "according to leading experts" 등
    if (phrase === 'to mounting' && /\s+evidence\b/i.test(afterMatch)) continue;
    if (phrase === 'to leading' && /\s+(cause|experts?|sources?)\b/i.test(afterMatch)) continue;
    if (phrase === 'to following' && /\s+(day|week|year|examples?)\b/i.test(afterMatch)) continue;
    // 전치사 to + 동명사: "to determining (the) role", "to playing a role" 등 (determining은 문맥 무관 허용)
    if (phrase === 'to determining') continue;
    if (phrase === 'to playing' && /\s+(a\s+)?role\b/i.test(afterMatch)) continue;
    disallowed.push({
      phrase: toPlusVingMatch[0],
      index: idx,
      context: (beforeMatch + toPlusVingMatch[0] + afterMatch.slice(0, 30)).replace(/\s+/g, ' ').trim(),
    });
  }
  if (disallowed.length > 0) {
    const first = disallowed[0];
    const detail = `[실제 감지: "${first.phrase}" 위치 ${first.index}, 주변: "...${first.context}..."]`;
    return {
      isValid: false,
      errorMessage: `비문 "to + 동사ing" 패턴이 감지되었습니다. ${detail} to 부정사는 to be + 동사ing, to be + 과거분사로만 변형하세요.`,
    };
  }

  // 전치사 + 과거분사 단독 비문 (by reduced them, without tried it 등)
  // 전치사 뒤에는 동명사 또는 "being + V-ing/V-ed"만 올 수 있음.
  const prepPlusPastParticipleRe = /\b(by|without|before|after|with|through)\s+[a-z]+ed\s+(them|us|him|her|it|the|a|an)\b/gi;
  const prepPPMatch = text.match(prepPlusPastParticipleRe);
  if (prepPPMatch && prepPPMatch.length > 0) {
    return {
      isValid: false,
      errorMessage: `비문 "전치사 + 과거분사 단독" 패턴이 감지되었습니다. (예: "${prepPPMatch[0]}") 전치사(by/without 등) 뒤의 동명사(V-ing) 변형은 반드시 "being + 과거분사"로만 하세요.`,
    };
  }

  // "of be + V-ing" 비문 (전치사 of + 동사ing 변형 시 "of being + 과거분사"만 허용)
  const ofBeVingRe = /\bof\s+be\s+[a-z]+ing\b/gi;
  const ofBeVingMatch = text.match(ofBeVingRe);
  if (ofBeVingMatch && ofBeVingMatch.length > 0) {
    return {
      isValid: false,
      errorMessage: `비문 "of be + 동사ing" 패턴이 감지되었습니다. (예: "${ofBeVingMatch[0]}") 전치사 of + 동사ing 변형은 "of being + 과거분사"만 허용합니다. (예: of being looked)`,
    };
  }

  // "being + 현재분사" 비문 (by being reducing, of being looking — being + 과거분사만 허용)
  const beingPlusIngRe = /\bbeing\s+[a-z]{2,}ing\b/gi;
  let beingIngMatch: RegExpExecArray | null;
  while ((beingIngMatch = beingPlusIngRe.exec(text)) !== null) {
    const phrase = beingIngMatch[0].toLowerCase();
    if (phrase === 'being being') continue;
    return {
      isValid: false,
      errorMessage: `비문 "being + 동사ing" 패턴이 감지되었습니다. (예: "${beingIngMatch[0]}") 전치사(of/by 등)+동명사 변형은 "being + 과거분사"만 허용합니다. (being reducing, being looking 등 비문)`,
    };
  }

  // "didn't to V", "don't to V" 등 조동사 축약 + to 부정사 비문
  const auxToRe = /\b(didn't|don't|doesn't|won't|wouldn't|can't|couldn't|shouldn't|shan't|mightn't|mustn't|needn't|haven't|hasn't|hadn't|isn't|aren't|wasn't|weren't)\s+to\s+[a-z]+\b/gi;
  const auxToMatch = text.match(auxToRe);
  if (auxToMatch && auxToMatch.length > 0) {
    return {
      isValid: false,
      errorMessage: `비문 "조동사 + to + 동사" 패턴이 감지되었습니다. (예: "${auxToMatch[0]}") didn't mean, don't think 등을 "didn't to mean", "don't to think"로 변형하면 안 됩니다.`,
    };
  }

  // "like to / want to" 등 뒤의 to 부정사: "like be imagining" 비문 (to 누락)
  const likeWantBeRe = /\b(like|want|love|need|expect|prefer|hate|hope|wish)\s+be\s+[a-z]+(?:ing|ed)\b/gi;
  const likeWantBeMatch = text.match(likeWantBeRe);
  if (likeWantBeMatch && likeWantBeMatch.length > 0) {
    return {
      isValid: false,
      errorMessage: `비문 "like/want 등 + be V-ing/V-ed"(to 누락) 패턴이 감지되었습니다. (예: "${likeWantBeMatch[0]}") "like to imagine" 변형 시 "to"를 제거하면 안 되며, "like to be imagined"(수동태)로 변형하세요.`,
    };
  }

  return { isValid: true };
}

/**
 * 후보 단어 추출 시 제외 규칙 (work09/work10 호환용)
 * 금지 규칙과 동일한 방향의 짧은 요약.
 */
export const EXCLUDE_RULES_PROMPT = `**제외:** 조동사+동사원형, 규칙과거형(-ed), 3인칭-s/-es, 단순 단복수, 기본 관사(a/an/the), 단순 전치사, 초급 시제, be동사 단순형, 주어-동사 시제일치. **to 부정사 변형:** to+동사원형→to+동사ing(비문) 절대 금지. to 부정사는 **to be + 동사ing**, **to be + 과거분사**로만 변형. **전치사+동명사:** by/without/of 등 뒤 동사ing 변형 시 **by reduced**, **of be looking**, **being reducing**(비문) 금지. 반드시 **being + 과거분사**로만 변형(being+동사ing 비문). **주어+be동사:** 주어 다음 be동사(are, is 등)는 **be+V-ing**(예: be aring)로 변형 금지. **조동사+동사:** didn't/don't 등 뒤에 **to 부정사**(didn't to mean) 금지. to+to+동사원형 금지, 전치사+to부정사(of to V 등) 금지, 동명사(-ing)→to+동사원형 기계적 변형 금지. 주어-be동사 수일치 깨는 변형·존재하지 않는 단어 생성·대명사 기계적 교체 금지.`;
