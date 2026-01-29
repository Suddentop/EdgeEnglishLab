/**
 * 난이도별 프로필 (high2 / high3 / csat)
 * 허용 오류 타입 + 우선순위(weights) 지정.
 */

export type Difficulty = 'high2' | 'high3' | 'csat';

export type ErrorType =
  | 'SV_agreement'
  | 'parallelism'
  | 'relative_clause'
  | 'pronoun_reference'
  | 'modifier'
  | 'tense_logic'
  | 'voice_consistency';

export interface DifficultyProfile {
  difficulty: Difficulty;
  allowedErrorTypes: ErrorType[];
  /** Higher weight => more preferred by the model */
  weights: Record<ErrorType, number>;
  disallowTrivialErrors: boolean;
  requireClauseLevelCheck: boolean;
}

export const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  high2: {
    difficulty: 'high2',
    allowedErrorTypes: ['SV_agreement', 'parallelism', 'relative_clause', 'tense_logic'],
    weights: {
      SV_agreement: 4,
      parallelism: 3,
      relative_clause: 2,
      tense_logic: 2,
      pronoun_reference: 1,
      modifier: 1,
      voice_consistency: 1,
    },
    disallowTrivialErrors: true,
    requireClauseLevelCheck: true,
  },
  high3: {
    difficulty: 'high3',
    allowedErrorTypes: ['parallelism', 'relative_clause', 'pronoun_reference', 'modifier', 'tense_logic'],
    weights: {
      parallelism: 4,
      relative_clause: 3,
      pronoun_reference: 3,
      modifier: 3,
      tense_logic: 2,
      SV_agreement: 2,
      voice_consistency: 1,
    },
    disallowTrivialErrors: true,
    requireClauseLevelCheck: true,
  },
  csat: {
    difficulty: 'csat',
    allowedErrorTypes: ['modifier', 'pronoun_reference', 'parallelism', 'tense_logic', 'relative_clause'],
    weights: {
      modifier: 4,
      pronoun_reference: 4,
      parallelism: 3,
      tense_logic: 3,
      relative_clause: 3,
      SV_agreement: 2,
      voice_consistency: 2,
    },
    disallowTrivialErrors: true,
    requireClauseLevelCheck: true,
  },
};

/** 난이도 기본값 (work09/work10 호환) */
export const DEFAULT_GRAMMAR_DIFFICULTY: Difficulty = 'csat';

/**
 * 난이도에 맞는 허용 오류 유형 목록을 프롬프트용 문자열로 반환 (work09/work10 호환)
 */
export function getDifficultyErrorListPrompt(difficulty: Difficulty = DEFAULT_GRAMMAR_DIFFICULTY): string {
  const profile = DIFFICULTY_PROFILES[difficulty] ?? DIFFICULTY_PROFILES.csat;
  const list = profile.allowedErrorTypes.join(', ');
  return `**Select ONE error type from the allowed list for the given difficulty (${difficulty}).** Allowed error types for this difficulty: ${list}.`;
}
