/**
 * 유형#09·유형#10 공통 어법 규칙 — 배럴
 * 실제 정의는 grammar/ 아래 모듈. 재내보내기만 함.
 *
 * grammar/
 *  ├─ forbiddenRules.ts   (금지 규칙 + validateTransformation + validatePassageForForbiddenPatterns)
 *  ├─ preferredPatterns.ts (PREFERRED_PATTERNS_PROMPT)
 *  ├─ difficultyProfiles.ts (DIFFICULTY_PROFILES, Difficulty, ErrorType)
 *  ├─ candidateSelection.ts (CANDIDATE_SELECTION_PROMPT, scoreCandidate, scoreCandidateSet, minCandidateSetScore)
 *  └─ finalPromptBuilder.ts (위 4개 조합 + validateGeneratedItem, buildGrammarItemPrompts)
 */

export {
  FORBIDDEN_TRANSFORMATIONS_PROMPT,
  FORBIDDEN_EXAMPLES_PROMPT,
  EXCLUDE_RULES_PROMPT,
  validateTransformation,
  validatePassageForForbiddenPatterns,
  PREFERRED_PATTERNS_PROMPT,
  PREFERRED_ERROR_PATTERNS,
  CANDIDATE_SELECTION_PROMPT,
  CANDIDATE_SELECTION_RULES,
  DIFFICULTY_PROFILES,
  DEFAULT_GRAMMAR_DIFFICULTY,
  getDifficultyErrorListPrompt,
  scoreCandidate,
  scoreCandidateSet,
  minCandidateSetScore,
  buildGrammarItemPrompts,
  validateGeneratedItem,
  isAllowedErrorType,
} from './grammar/finalPromptBuilder';

export type {
  ValidationResult,
  Difficulty,
  ErrorType,
  DifficultyProfile,
  BuildPromptInput,
  BuiltPrompts,
} from './grammar/finalPromptBuilder';
export type { GrammarDifficulty } from './grammar/finalPromptBuilder';
