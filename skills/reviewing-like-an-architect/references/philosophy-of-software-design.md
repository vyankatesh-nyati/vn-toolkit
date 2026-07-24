# A Philosophy of Software Design — Review Ammunition
> Distilled principles from *A Philosophy of Software Design* (John Ousterhout) — original synthesis for architecture review, not book text.

**Why this lens matters in review:** This foundation gives you language for the defects that pass tests but rot the system — where the code "works" yet every future change costs too much. It targets the two engines of long-term cost: how many places a change forces you to touch (dependencies) and how much you must already know to change safely (obscurity). Use it to argue against changes that are locally reasonable but globally expensive.

## Principles

### Complexity is dependencies plus obscurity
- **Idea:** A system feels complex when a change ripples across many spots (dependencies) or when the knowledge needed to make it correctly isn't obvious from the code (obscurity). Complexity is what you feel, not a single metric; it accrues in tiny increments.
- **Smell it catches:** A one-line behavior change that requires edits in five files; reviewers asking "how did you know to also update X?"; fields whose valid combinations live only in someone's head.
- **Review trigger:** A diff that touches many unrelated-looking files for one logical change, or a change whose correctness depends on an invariant stated nowhere.
- **Suggestion shape:** Consolidate the knowledge so the dependency lives in one module; make the implicit invariant explicit (a type, an assertion, or a doc comment on the contract).
- **When NOT to apply:** Don't chase a zero-dependency ideal — some coupling is inherent to the domain. The goal is fewer *surprising* dependencies, not none.

### Deep modules over shallow ones
- **Idea:** The best modules offer a small, simple interface over a large, valuable implementation. Depth is the ratio of hidden functionality to interface surface; shallow modules add a call layer without absorbing complexity.
- **Smell it catches:** Classes that are mostly getters/setters and delegation; wrappers whose signature is nearly identical to what they wrap; a "manager" that just forwards.
- **Review trigger:** A new class or interface whose public surface is as wide as the work it does, or an abstraction that callers must configure heavily to use.
- **Suggestion shape:** Fold the thin layer into its caller or callee, or push more decision-making inside so callers pass less and know less.
- **When NOT to apply:** Genuinely thin adapters at a real boundary (framework seams, ports) earn their keep. Don't merge modules just to raise a depth score when the seam is meaningful.

### Information hiding, and its enemy: leakage
- **Idea:** Each module should encapsulate a design decision so nobody else needs to know it. Leakage happens when the same knowledge (a format, an ordering, a status code convention) is baked into several modules.
- **Smell it catches:** The same magic constant, date format, or parsing rule duplicated across layers; callers that must call methods in a specific undocumented order.
- **Review trigger:** A change that adds the *same* new field/flag/case in two or more modules at once — that duplication is the leak announcing itself.
- **Suggestion shape:** Move the decision behind one owner; expose intent, not the representation. If two modules must share knowledge, make one depend on the other explicitly rather than both re-encoding it.
- **When NOT to apply:** Some cross-cutting facts (a wire protocol) are legitimately shared; the fix there is a single shared definition, not forced hiding that creates a fake owner.

### General-purpose beats special-purpose (somewhat)
- **Idea:** Interfaces designed a little more generally than today's single use tend to be simpler, because they're defined by what the module fundamentally does rather than by one caller's momentary need. "Somewhat general" is the sweet spot.
- **Smell it catches:** Methods named for a specific caller's workflow (`handleLoginButtonClick` doing text-buffer work); parameters that only make sense for one call site.
- **Review trigger:** A new API method that bakes in a specific screen, request, or use case; several near-identical specialized methods that differ only in a hardcoded choice.
- **Suggestion shape:** Recast the interface around the underlying capability; let the special case become one call of the general method.
- **When NOT to apply:** Don't speculatively generalize for imagined futures (YAGNI). "Somewhat" general means shaped by current understanding, not built for hypothetical requirements.

### Define errors out of existence
- **Idea:** The cheapest exception to handle is the one that can't occur. Redefine the semantics so the "error" case becomes normal, or handle it once at a low level, rather than pushing a special case onto every caller.
- **Smell it catches:** Exceptions thrown for ordinary situations (deleting something already gone, substring past end); every caller wrapped in the same defensive try/catch; null returns that force null checks everywhere.
- **Review trigger:** A new checked exception or error return that many callers will have to handle identically, especially when the "error" is a benign edge.
- **Suggestion shape:** Broaden the operation's definition so the edge is a valid no-op; mask or aggregate the error at one internal layer; return a sensible empty result instead of throwing.
- **When NOT to apply:** Don't swallow errors that callers genuinely need to act on differently, or hide failures that must surface (data loss, auth). Defining out of existence is about *nuisance* special cases, not real faults.

### Pull complexity downward
- **Idea:** When you must choose where messiness lives, prefer to absorb it inside the module rather than expose it upward. One implementer suffers once so that many callers stay simple.
- **Smell it catches:** Configuration parameters that push a hard decision onto every caller; APIs that make the user assemble internal pieces; "flexibility" that's really the module refusing to decide.
- **Review trigger:** A new config knob, flag, or required setup step that exists because the module couldn't pick a sensible default or handle the case itself.
- **Suggestion shape:** Compute or default it internally; collapse the knob unless a caller has demonstrated it needs to differ. Make the common path require nothing.
- **When NOT to apply:** Don't bury a decision the caller legitimately owns (business policy, tenant-specific behavior). Downward-pulling a policy choice hides it from the people responsible for it.

### Comments capture intent the code cannot
- **Idea:** Code states *what* happens; it cannot state *why*, what the contract promises, or what the reader must not assume. Good comments record the design decisions and rationale that would otherwise be reverse-engineered — or lost.
- **Smell it catches:** Comments that restate the line ("increment i"); zero comments on a public method's contract, units, or thread-safety; a nonobvious workaround with no explanation of the constraint behind it.
- **Review trigger:** A public interface with no statement of its contract/preconditions; a subtle fix with no note on why the obvious approach fails; a comment duplicating the code (a maintenance liability).
- **Suggestion shape:** Ask for interface comments describing the abstraction and invariants, and rationale comments for anything nonobvious. Delete comments that merely echo code; improve the name instead.
- **When NOT to apply:** This is not a mandate to comment everything — this repo's global rule is zero comments unless genuinely needed. Reserve comments for design intent and contracts, and prefer a clearer name first.

### Strategic over tactical programming
- **Idea:** Tactical work optimizes for getting this feature done now and quietly accrues complexity. Strategic work treats a good design as part of "done" and invests continuously — a little extra each change to keep the system clean.
- **Smell it catches:** "I'll clean it up later" that never happens; a change that works but leaves the abstraction slightly worse; special cases bolted onto the outside of an interface to avoid touching its core.
- **Review trigger:** A PR that solves the ticket by adding a hack around an existing abstraction rather than improving the abstraction, especially when the author acknowledges the shortcut in the description.
- **Suggestion shape:** Ask for the small investment that keeps the design coherent — extend the abstraction properly, or file and fix the design debt now while context is fresh.
- **When NOT to apply:** Deadlines and throwaway prototypes are real; a spike or a genuinely temporary experiment doesn't warrant strategic polish. Judge by lifespan and blast radius.

### Different layers, different abstractions
- **Idea:** Adjacent layers should offer meaningfully different views of the problem. When a layer just repeats its neighbor's abstraction, it isn't earning its existence.
- **Smell it catches:** Pass-through methods that accept the same args and call the identical method one level down; a class that mirrors another's API one-for-one; "dispatcher" layers that only forward.
- **Review trigger:** A new method whose entire body is `return other.sameMethod(sameArgs)`, or a layer added between two others that neither transforms data nor changes the vocabulary.
- **Suggestion shape:** Remove the pass-through and let the caller talk to the deeper layer, or give the layer a real job (translate, aggregate, enforce an invariant) so its abstraction differs.
- **When NOT to apply:** Thin delegation across a deliberate architectural boundary (an interface for testing/DI, an anti-corruption layer, a public facade with a stable contract) is justified even when the signature matches.

### Design it twice
- **Idea:** The first design you think of is rarely the best. Sketching two genuinely different approaches for a nontrivial interface, then comparing, reliably produces a simpler result than committing to the first idea.
- **Smell it catches:** A significant new abstraction presented with no alternative considered; a design that "works" but that nobody stress-tested against a different shape.
- **Review trigger:** A large or foundational interface in a plan/MR with a single option and no discussion of trade-offs against an alternative.
- **Suggestion shape:** Ask the author to articulate one materially different design and say why this one wins — often the comparison itself surfaces a better third option.
- **When NOT to apply:** Small, local, easily-reversible changes don't warrant the ceremony. Reserve it for interfaces that will be expensive to change later.

## Quick review checklist
- One logical change edits many files → look for a missing owner / leaked knowledge; ask to consolidate.
- Interface as wide as the work it does → shallow module; suggest folding it in or pushing work inward.
- Same new field/flag/format added in two places at once → information leak; give it one owner.
- Method named after a specific caller or screen → over-specialized; recast around the underlying capability.
- New config knob or required setup step → can the module default or decide it? Pull complexity down.
- New exception many callers handle identically → try to define the error out of existence or mask it once, low.
- Public method with no contract/units/invariants documented → ask for an interface comment (design intent, not restatement).
- Comment that just restates the code → delete it or fix the name instead.
- Method body is a one-line forward to the same method below → pass-through smell; remove the layer or give it a real job.
- New middle layer that neither transforms data nor changes vocabulary → doesn't earn its place.
- "Clean it up later" / hack around an existing abstraction → tactical debt; ask for the strategic fix now.
- Foundational interface with only one design considered → ask for a second, materially different option.
- Correctness depends on an ordering or invariant stated nowhere → make it explicit (type, assertion, or comment).
- Null returned where callers will all null-check → prefer an empty result or an operation that absorbs the case.
- "Flexibility" that just makes the caller assemble internals → decide inside; expose intent, not parts.