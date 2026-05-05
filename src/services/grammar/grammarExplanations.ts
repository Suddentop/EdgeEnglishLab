/**
 * Grammer_Rule.md 기반 문법 설명 (학습교재용)
 * 유형#10 인쇄(정답) 페이지에서 틀린 단어별 문법 유형·설명·예시 표시
 */

export interface GrammarExplanation {
  koName: string;
  principle: string;
  whyWrong: string;
  examples: string[];
}

/**
 * 오류내용·핵심사항: Grammer_Rule.md의 정문법(올바른 문법)만 기술.
 * 문제생성 금지목록, 비문 예시, AI 변형 규칙 등은 포함하지 않음.
 */
export const GRAMMAR_EXPLANATIONS: Record<string, GrammarExplanation> = {
  'Subject-Verb Agreement (Far Subject)': {
    koName: '주어-동사 수 일치 (수식어구로 멀어진 주어)',
    principle: '수식어구(전치사구, 분사구, 관계사절)로 주어와 동사가 멀어져도 진짜 주어(핵명사)를 찾아 수를 일치시킨다. Most/Some/All/Half + of + 명사 → of 뒤 명사에 동사 수 일치. 상관접속사(Either A or B)는 근자일치(B에 일치).',
    whyWrong: '주어와 동사의 수를 일치시키는 것은 영문법의 기본 원칙이다. 수식어구에 있는 명사(전치사의 목적어, 분사구/관계사절 내 명사)는 주어가 아니므로, 핵명사를 정확히 찾아 동사와 수를 맞춘다.',
    examples: [
      'The collection [of rare books] was destroyed. (주어: collection, 단수)',
      'The students [participating in the experiment] are volunteers. (주어: students, 복수)',
      'The number of students is increasing. / A number of students are absent.'
    ]
  },
  'Relative Pronoun vs Relative Adverb': {
    koName: '관계대명사 vs 관계부사 (불완전/완전 문장)',
    principle: '관계대명사(who, which, that)는 접속사+대명사로, 뒤 문장이 불완전(주어/목적어/보어 역할). 관계부사(when, where, why, how)는 접속사+부사로, 뒤 문장이 구조적으로 완전해야 한다.',
    whyWrong: '관계대명사는 대명사 역할을 하므로 뒤에 주어나 목적어가 빠져 있어야 하고, 관계부사는 부사 역할이므로 뒤 문장이 완전해야 한다. 뒤 문장의 완전성 여부로 판별한다.',
    examples: [
      'This is the book [which I bought ___ yesterday]. (which=목적어, 불완전)',
      'This is the park [where I played soccer]. (where=부사, 완전)'
    ]
  },
  'Participle (Present vs Past)': {
    koName: '현재분사 vs 과거분사 (능동/수동 관계)',
    principle: '분사 자리에서 수식받는 명사와의 관계를 본다. 명사가 동작을 하면(능동) -ing, 동작을 당하면(수동) p.p. 분사구문은 의미상 주어=주절 주어, 주어가 행동 주체면 -ing, 대상이면 p.p.',
    whyWrong: '접속사 없는 문장에는 본동사가 하나뿐이다. 분사 자리라면 수식받는 명사와 능동/수동 관계를 확인한다. 자동사(occur, happen)는 수동태·과거분사 수식이 불가하다.',
    examples: [
      'The technology [used] in this car was developed... (수동→used)',
      '...fashion can strengthen agency, [opening] up space... (능동→opening)',
      '분사구문: 주절 주어를 분사 앞에 두고 "주어가 ~하는지/되는지" 해석'
    ]
  },
  'Gerund vs Infinitive': {
    koName: '동명사 vs 부정사 (목적어, 보어 자리)',
    principle: '전치사 뒤에는 명사 상당어구가 와야 하므로 동사가 오면 동명사(-ing)를 쓴다. look forward to, object to, devote to에서 to는 전치사이므로 뒤에 -ing. to 부정사는 미래/의도, 동명사는 과거/경험·일반 사실을 나타낸다.',
    whyWrong: '투부정사는 미래·계획·잠재성, 동명사는 과거·실제 경험·일반적 사실을 나타낸다. remember/forget/try/stop/regret/mean 등은 to V와 V-ing에서 의미가 달라지므로 문맥에 맞는 형태를 선택한다.',
    examples: [
      'He is good at playing piano. (전치사 뒤 → 동명사)',
      'I look forward to seeing you. (to는 전치사 → -ing)',
      'Remember to lock the door. (할 것 기억) / I remember locking the door. (했던 것 기억)'
    ]
  },
  'Parallel Structure': {
    koName: '병렬 구조 (등위접속사 앞뒤 형태)',
    principle: '등위접속사(and, but, or), 상관접속사(not only A but also B)로 연결된 요소는 문법적으로 대등한 형태여야 한다. A가 전치사구면 B도 전치사구, A가 부사면 B도 부사. 비교 구문에서도 비교 대상이 병렬되어야 한다.',
    whyWrong: '접속사 뒤 요소가 앞의 어떤 요소와 짝을 이루는지 파악한다. I want to buy a car and sell my bike → buy와 sell이 병렬. 병렬된 요소는 품사·구조가 일치해야 한다.',
    examples: [
      'He speaks not only correctly but also fluently. (부사-부사)',
      'Driving a car is easier than riding a motorcycle. (동명사-동명사)'
    ]
  },
  'Adjective vs Adverb': {
    koName: '형용사 vs 부사 (보어 자리 vs 수식어)',
    principle: '연결동사(be, become, seem, appear, look, smell, taste, sound, feel) 뒤 주격 보어에는 형용사가 온다. 5형식 동사(make, find, keep, consider)의 목적격 보어에도 형용사. 부사는 동사·형용사·부사·문장을 수식한다.',
    whyWrong: '형용사는 명사를 수식하고, 부사는 명사 이외를 수식한다. 보어 자리는 주어나 목적어의 상태를 설명하므로 형용사가 온다. The cake tastes sweet에서 sweet은 주어의 상태를 나타내는 주격 보어이다.',
    examples: [
      'The cake tastes sweet. (주격 보어)',
      'He looks happy. (주격 보어)',
      'You made me happy. (목적격 보어)'
    ]
  },
  'Voice (Active vs Passive)': {
    koName: '능동태 vs 수동태 (목적어 유무 등)',
    principle: '능격동사(open, sell, read, peel, cook)는 자동사로 쓰여도 수동 의미를 나타낼 수 있다. The door opened, The book sells well처럼 수동태 없이 수동 의미. 수동태 불가 자동사(happen, occur, consist of, appear, seem, remain)는 목적어가 없어 수동태가 불가능하다.',
    whyWrong: '목적어가 있으면 타동사로 수동태 가능. 목적어 없이 쓰이는 자동사는 수동태를 만들 수 없다. 능격동사는 자동사로 쓰일 때 "주어가 스스로 ~하다"는 의미로 수동과 유사한 뜻을 나타낸다.',
    examples: [
      'The accident happened. (자동사)',
      'The team consists of 5 members. (자동사)',
      'The book sells well. (능격—수동태 아님)'
    ]
  },
  'Preposition + Relative Pronoun': {
    koName: '전치사+관계대명사 (완전한 문장)',
    principle: '관계부사 = 전치사 + 관계대명사 (where = in/at which). in which, at which, for which 뒤에는 완전한 문장이 온다. which 단독은 뒤가 불완전할 때 쓰이고, 뒤가 완전하면 전치사+which가 필요하다.',
    whyWrong: '밑줄이 which일 때 뒤 문장이 완전하면 전치사가 필요하다. "honey is blended"는 주어+동사로 완전하므로 which 대신 in which 또는 where를 써야 한다.',
    examples: [
      'This is the house [in which] he lives. (완전)',
      '관계부사 where = in/at which (뒤 완전)'
    ]
  },
  'Indirect Question Word Order': {
    koName: '간접의문문 어순',
    principle: '의문문이 명사절로 들어갈 때 어순은 평서문(주어+동사)으로 바뀐다. Where is he? → I don\'t know [where he is]. 주절 동사가 think, believe, guess일 때 Wh-가 문두로 나가는 Wh-이동이 적용된다.',
    whyWrong: '직접의문문은 동사+주어이나, 간접의문문은 주어+동사 순이다. Do you think [where he is]?는 의문사가 갇혀 있어 부자연스러우며, Where do you think [he is]?가 올바른 형태이다.',
    examples: [
      'I don\'t know where he is. (평서문 어순)',
      'Where do you think he is? (Wh-이동)'
    ]
  },
  'Subjunctive Mood': {
    koName: '가정법 (과거, 과거완료, 혼합)',
    principle: '가정법 과거: If I were you → Were I you (도치). 가정법 과거완료: If I had known → Had I known. 미래: If you should need → Should you need. 혼합 가정법은 "과거에 ~했더라면 지금 ~할 텐데"처럼 시점이 섞인다.',
    whyWrong: 'If 생략 시 주어와 조동사 위치를 바꾼다. 과거 사실 반대는 과거형(were), 과거 완료 사실 반대는 had p.p.를 쓰고, 주절은 would/could/might + 동사원형 또는 would have p.p.로 시제를 맞춘다.',
    examples: [
      'Were I you, I would go. (가정법 과거 도치)',
      'Had I known the truth, I would have told you.',
      'If I had studied harder then, I would be a doctor now. (혼합)'
    ]
  }
};

/** 문법 유형에 해당하는 설명 반환 */
export function getGrammarExplanation(grammarType: string): GrammarExplanation | null {
  if (!grammarType || !grammarType.trim()) return null;
  const t = grammarType.trim();
  if (GRAMMAR_EXPLANATIONS[t]) return GRAMMAR_EXPLANATIONS[t];
  const key = Object.keys(GRAMMAR_EXPLANATIONS).find(k => t.includes(k) || k.includes(t));
  return key ? GRAMMAR_EXPLANATIONS[key] : null;
}
