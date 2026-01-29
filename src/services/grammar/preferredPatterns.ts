/**
 * Preferred error patterns for high2/high3/CSAT-quality grammar items.
 * The model should choose ONE error type from these patterns.
 */

export const PREFERRED_PATTERNS_PROMPT = `
**PREFERRED ERROR PATTERNS (Choose exactly ONE):**
Your incorrect option must be a subtle, realistic CSAT-style grammar error.
Prefer clause-level errors that require reading the sentence, not instant pattern spotting.

1) Subject–Verb Agreement (non-be verbs)
- agreement across a clause (e.g., complex subject, "the number of", "one of", relative clause interruption)

2) Parallelism
- coordination requires same grammatical form (to-V / V-ing / noun phrase consistency)

3) Relative clause / pronoun form
- wrong relative pronoun/structure that is plausible but incorrect in context
- avoid trivial who/which swaps unless the antecedent forces it strongly

4) Pronoun reference & number consistency (context-based)
- it/they/this/these reference must match antecedent in number/logic
- must require checking antecedent, not immediate adjacency

5) Modifier attachment (dangling / misplaced modifier)
- participial phrase logically must modify the subject
- keep sentence readable and plausible

6) Logical tense / aspect consistency
- tense must fit surrounding time logic; avoid elementary past vs present swaps

7) Voice consistency (only if subtle)
- active/passive consistency with the same argument structure (do NOT create nonsense)

**AVOID (too easy / low-quality):**
- mechanical "to-V → to-Ving", "V-ing → to-V"
- preposition + to-infinitive errors (e.g., "of to V") — banned for this service
- spelling/typo errors or non-existent forms
- errors solvable without reading beyond the immediate word
`;
