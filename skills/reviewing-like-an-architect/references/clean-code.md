# Clean Code — Review Ammunition
> Distilled principles from *Clean Code* (Robert C. Martin) — original synthesis for architecture review, not book text.

**Why this lens matters in review:** This foundation targets the local, line-level legibility of code — the layer where most maintenance cost actually accrues. It helps you catch code that *works but cannot be safely changed*: unclear names, functions doing five things, comments compensating for bad structure, and duplicated logic that will drift. Use it to reason about whether the next engineer can read a change and understand intent without archaeology.

## Principles

### Names carry the intent
- **Idea:** A good name should make clear on its own what the thing represents and how you're meant to use it — enough that a reader never has to fall back on a comment or the implementation to find out. Renaming until it reads naturally is real work, not polish.
- **Smell it catches:** Single letters outside tiny loops, `data`/`info`/`manager`/`tmp`, encoded types (`strName`, `lstUsers`), names that lie about what the code now does, and near-identical names for different concepts (`getAccount` vs `getAccountInfo`).
- **Review trigger:** A diff where you have to read the body to learn what a variable holds; a boolean called `flag`; a method whose name and behavior disagree; abbreviations that aren't domain-standard.
- **Suggestion shape:** Rename to a searchable, pronounceable, intention-revealing term from the domain vocabulary; make the type carry the meaning instead of a prefix.
- **When NOT to apply:** Loop indices `i/j`, well-known idioms, and genuinely local throwaway scopes don't need ceremony — an over-long name for a two-line closure hurts more than it helps.

### A function does one thing
- **Idea:** A function should operate at a single level of abstraction and be describable in one clause without "and"/"or". If you can meaningfully extract another named function from inside it, it was doing more than one thing.
- **Smell it catches:** Functions mixing high-level orchestration with low-level string fiddling; section comments ("// validate", "// now save") marking internal chapters; deeply nested conditionals.
- **Review trigger:** A method over ~20-30 lines, more than 2 levels of nesting, or a name that needs "and" to describe it honestly; blocks separated by blank lines each doing a distinct job.
- **Suggestion shape:** Extract each block into a well-named private method; let the outer function read as a sequence of intent-level steps.
- **When NOT to apply:** Don't shred a linear, cohesive routine into a maze of one-line functions you must chase across the file — extraction that increases jump-count without adding clarity is its own smell. Hot paths may also justify keeping logic inline.

### Few arguments; no flag parameters
- **Idea:** Fewer parameters means fewer ways to call it wrong. Zero to two is easy; three needs justification; more usually signals a missing object. A boolean argument almost always means the function is two functions.
- **Smell it catches:** `doThing(a, b, c, d, e)`; positional booleans (`render(true, false)`); output arguments mutated as a side channel; callers that can't be read without the signature open.
- **Review trigger:** A new/changed signature with 3+ params, any boolean/enum-selector argument that forks behavior, or a param list where adjacent args share a type and could be swapped silently.
- **Suggestion shape:** Introduce a parameter object / value type for cohesive args; split a flag-driven function into two intent-named functions; return values instead of mutating out-params.
- **When NOT to apply:** Constructors of genuine data records, well-established framework callbacks with fixed shapes, and builders legitimately carry more fields — don't wrap two naturally-related args in a ceremony object.

### Comments are a last resort
- **Idea:** A comment is often an apology for code that didn't explain itself. Prefer expressing the thought in a name or a function; reserve prose for what code genuinely can't say — intent behind a non-obvious choice, legal notices, warnings of consequence.
- **Smell it catches:** Comments that restate the code, commented-out dead code, changelog/attribution comments in-line, and stale comments contradicting the current logic.
- **Review trigger:** A diff adding a comment that could be replaced by renaming a variable or extracting a method; any commented-out block; a comment describing *what* rather than *why*.
- **Suggestion shape:** Delete redundant/dead comments (VCS keeps history); convert a "what" comment into a named helper or explaining variable; keep only the "why" that survives.
- **When NOT to apply:** Keep comments that explain a genuinely surprising decision, document a public API contract, warn about a subtle trap, or satisfy licensing/regulatory needs — and this project bans redundant comments already, so don't let a reviewer *demand* one.

### Exceptions over error codes
- **Idea:** Signal failure with exceptions so the happy path stays uncluttered and callers can't silently ignore a returned status. Separate the mechanics of error handling from the mainline logic.
- **Smell it catches:** Functions returning sentinel/`null`/negative codes that every caller must remember to check; deeply nested `if (rc != OK)` ladders; error handling interleaved line-by-line with business logic; returning `null` where callers then NPE.
- **Review trigger:** A new API returning a status code or `null` on failure; callers that branch on magic return values; try/catch wrapping so much that the intent is buried.
- **Suggestion shape:** Throw a meaningful typed exception with context; return an empty collection / `Optional` instead of `null`; extract the try body into its own function so error handling is the whole of the outer one.
- **When NOT to apply:** Exceptions for ordinary, expected control flow (e.g. validation results in a hot loop) are costly and misleading — a result type or `Optional` is clearer there. Respect the surrounding codebase's established error model.

### Command-query separation
- **Idea:** A function should either change state or answer a question — not both. Mixing them makes call sites ambiguous and side effects invisible.
- **Smell it catches:** A getter that mutates/lazy-initializes and returns; `set()` that also returns a status you must interpret; a query that logs, caches, or advances an iterator as a hidden effect.
- **Review trigger:** A method named like a question (`isX`, `getX`) that writes state, or a name that hides that calling it twice yields different results; callers relying on a return value from a method whose primary job is a mutation.
- **Suggestion shape:** Split into a command (void, does the work) and a query (pure, returns the answer); name each so the effect is obvious.
- **When NOT to apply:** Established idioms that intentionally fuse the two are fine to keep for consistency — e.g. `map.put` returning the previous value, `stack.pop`, atomic `compareAndSet`. Don't fight the platform's conventions.

### DRY — one authoritative source for each fact
- **Idea:** Every piece of knowledge should live in exactly one place, so a change is made once. Duplication is the risk that copies drift apart and a fix lands in only some of them.
- **Smell it catches:** Copy-pasted blocks with tweaked literals; the same validation/formatting rule reimplemented in three layers; parallel switch statements that must be edited in lockstep; a constant hard-coded in several files.
- **Review trigger:** A diff that pastes an existing block with small edits; a bug fix applied to one occurrence when grep shows siblings; magic numbers/strings repeated across the change.
- **Suggestion shape:** Extract the shared logic to one named function/constant/policy object; if switches multiply, consider polymorphism.
- **When NOT to apply:** Beware false DRY — two snippets that look alike today but answer to *different* reasons for change should stay separate; coupling them creates a worse dependency than the duplication. Incidental duplication across bounded contexts is often correct.

### Clean boundaries — wrap what you don't own
- **Idea:** Isolate third-party APIs, external services, and volatile formats behind an interface you control, so their churn touches one adapter instead of your whole codebase. Learn a new library with focused "learning tests" that also pin its behavior.
- **Smell it catches:** A vendor type threaded through core domain signatures; raw `Map`/`JsonNode` passed around instead of a domain type; direct SDK calls scattered across many classes; business code catching library-specific exceptions everywhere.
- **Review trigger:** A new dependency whose types appear in more than its adapter; a change where swapping the library would ripple across many files; external DTOs used directly as domain models.
- **Suggestion shape:** Introduce an adapter/port with your own interface and domain types; translate at the seam; confine vendor imports to that package.
- **When NOT to apply:** Don't wrap stable, ubiquitous platform types (the standard collections/date libraries) in a pointless facade — abstraction that will never have a second implementation is just indirection. Reserve the seam for what is genuinely volatile or external.

### Boy Scout rule — leave it cleaner
- **Idea:** Make a small, opportunistic improvement to code you touch — a clearer name, a split function, a deleted dead comment — so the codebase trends toward health instead of decay. Continuous small cleanups beat rare big rewrites.
- **Smell it catches:** Modules that only ever accrete; PRs that add features while stepping over obvious rot right next to the change; "not my code" avoidance.
- **Review trigger:** A diff editing a messy function but leaving it exactly as messy; a touched file where a trivial nearby cleanup was skipped.
- **Suggestion shape:** Suggest one or two *in-scope* cleanups adjacent to the change — rename, extract, delete dead code.
- **When NOT to apply:** Don't let cleanup balloon the diff or mix unrelated refactors into a feature/bugfix PR — it obscures review and risks the change. Large or risky cleanups belong in their own commit or PR, ideally behind characterization tests.

## Quick review checklist
- If you must read a function body to know what a variable holds → rename it to reveal intent.
- If a boolean or enum-selector is passed as an argument → split into two intent-named functions.
- If a signature has 3+ parameters → look for a missing parameter object.
- If a function has internal section comments or blank-lined blocks → extract those blocks into named methods.
- If a function name needs "and"/"or" to describe honestly → it does more than one thing.
- If a new comment restates the code → replace it with a better name or a helper, or drop it.
- If you see commented-out code → delete it; VCS remembers.
- If an API returns `null`/sentinel/status codes on failure → prefer an exception, `Optional`, or empty collection.
- If a getter/`isX` mutates or caches state → separate the command from the query.
- If a block is pasted with tweaked literals → extract the shared logic (but confirm it's the *same* reason to change).
- If a bug is fixed in one place → grep for siblings that need the same fix.
- If a third-party type appears outside its adapter → introduce a boundary interface and domain type.
- If a new dependency's types leak across many files → confine it behind one seam.
- If magic numbers/strings repeat across the diff → hoist to a single named constant.
- If a touched-but-messy function is left exactly as messy → suggest one small in-scope cleanup (not a diff-ballooning refactor).