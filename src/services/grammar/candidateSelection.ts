/**
 * 선택지(①~⑤) 뽑는 기준 + 후보 품질 휴리스틱
 */

import type { Difficulty } from './difficultyProfiles';

export const CANDIDATE_SELECTION_PROMPT = `
**Candidate selection rules for ①–⑤ (MUST follow):**
- ①–⑤ must be copied verbatim from the passage (exact substring).
- Choose confusing, structure-bearing items (NOT easy nouns).
- At least 3 of the 5 candidates must be verbs/verb phrases or clause-structure units:
  (verbs, verb phrases, infinitives, gerunds, relative clauses, pronoun references, modifiers)
- Avoid: basic articles (a/an/the), simple plural -s, very simple prepositions, spelling-level items.
- Avoid choosing coordinating conjunctions (and/or/but/so/yet...) as candidates.
- Difficulty target: high2/high3/CSAT quality (not trivial).
`;

/**
 * A lightweight heuristic scorer for candidate "difficulty/structural-importance".
 * Use it to reject bad candidate sets and retry generation.
 */
export function scoreCandidate(fragment: string): number {
  const s = fragment.trim().toLowerCase();

  // penalize trivial tokens
  if (['a', 'an', 'the'].includes(s)) return -5;
  if (['and', 'or', 'but', 'nor', 'for', 'so', 'yet'].includes(s)) return -5;

  // reward structure-bearing forms
  let score = 0;

  // verb-ish
  if (/^to\s+[a-z]+$/.test(s)) score += 3;
  if (/[a-z]+ing$/.test(s)) score += 2;
  if (/\b(who|which|that|whose|whom)\b/.test(s)) score += 3;

  // pronouns that can create reference issues (but we won't allow trivial swaps)
  if (/\b(it|they|them|their|this|these|those)\b/.test(s)) score += 2;

  // auxiliaries / modals (as candidates, they can be useful, but transformations are constrained)
  if (/\b(has|have|had|will|would|could|should|might|may|must)\b/.test(s)) score += 2;

  // pure nouns (often too easy)
  if (/^[a-z]+$/.test(s) && !s.endsWith('ing')) score -= 1;

  return score;
}

export function scoreCandidateSet(fragments: string[]): number {
  return fragments.reduce((acc, f) => acc + scoreCandidate(f), 0);
}

export function minCandidateSetScore(difficulty: Difficulty): number {
  // tighter for csat
  if (difficulty === 'csat') return 8;
  if (difficulty === 'high3') return 6;
  return 4;
}
