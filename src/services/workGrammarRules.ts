/**
 * 유형#09와 유형#10 공통 어법 변형 금지 규칙
 * 이 파일은 두 유형에서 공통으로 사용되는 금지 규칙과 검증 로직을 정의합니다.
 */

/**
 * 금지된 변형 규칙을 설명하는 프롬프트 텍스트
 */
export const FORBIDDEN_TRANSFORMATIONS_PROMPT = `
**ABSOLUTELY FORBIDDEN:**
- Transforming to a completely unrelated word (e.g., "though" → "thought" is FORBIDDEN - they are completely different words)
- Spelling errors that create a different word (e.g., "though" → "thought" is a spelling error that creates a different word, NOT a grammar error)
- Transformations that create unrelated words from different word families
- **🚨 CRITICAL: Adding "-ing" to modal verbs is ABSOLUTELY FORBIDDEN** (e.g., "could" → "coulding", "should" → "shoulding", "would" → "woulding" are FORBIDDEN - these words do not exist in English)
- **Modal verb transformations:** You CAN swap modal verbs with each other (e.g., "could" → "should" or "would" → "could" is ALLOWED), but you CANNOT add "-ing" to them
- **🚨 CRITICAL: Creating non-existent words by adding "-ly" to adverbs/conjunctions/wh-words is ABSOLUTELY FORBIDDEN** (e.g., "however" → "howeverly", "rather" → "ratherly", "what" → "whatly", "why" → "whyly", "where" → "wherely", "how" → "howly", "whatever" → "whateverly" are FORBIDDEN - these words do not exist in English and are never used. "however", "rather", "what", "why", "where", "how", "whatever" are already adverbs/conjunctions/wh-words and cannot be made into adverbs again)
- **🚨 CRITICAL: Transforming subject pronouns to possessive forms is ABSOLUTELY FORBIDDEN** (e.g., "it" → "its", "they" → "their", "he" → "his", "she" → "her", "I" → "my", "you" → "your", "this" → "this's" (doesn't exist), "that" → "that's" (contraction, not possessive), "those" → "those's" (doesn't exist), "these" → "these's" (doesn't exist) when used as subjects are FORBIDDEN - these are too simple and mechanical transformations)
- **🚨 CRITICAL: Transforming subject pronouns to other subject pronouns is ABSOLUTELY FORBIDDEN** (e.g., "they" → "those", "this" → "that", "these" → "those", "I" → "you", "he" → "she" are FORBIDDEN - these are simple pronoun swaps, not grammar errors)
- **🚨 CRITICAL: Breaking subject-verb agreement with be-verbs is ABSOLUTELY FORBIDDEN** (e.g., "they are" → "they am", "I am" → "I is", "you are" → "you am", "he is" → "he am", "she is" → "she am", "that is" → "that are", "this is" → "this am" are FORBIDDEN - these break basic subject-verb agreement). **ALLOWED:** Tense changes like "is" → "was", "are" → "were" are allowed, but number agreement must be maintained.
- **🚨 CRITICAL: Simple be-verb to "being" transformations are ABSOLUTELY FORBIDDEN** (e.g., "is" → "being", "are" → "being", "was" → "being", "were" → "being", "there is" → "there being", "there are" → "there being", "Language is" → "Language being" are FORBIDDEN - these are too simple and mechanical transformations that don't create meaningful grammar errors). **ALLOWED:** Tense changes like "is" → "was", "are" → "were" are allowed, but changing to "being" is FORBIDDEN.
- **🚨 CRITICAL: Subject + Verb to Subject + Verb-ing (without be-verb) is ABSOLUTELY FORBIDDEN** (e.g., "they work" → "they working", "they rely" → "they relying", "it consist" → "it consisting" are FORBIDDEN - this creates an ungrammatical structure - the verb needs a be-verb helper). **ALLOWED:** "they work" → "they are working" is ALLOWED (be-verb + verb-ing is correct), but "they work" → "they working" is FORBIDDEN.
- **🚨 CRITICAL: "to + 동사원형" → "to + 동사ing" 변형은 절대 금지** (e.g., "to continue" → "to continuing", "to rely" → "to relying", "to fill" → "to filling" are ABSOLUTELY FORBIDDEN - this pattern does not exist in English). **✅ ALLOWED infinitive transformations:** "to + 동사원형" → "동사+ing" (e.g., "to continue" → "continuing" is ALLOWED), "to + 동사원형" → "to be + 과거분사" (e.g., "to continue" → "to be continued" is ALLOWED), "to + 동사원형" → "to be + 동사ing" (e.g., "to continue" → "to be continuing" is ALLOWED), "to + 동사원형" → "to have been + 과거분사" (e.g., "to continue" → "to have been continued" is ALLOWED).
- **🚨 CRITICAL: Selecting coordinating conjunctions (or, and, but, nor, for, so, yet) for grammar transformation is ABSOLUTELY FORBIDDEN** (e.g., "or" → "and", "and" → "or", "but" → "and" are FORBIDDEN - these are simple word swaps, not meaningful grammar errors that require interpretation or judgment).
- **🚨 CRITICAL: Breaking basic grammar rules when transforming words after modal verbs is ABSOLUTELY FORBIDDEN** (e.g., "can prey" → "can praying" is FORBIDDEN - this breaks the basic rule that modal verbs must be followed by the base form of the verb. **ALLOWED:** "can prey" → "can be preying" is ALLOWED (modal + be + v-ing is correct), but "can prey" → "can praying" is FORBIDDEN. Similarly, "can rely" → "can relying", "can consist" → "can consisting", "can fill" → "can filling" are FORBIDDEN. **CRITICAL:** When transforming a verb that comes after a modal verb, you MUST maintain the modal + base verb structure. You can transform it to "modal + be + v-ing" or "modal + have + p.p" or swap modals, but you CANNOT simply change the base verb to v-ing form).
`;

/**
 * FORBIDDEN Examples 섹션용 프롬프트 텍스트
 */
export const FORBIDDEN_EXAMPLES_PROMPT = `
**❌ FORBIDDEN Examples (DO NOT DO THIS):**
- **Unrelated Words:** "though" → "thought" is FORBIDDEN (they are completely different words: "though" = conjunction/adverb, "thought" = noun/verb from "think")
- **Different Word Families:** Transforming to words from completely different word families
- **Spelling Errors:** Simple spelling changes that create unrelated words
- **Modal Verb + ing:** "could" → "coulding" is FORBIDDEN (this word does not exist in English). You CAN swap modals (e.g., "could" → "should" or "would" → "could"), but you CANNOT add "-ing" to modal verbs.
- **Subject Pronoun to Possessive:** "it" → "its" is FORBIDDEN when "it" is used as a subject (e.g., "it can indicate" → "its can indicate" is FORBIDDEN - this is too simple and mechanical). Similarly, "they" → "their", "he" → "his", "she" → "her", "I" → "my", "you" → "your", "this" → "this's" (doesn't exist), "that" → "that's" (contraction, not possessive), "those" → "those's" (doesn't exist), "these" → "these's" (doesn't exist) when used as subjects are FORBIDDEN.
- **Subject Pronoun to Other Subject Pronoun:** "they" → "those" is FORBIDDEN (e.g., "they had been" → "those had been" is FORBIDDEN - this is a simple pronoun swap, not a grammar error). Similarly, "this" → "that", "these" → "those", "I" → "you", "he" → "she" are FORBIDDEN. These are simple pronoun substitutions, not meaningful grammar errors.
- **Subject-Be-Verb Agreement Breaking:** "they are" → "they am" is FORBIDDEN (e.g., "they are" → "they am" breaks subject-verb agreement). Similarly, "I am" → "I is", "you are" → "you am", "he is" → "he am", "she is" → "she am", "that is" → "that are", "this is" → "this am" are FORBIDDEN. **ALLOWED:** Tense changes like "is" → "was", "are" → "were" are allowed, but number agreement must be maintained (e.g., "they are" → "they were" is ALLOWED, but "they are" → "they am" is FORBIDDEN).
- **Simple Be-Verb to "being" Transformations:** "is" → "being" is FORBIDDEN (e.g., "there is" → "there being", "it is" → "it being" are FORBIDDEN - these are too simple and mechanical). Similarly, "are" → "being", "was" → "being", "were" → "being" are FORBIDDEN. These transformations don't create meaningful grammar errors.
- **Subject + Verb to Subject + Verb-ing (without be-verb):** "they work" → "they working" is FORBIDDEN (e.g., "they work" → "they working", "they rely" → "they relying", "it consist" → "it consisting" create an ungrammatical structure - the verb needs a be-verb helper). **ALLOWED:** "they work" → "they are working" is ALLOWED (be-verb + verb-ing is correct), but "they work" → "they working" is FORBIDDEN.
- **"to + 동사원형" → "to + 동사ing" 변형:** "to continue" → "to continuing" is FORBIDDEN (e.g., "to rely" → "to relying", "to fill" → "to filling" are FORBIDDEN - this pattern does not exist in English). **✅ ALLOWED:** "to continue" → "continuing" (to 제거), "to continue" → "to be continuing", "to continue" → "to have been continued" are ALLOWED.
- **Coordinating Conjunctions Selection:** Selecting "or", "and", "but", "nor", "for", "so", "yet" for grammar transformation is FORBIDDEN (e.g., "or" → "and", "and" → "or" are FORBIDDEN - these are simple word swaps, not meaningful grammar errors that require interpretation or judgment).
- **Breaking Basic Grammar Rules After Modal Verbs:** "can prey" → "can praying" is FORBIDDEN (e.g., "can prey" → "can praying" breaks the basic rule that modal verbs must be followed by the base form of the verb). Similarly, "can rely" → "can relying", "can consist" → "can consisting", "can fill" → "can filling" are FORBIDDEN. **CRITICAL:** When transforming a verb that comes after a modal verb, you MUST maintain the modal + base verb structure. **ALLOWED:** "can prey" → "can be preying" is ALLOWED (modal + be + v-ing is correct), "can prey" → "can have preyed" is ALLOWED (modal + have + p.p is correct), or you can swap modals (e.g., "can prey" → "should prey", "may prey" → "might prey"). But you CANNOT simply change the base verb to v-ing form without a be-verb helper.
- **Creating Non-Existent Words:** "however" → "howeverly" is FORBIDDEN (e.g., "however" → "howeverly" creates a word that does not exist in English). Similarly, "rather" → "ratherly", "what" → "whatly", "why" → "whyly", "where" → "wherely", "how" → "howly", "whatever" → "whateverly" are FORBIDDEN. **CRITICAL:** You MUST NOT create words that do not exist in English by adding "-ly" to words that are already adverbs/conjunctions/wh-words. "however", "rather", "what", "why", "where", "how", "whatever" are already adverbs/conjunctions/wh-words and cannot be made into adverbs again. These words ("whatly", "whyly", "wherely", "howly", "whateverly", "howeverly") are never used in English and must not be created.
`;

/**
 * 후보 단어 추출 프롬프트용 제외 규칙 텍스트
 */
export const EXCLUDE_RULES_PROMPT = `**제외:** 조동사+동사원형, 규칙과거형(-ed), 3인칭-s/-es(동사원형+-s/-es), 단순 단복수, 기본 관사(a/an/the), 단순 전치사, 초급 시제, be동사 단순형(it was/were, they was/were 등), 주어-동사 시제일치(1인칭/2인칭+동사원형, 3인칭+동사원형+s/-es), 고유명사, **🚨 to 부정사 단순 변형 절대 금지**(to+동사원형 → to+동사ing, 예: to rely → to relying, to fill → to filling 등 - 이 패턴은 영어에 존재하지 않음), **🚨 주어-be동사 수일치 깨는 변형 절대 금지**(they are → they am, I am → I is, you are → you am, he is → he am, she is → she am, that is → that are, this is → this am 등 - 시제 변경은 허용되지만 수일치는 유지되어야 함), **🚨 존재하지 않는 단어 생성 절대 금지**(however → howeverly, rather → ratherly, what → whatly, why → whyly, where → wherely, how → howly, whatever → whateverly 등 - 이미 부사/접속사/wh-단어인 단어에 "-ly"를 추가하는 것은 금지. 이런 단어들(whatly, whyly, wherely, howly, whateverly, howeverly)은 영어에 존재하지 않고 사용되지도 않으므로 억지로 만들지 말 것), **🚨 주어 대명사를 다른 주어 대명사로 변형 절대 금지**(they → those, this → that, these → those, I → you, he → she 등 - 단순한 대명사 교체는 의미 있는 문법 오류가 아님), **🚨 be동사를 단순히 "being"으로 변형 절대 금지**(is → being, are → being, there is → there being, Language is → Language being 등 - 너무 단순하고 기계적인 변형), **🚨 일반동사를 주어+동사ing로 변경 절대 금지**(work → working, rely → relying, consist → consisting 등 - 주어+동사ing 구조는 be동사가 필요함. "they work" → "they are working"는 허용되지만 "they work" → "they working"는 금지), **🚨 조동사 다음 동사를 단순히 동사ing로 변형 절대 금지**(can prey → can praying, can rely → can relying, can consist → can consisting 등 - 조동사 다음에는 동사원형이 와야 하는 기본 어법을 무시함. "can prey" → "can be preying"는 허용되지만 "can prey" → "can praying"는 금지), **🚨 등위접속사 선택 절대 금지**(or, and, but, nor, for, so, yet 등 - 단순한 단어 교체이며 의미 있는 문법 오류가 아님)`;

/**
 * 코드 레벨 검증 함수들
 */

/**
 * 변형된 단어가 금지된 패턴인지 검증
 * @param originalWord 원본 단어
 * @param transformedWord 변형된 단어
 * @returns { isValid: boolean, errorMessage?: string } 검증 결과
 */
export function validateTransformation(
  originalWord: string,
  transformedWord: string
): { isValid: boolean; errorMessage?: string } {
  const original = originalWord.toLowerCase().trim();
  const transformed = transformedWord.toLowerCase().trim();

  // 1. 조동사+ing 패턴 검증
  const modalVerbs = ['could', 'should', 'would', 'can', 'may', 'might', 'must', 'will', 'shall'];
  const forbiddenModalIng = modalVerbs.some(modal => {
    const modalIng = modal + 'ing';
    return transformed === modalIng || transformed.startsWith(modalIng + ' ');
  });
  
  if (forbiddenModalIng) {
    return {
      isValid: false,
      errorMessage: `조동사에 "-ing"를 붙인 변형("${transformedWord}")은 절대 금지됩니다. 조동사는 서로 교체할 수 있지만 "-ing"를 붙일 수 없습니다.`
    };
  }

  // 2. 부사/접속사/wh-단어에 "-ly"를 부적절하게 추가하는 패턴 검증
  const forbiddenAdverbLyPatterns = [
    { base: 'however', forbidden: 'howeverly' },
    { base: 'rather', forbidden: 'ratherly' },
    { base: 'nevertheless', forbidden: 'neverthelessly' },
    { base: 'moreover', forbidden: 'moreoverly' },
    { base: 'furthermore', forbidden: 'furthermorely' },
    { base: 'therefore', forbidden: 'thereforely' },
    { base: 'thus', forbidden: 'thusly' },
    { base: 'what', forbidden: 'whatly' },
    { base: 'why', forbidden: 'whyly' },
    { base: 'where', forbidden: 'wherely' },
    { base: 'how', forbidden: 'howly' },
    { base: 'whatever', forbidden: 'whateverly' },
  ];
  
  const forbiddenAdverbLy = forbiddenAdverbLyPatterns.some(pattern => 
    original === pattern.base && transformed === pattern.forbidden
  );
  
  if (forbiddenAdverbLy) {
    const pattern = forbiddenAdverbLyPatterns.find(p => 
      original === p.base && transformed === p.forbidden
    );
    return {
      isValid: false,
      errorMessage: `부사/접속사/wh-단어에 "-ly"를 부적절하게 추가한 변형("${originalWord}" → "${transformedWord}")은 절대 금지됩니다. "${pattern?.base}"는 이미 부사/접속사/wh-단어이므로 "-ly"를 추가할 수 없습니다. "${transformedWord}"는 영어에 존재하지 않고 사용되지도 않는 단어입니다.`
    };
  }

  // 3. 주어 대명사를 소유격으로 변형하는 것 금지
  const subjectToPossessivePairs = [
    ['it', 'its'], ['its', 'it'],
    ['they', 'their'], ['their', 'they'],
    ['he', 'his'], ['his', 'he'],
    ['she', 'her'], ['her', 'she'],
    ['we', 'our'], ['our', 'we'],
    ['you', 'your'], ['your', 'you'],
    ['i', 'my'], ['my', 'i'],
    ['this', 'this\'s'], ['this\'s', 'this'],
    ['that', 'that\'s'], ['that\'s', 'that'],
    ['those', 'those\'s'], ['those\'s', 'those'],
    ['these', 'these\'s'], ['these\'s', 'these']
  ];
  
  const isSubjectToPossessive = subjectToPossessivePairs.some(pair => 
    (pair[0] === original && pair[1] === transformed) ||
    (pair[1] === original && pair[0] === transformed)
  );
  
  if (isSubjectToPossessive) {
    return {
      isValid: false,
      errorMessage: `주어 대명사를 소유격으로 변형("${originalWord}" → "${transformedWord}")은 절대 금지됩니다. 이는 너무 단순하고 기계적인 변형입니다.`
    };
  }

  // 4. 주어 대명사를 다른 주어 대명사로 변형하는 것 금지
  const subjectToSubjectPairs = [
    ['they', 'those'], ['those', 'they'],
    ['this', 'that'], ['that', 'this'],
    ['these', 'those'], ['those', 'these'],
    ['i', 'you'], ['you', 'i'],
    ['he', 'she'], ['she', 'he']
  ];
  
  const isSubjectToSubject = subjectToSubjectPairs.some(pair => 
    (pair[0] === original && pair[1] === transformed) ||
    (pair[1] === original && pair[0] === transformed)
  );
  
  if (isSubjectToSubject) {
    return {
      isValid: false,
      errorMessage: `주어 대명사를 다른 주어 대명사로 변형("${originalWord}" → "${transformedWord}")은 절대 금지됩니다. 이는 단순한 대명사 교체이며 의미 있는 문법 오류가 아닙니다.`
    };
  }

  // 5. be동사를 단순히 "being"으로 변형하는 것 금지
  const beVerbsToBeing = ['is', 'are', 'was', 'were', 'am', 'be'];
  const originalIsBeVerbForBeing = beVerbsToBeing.includes(original);
  const transformedIsBeing = transformed === 'being';
  
  if (originalIsBeVerbForBeing && transformedIsBeing) {
    return {
      isValid: false,
      errorMessage: `be동사를 단순히 "being"으로 변형("${originalWord}" → "${transformedWord}")은 절대 금지됩니다. 이는 너무 단순하고 기계적인 변형이며 의미 있는 문법 오류를 만들지 않습니다.`
    };
  }

  // 6. 일반동사를 주어+동사ing로 변경하는 것 금지 (be동사 없이)
  const commonVerbs = ['work', 'go', 'come', 'do', 'make', 'take', 'get', 'give', 'see', 'know', 'think', 'say', 'tell', 'find', 'leave', 'call', 'try', 'ask', 'need', 'want', 'use', 'help', 'play', 'run', 'move', 'like', 'live', 'believe', 'bring', 'happen', 'write', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'raise', 'pass', 'sell', 'decide', 'return', 'explain', 'develop', 'carry', 'break', 'receive', 'agree', 'support', 'hit', 'produce', 'eat', 'cover', 'catch', 'draw', 'choose', 'rely', 'consist', 'fill', 'prey'];
  const originalIsVerb = commonVerbs.includes(original);
  const transformedIsVerbIng = commonVerbs.some(verb => transformed === verb + 'ing');
  
  // 일반동사가 be동사 없이 동사ing로 변경되는 것 금지 (예: rely → relying, consist → consisting, fill → filling)
  if (originalIsVerb && transformedIsVerbIng && !original.startsWith('to ')) {
    return {
      isValid: false,
      errorMessage: `일반동사를 주어+동사ing로 변경("${originalWord}" → "${transformedWord}")은 절대 금지됩니다. 주어+동사ing 구조는 be동사가 필요합니다. "they ${originalWord}" → "they are ${transformedWord}"는 허용되지만, "they ${originalWord}" → "they ${transformedWord}"는 금지됩니다.`
    };
  }

  // 7. 주어-be동사 수일치 깨는 변형 금지
  const beVerbs = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];
  const originalIsBeVerbForAgreement = beVerbs.includes(original);
  const transformedIsBeVerb = beVerbs.includes(transformed);
  
  if (originalIsBeVerbForAgreement && transformedIsBeVerb) {
    const forbiddenPatterns = [
      { original: 'are', transformed: 'am', description: '복수 주어 + 단수 be동사 (they are → they am)' },
      { original: 'is', transformed: 'am', description: '단수 주어 + 1인칭 be동사 (he is → he am)' },
      { original: 'is', transformed: 'are', description: '단수 주어 + 복수 be동사 (he is → he are)' },
      { original: 'am', transformed: 'is', description: '1인칭 주어 + 3인칭 단수 be동사 (I am → I is)' },
      { original: 'am', transformed: 'are', description: '1인칭 주어 + 복수 be동사 (I am → I are)' },
      { original: 'are', transformed: 'is', description: '복수 주어 + 단수 be동사 (they are → they is)' }
    ];
    
    const isForbiddenPattern = forbiddenPatterns.some(pattern => 
      pattern.original === original && pattern.transformed === transformed
    );
    
    if (isForbiddenPattern) {
      const pattern = forbiddenPatterns.find(p => 
        p.original === original && p.transformed === transformed
      );
      return {
        isValid: false,
        errorMessage: `주어-be동사 수일치를 깨는 변형("${originalWord}" → "${transformedWord}")은 절대 금지됩니다. 시제 변경은 허용되지만 수일치는 유지되어야 합니다.`
      };
    }
  }

  // 8. 완전히 다른 단어인지 확인
  const unrelatedWordPairs = [
    ['though', 'thought'], ['thought', 'though'],
    ['through', 'thorough'], ['thorough', 'through'],
    ['whether', 'weather'], ['weather', 'whether'],
    ['desert', 'dessert'], ['dessert', 'desert'],
    ['principal', 'principle'], ['principle', 'principal'],
  ];
  
  const isUnrelated = unrelatedWordPairs.some(pair => 
    (pair[0] === original && pair[1] === transformed) ||
    (pair[1] === original && pair[0] === transformed)
  );
  
  if (isUnrelated) {
    return {
      isValid: false,
      errorMessage: `변형된 단어("${transformedWord}")가 원본 단어("${originalWord}")와 전혀 다른 단어입니다. 문법적으로 관련된 단어여야 합니다.`
    };
  }

  // 9. "to + 동사ing" 패턴 검증 (to 부정사 단순 변형 금지)
  const toInfinitivePattern = /^to\s+[a-z]+ing$/i;
  if (toInfinitivePattern.test(transformedWord)) {
    const originalToPattern = /^to\s+[a-z]+$/i;
    if (originalToPattern.test(originalWord)) {
      return {
        isValid: false,
        errorMessage: `"to + 동사원형" → "to + 동사ing" 변형("${originalWord}" → "${transformedWord}")은 절대 금지됩니다. "to + 동사ing" 패턴은 영어에 존재하지 않습니다.`
      };
    }
  }

  // 10. 등위접속사 선택 금지 (or, and, but, nor, for, so, yet)
  const coordinatingConjunctions = ['or', 'and', 'but', 'nor', 'for', 'so', 'yet'];
  const originalIsConjunction = coordinatingConjunctions.includes(original);
  const transformedIsConjunction = coordinatingConjunctions.includes(transformed);
  
  if (originalIsConjunction || transformedIsConjunction) {
    // 등위접속사가 원본이거나 변형된 단어인 경우 금지
    if (originalIsConjunction && transformedIsConjunction) {
      return {
        isValid: false,
        errorMessage: `등위접속사("${originalWord}" → "${transformedWord}")를 선택하여 어법 변형 문제를 만드는 것은 절대 금지됩니다. 이는 단순한 단어 교체이며 의미 있는 문법 오류가 아닙니다.`
      };
    }
    // 등위접속사가 원본인 경우 (변형 여부와 관계없이 금지)
    if (originalIsConjunction) {
      return {
        isValid: false,
        errorMessage: `등위접속사("${originalWord}")를 선택하여 어법 변형 문제를 만드는 것은 절대 금지됩니다. 등위접속사는 단순한 단어 교체이며 의미 있는 문법 오류를 만들지 않습니다.`
      };
    }
  }

  // 11. 조동사 다음 동사를 단순히 동사ing로 변형하는 것 금지 (기본 어법 무시)
  // 조동사(can, could, should, would, may, might, must, will, shall) 다음에는 동사원형이 와야 함
  // "can prey" → "can praying" 같은 변형은 기본 어법을 무시함
  // 허용: "can prey" → "can be preying" (조동사 + be + v-ing)
  // 금지: "can prey" → "can praying" (조동사 + v-ing)
  const modalVerbsForContext = ['can', 'could', 'should', 'would', 'may', 'might', 'must', 'will', 'shall'];
  const originalIsVerbAfterModal = commonVerbs.includes(original) && !original.startsWith('to ');
  const transformedIsVerbIngAfterModal = commonVerbs.some(verb => transformed === verb + 'ing');
  
  // 원본이 동사원형이고 변형이 동사ing 형태인 경우, 조동사 다음에 사용될 가능성이 높음
  // 이 경우 기본 어법(조동사 + 동사원형)을 무시한 변형일 수 있음
  // 단, "to + 동사" 형태는 이미 검증했으므로 제외
  if (originalIsVerbAfterModal && transformedIsVerbIngAfterModal) {
    // "prey" → "praying", "rely" → "relying", "consist" → "consisting" 같은 패턴
    // 이는 조동사 다음에 사용될 경우 "can praying" 같은 잘못된 구조를 만듦
    return {
      isValid: false,
      errorMessage: `조동사 다음 동사를 단순히 동사ing로 변형("${originalWord}" → "${transformedWord}")은 절대 금지됩니다. 조동사 다음에는 동사원형이 와야 하는 기본 어법을 무시합니다. "can ${originalWord}" → "can be ${transformedWord}"는 허용되지만, "can ${originalWord}" → "can ${transformedWord}"는 금지됩니다.`
    };
  }

  return { isValid: true };
}
