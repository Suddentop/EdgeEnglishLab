/**
 * 위 4개 모듈을 조합 — 최종 system/user 프롬프트 + 생성 결과 검증(후처리)
 */

import {
  FORBIDDEN_TRANSFORMATIONS_PROMPT,
  FORBIDDEN_EXAMPLES_PROMPT,
  validatePassageForForbiddenPatterns,
  validateTransformation,
} from './forbiddenRules';
import { PREFERRED_PATTERNS_PROMPT } from './preferredPatterns';
import { CANDIDATE_SELECTION_PROMPT } from './candidateSelection';
import { DIFFICULTY_PROFILES, type Difficulty, type ErrorType } from './difficultyProfiles';

// Re-exports for backward compat & direct use
export {
  FORBIDDEN_TRANSFORMATIONS_PROMPT,
  FORBIDDEN_EXAMPLES_PROMPT,
  EXCLUDE_RULES_PROMPT,
  validateTransformation,
  validatePassageForForbiddenPatterns,
  type ValidationResult,
} from './forbiddenRules';
export { PREFERRED_PATTERNS_PROMPT } from './preferredPatterns';
export {
  DIFFICULTY_PROFILES,
  DEFAULT_GRAMMAR_DIFFICULTY,
  getDifficultyErrorListPrompt,
  type Difficulty,
  type ErrorType,
  type DifficultyProfile,
} from './difficultyProfiles';
/** work09/work10 호환: Difficulty와 동일 */
export type { Difficulty as GrammarDifficulty } from './difficultyProfiles';
export {
  CANDIDATE_SELECTION_PROMPT,
  scoreCandidate,
  scoreCandidateSet,
  minCandidateSetScore,
} from './candidateSelection';

/** work09/work10 호환: 동일 내용 별칭 */
export { PREFERRED_PATTERNS_PROMPT as PREFERRED_ERROR_PATTERNS } from './preferredPatterns';
export { CANDIDATE_SELECTION_PROMPT as CANDIDATE_SELECTION_RULES } from './candidateSelection';

export interface BuildPromptInput {
  passage: string;
  difficulty: Difficulty;
}

export interface BuiltPrompts {
  system: string;
  user: string;
}

/**
 * Build the final prompts for OpenAI API.
 * - System: strict constraints + forbidden rules + output format constraints
 * - User: passage + difficulty + preferred patterns + candidate selection
 */
export function buildGrammarItemPrompts(input: BuildPromptInput): BuiltPrompts {
  const profile = DIFFICULTY_PROFILES[input.difficulty];

  const system = `
You are an expert Korean high-school English exam item writer (grade 11–12 / CSAT).

Hard constraints:
1) Select exactly FIVE candidates (①–⑤) copied verbatim from the ORIGINAL passage.
2) Modify ONLY ONE candidate to create ONE grammatical error (plausible but wrong in context).
3) The other four candidates must remain EXACTLY as in the original and must be correct in context.
4) The incorrect option must remain readable and realistic (not nonsense / not invented grammar).
5) Output MUST be valid JSON only. No markdown. No extra keys.

${FORBIDDEN_TRANSFORMATIONS_PROMPT}

${FORBIDDEN_EXAMPLES_PROMPT}

If you cannot create a high-quality item under these rules, output:
{"error":"cannot_generate","reason":"..."}
`.trim();

  // Give the model the allowed error types explicitly (this improves controllability)
  const allowedTypes = profile.allowedErrorTypes.join(', ');

  // Provide weights as a soft preference (the model will follow if written clearly)
  const weightedHint = Object.entries(profile.weights)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');

  const user = `
[PASSAGE]
${input.passage}

[DIFFICULTY]
${input.difficulty}

[ALLOWED ERROR TYPES]
Choose exactly ONE error type from: ${allowedTypes}
Preference weights (higher is better): ${weightedHint}

${PREFERRED_PATTERNS_PROMPT}

${CANDIDATE_SELECTION_PROMPT}

[OUTPUT JSON SCHEMA]
{
  "question": {
    "stem": "다음 글의 밑줄 친 ①~⑤ 중 어법상 어색한(틀린) 것은?",
    "context": "원문 문단(필요 시 일부 생략 가능)",
    "underlined": { "1": "...", "2": "...", "3": "...", "4": "...", "5": "..." }
  },
  "answer": 1,
  "explanation_ko": {
    "why_wrong": "...",
    "why_others_ok": "..."
  },
  "meta": {
    "difficulty": "${input.difficulty}",
    "error_type": "${allowedTypes.split(',')[0]}",
    "edit_summary": "original -> transformed"
  }
}

Rules:
- "underlined" values must match substrings in [PASSAGE] exactly (except the ONE incorrect option after transformation).
- answer must be 1..5 and exactly one option must be incorrect.
- explanation must be in Korean and must reference the grammar rule clearly.
`.trim();

  return { system, user };
}

/**
 * Post-validation helper:
 * Use this after you render the final passage with the transformed option.
 * It catches forbidden contextual patterns like "of to V" / "thought of to V".
 */
export function validateGeneratedItem(params: {
  originalCandidate: string;
  transformedCandidate: string;
  renderedPassage: string; // passage after applying the transformed candidate
}): { ok: true } | { ok: false; reason: string } {
  const v1 = validateTransformation(params.originalCandidate, params.transformedCandidate);
  if (!v1.isValid) return { ok: false, reason: v1.errorMessage ?? '변형 단어 검증 실패' };

  const v2 = validatePassageForForbiddenPatterns(params.renderedPassage);
  if (!v2.isValid) return { ok: false, reason: v2.errorMessage ?? '문맥 패턴 검증 실패' };

  return { ok: true };
}

/**
 * Optional: force error_type to be one of allowed types (defensive).
 */
export function isAllowedErrorType(difficulty: Difficulty, errorType: string): errorType is ErrorType {
  return (DIFFICULTY_PROFILES[difficulty].allowedErrorTypes as string[]).includes(errorType);
}
