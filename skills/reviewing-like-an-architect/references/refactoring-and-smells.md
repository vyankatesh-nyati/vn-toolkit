# Refactoring — Review Ammunition

> Distilled principles from *Refactoring: Improving the Design of Existing Code* (Martin Fowler) — original synthesis for architecture review, not book text.

**Why this lens matters in review:** Most diffs don't fail because a single line is wrong; they fail because they pour new logic into structures that were already sagging, or they entangle a behavior change with a structural one so neither can be verified. This lens trains you to name the design decay a change either introduces or feeds, and to insist that structural moves and behavioral moves stay separable and test-backed. It turns "this feels messy" into a specific, actionable objection the author can act on.

## Principles

### Separate the two kinds of change
- **Idea:** A commit either changes what the code *does* (behavior) or changes how the code is *arranged* (structure) — almost never should it do both at once. Rearranging first makes the real change small and obvious.
- **Smell it catches:** A single MR that moves methods around, renames things, *and* fixes a bug or adds a feature, so the reviewer can't tell which line is the actual change.
- **Review trigger:** A diff where a bug fix or new feature is buried inside 400 lines of moved/renamed code; the description says "refactored while I was in there."
- **Suggestion shape:** Split into two MRs (or two commits): a pure structural pass that keeps tests green with no behavior delta, then a tiny behavioral diff on top.
- **When NOT to apply:** Trivial changes where the "refactor" is a one-line rename adjacent to the fix — forcing a split there is bureaucratic overhead, not clarity.

### Make the change easy, then make the easy change
- **Idea:** When the code resists the feature you need, first reshape the code so the feature drops in cleanly, then add it. The preparatory refactoring is a deliberate, separate step — not an afterthought.
- **Smell it catches:** A feature implemented as a special-case branch bolted onto a structure that clearly wasn't built for it — flags, `if type ==`, duplicated blocks.
- **Review trigger:** The new feature adds a parallel copy of existing logic, or a growing switch/if-else ladder, because the existing shape had no seam to extend.
- **Suggestion shape:** Ask for a prep refactor (extract a strategy, introduce a polymorphic seam, pull out a method) landed first, then the feature as an additive change.
- **When NOT to apply:** One-off or throwaway code, or when the "easy change" is genuinely a one-liner and the reshaping would cost more than the feature is worth.

### Behavior-preserving small steps under test
- **Idea:** Refactoring is a sequence of tiny, individually safe transformations, each verified by a fast test run, so that at no point is the code broken. The safety net is what makes aggressive restructuring cheap.
- **Smell it catches:** Large structural rewrites with no test coverage on the code being moved — "trust me, it's equivalent."
- **Review trigger:** A big restructure touching code that has no tests, or where the author added no characterization tests before the move; CI shows only new tests for the new shape.
- **Suggestion shape:** Require characterization tests pinning current behavior *before* the transform, then land the restructure with those tests still green and unchanged.
- **When NOT to apply:** When the code is genuinely untestable as-is and a scoped, reviewed rewrite-with-new-tests is the pragmatic call — but that must be an explicit decision, not a silent one.

### Long Method — extract until each method does one thing
- **Idea:** A method should read like a short paragraph at one level of abstraction. When it grows, it's hiding named concepts inside anonymous blocks.
- **Smell it catches:** Methods spanning screens of code, comment headers dividing sections ("// validate", "// compute", "// persist"), deep nesting.
- **Review trigger:** A new or edited method past ~30-40 lines, or one where you have to scroll to hold its logic; comments that label blocks are extract-method markers.
- **Suggestion shape:** Extract each labeled block into a well-named private method; the comment becomes the method name.
- **When NOT to apply:** Straight-line sequences where every extraction adds a jump to a one-caller helper that hurts readability more than the length did.

### Large Class — a class hoarding responsibilities
- **Idea:** A class with too many fields and methods is usually several concepts wearing one name; the fields cluster into the objects that want to exist.
- **Smell it catches:** God objects, "Manager"/"Service" classes with dozens of unrelated fields, subsets of fields used only by subsets of methods.
- **Review trigger:** A diff that adds yet another field and method to an already-huge class; field groups that are always used together but never with the rest.
- **Suggestion shape:** Extract class along the field clusters; delegate or move the cohesive slice out.
- **When NOT to apply:** Cohesive classes that are simply large because the domain concept is large — size alone isn't the smell, *low cohesion* is.

### Feature Envy — logic living in the wrong class
- **Idea:** A method that reaches into another object's data more than its own belongs on that other object. Behavior should sit with the data it operates on.
- **Smell it catches:** A method that calls `other.getX()`, `other.getY()`, `other.getZ()` and does all its work on them.
- **Review trigger:** New code that pulls several getters off one collaborator and computes something the collaborator could compute itself.
- **Suggestion shape:** Move method (or the envious slice) onto the class that owns the data; pass what's genuinely external.
- **When NOT to apply:** Deliberate separation — e.g. keeping domain objects free of presentation/persistence concerns, or a coordinator that intentionally orchestrates several objects.

### Primitive Obsession — modeling concepts as strings and ints
- **Idea:** Domain concepts (money, phone number, date range, currency code) deserve their own types instead of being smuggled through primitives and validated ad hoc everywhere.
- **Smell it catches:** `String currencyCode`, `int amountInCents`, validation/format logic duplicated at every use site, magic ranges.
- **Review trigger:** A new method signature taking a bare `String`/`int`/`Map` that carries domain meaning; the same validation regex or bounds check appearing again.
- **Suggestion shape:** Introduce a small value type (record/value object) that owns validation and formatting once.
- **When NOT to apply:** Genuinely primitive data with no invariants or behavior — wrapping a plain count or a raw id in a type earns nothing.

### Data Clumps — the same fields traveling together
- **Idea:** When the same group of parameters or fields keeps appearing side by side, they're a missing object announcing itself.
- **Smell it catches:** `(startDate, endDate)`, `(street, city, zip)`, `(x, y)` threaded through many signatures; deleting one field would break the meaning of the rest.
- **Review trigger:** A new method that adds parameters extending a clump already passed elsewhere, or a struct with the same trio repeated.
- **Suggestion shape:** Introduce a parameter object / value type; move any behavior that operates on the clump onto it.
- **When NOT to apply:** Two values that co-occur once by coincidence and share no conceptual bond — bundling them invents a fake abstraction.

### Divergent Change vs. Shotgun Surgery — two failures of change locality
- **Idea:** These are mirror images. Divergent change: one class changes for many unrelated reasons (it does too much). Shotgun surgery: one conceptual change forces edits scattered across many classes (a responsibility is smeared too thin).
- **Smell it catches:** "Whenever we touch pricing *or* tax *or* shipping we edit this one class" (divergent); "adding one payment method means touching eight files" (shotgun).
- **Review trigger:** For divergent — an MR touching a class already edited for unrelated reasons in recent history. For shotgun — a single feature whose diff sprays one-line edits across many files.
- **Suggestion shape:** Divergent → split the class by reason-to-change. Shotgun → consolidate the scattered responsibility into one module (move/inline until the change lives in one place).
- **When NOT to apply:** Cross-cutting changes that legitimately touch many layers (e.g. adding a field end-to-end) — that's breadth, not smeared responsibility.

### Message Chains & Middle Man — coupling through navigation and empty delegation
- **Idea:** Long chains (`a.getB().getC().getD()`) couple the caller to a whole object graph's shape; a Middle Man is a class that does nothing but forward calls, adding a hop with no value. They often trade off against each other, so judge by cohesion.
- **Smell it catches:** Train-wreck getter chains; classes where nearly every method is a one-line delegation to a held object.
- **Review trigger:** New code walking three-plus dots to reach data (Law of Demeter violation), or a new pass-through wrapper whose methods only forward.
- **Suggestion shape:** Hide the delegate (ask the near object for what you need) for chains; remove middle man (let callers talk to the delegate directly) for empty forwarders.
- **When NOT to apply:** Intentional facades, adapters, and anti-corruption layers where the "middle man" is deliberately isolating callers from a volatile or foreign API.

### Temporary Field — state that's only sometimes real
- **Idea:** A field that's populated only during certain operations and null/meaningless otherwise makes the object's state hard to reason about and invites null checks.
- **Smell it catches:** Fields set at the start of one algorithm and unused elsewhere; clusters of `if (field != null)` guarding methods that assume it's set.
- **Review trigger:** A new field added purely to pass data between helper methods of a single operation, left dangling the rest of the time.
- **Suggestion shape:** Extract the operation (and its temporary state) into its own method-object/class, or pass the value as a parameter instead of stashing it.
- **When NOT to apply:** Legitimate lifecycle/lazy-init fields whose "sometimes set" nature is an honest, documented part of the object's contract.

### Refused Bequest — inheriting what you don't want
- **Idea:** A subclass that ignores, overrides-to-empty, or throws on much of what it inherits is signaling that inheritance was the wrong relationship.
- **Smell it catches:** Overrides that throw `UnsupportedOperationException`, subclasses using a fraction of the parent's API, "is-a" that's really "has-a."
- **Review trigger:** A new subclass that no-ops or rejects inherited methods, or squeezes into a hierarchy to reuse a couple of methods.
- **Suggestion shape:** Replace inheritance with delegation (or push the shared bits into a collaborator/interface the class actually wants).
- **When NOT to apply:** Frameworks whose base classes intentionally provide optional hooks meant to be selectively overridden — refusing some is by design.

## Quick review checklist
- If a method needs scrolling or has `// section` comment headers → extract methods named after those sections.
- If a class keeps gaining unrelated fields/methods → look for field clusters to extract into a class.
- If new code pulls 3+ getters off one collaborator → move the logic onto that collaborator (feature envy).
- If a domain concept rides through signatures as a bare String/int with repeated validation → introduce a value type.
- If the same 2-4 parameters travel together across methods → introduce a parameter object.
- If one class shows up in recent history edited for unrelated reasons → divergent change; split by reason-to-change.
- If one feature's diff sprays one-line edits across many files → shotgun surgery; consolidate the responsibility.
- If you see `a.getB().getC().getD()` → hide the delegate; you're coupled to a graph's shape.
- If a class only forwards calls → question the middle man (unless it's a deliberate facade/adapter).
- If a field is populated only during one operation → extract a method-object or pass it as a parameter.
- If a subclass throws/no-ops inherited methods → replace inheritance with delegation.
- If a bug fix or feature is buried in a large move/rename diff → split structural and behavioral changes.
- If a feature is a special-case branch bolted onto an unfit structure → ask for a prep refactor first, feature second.
- If a big restructure touches untested code → require characterization tests pinning behavior before the move.
- If a "refactoring" MR changes any test's expected outputs → it's not behavior-preserving; challenge it.