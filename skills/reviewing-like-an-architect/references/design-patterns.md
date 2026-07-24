# Design Patterns: Review Ammunition
> Distilled principles from *Design Patterns (GoF)* / *Head First Design Patterns* (Gamma, Helm, Johnson, Vlissides; Freeman & Robson) — original synthesis for architecture review, not book text.

**Why this lens matters in review:** Most maintainability pain traces to one root cause — code that hard-wires a decision that was always going to change. This foundation gives you a vocabulary for the recurring shapes of "the thing that varies" and, just as importantly, a discipline for refusing structure that guards against variation nobody has evidence for. In review it helps you catch both under-design (rigid conditionals, cascading edits for one logical change) and over-design (indirection scaffolding built for imaginary futures).

## Principles

### Program to an interface, not an implementation
- **Idea:** Callers should depend on a role (what a thing can do) rather than a specific class (how it does it), so the concrete choice can change without rippling through consumers.
- **Smell it catches:** Method signatures, fields, and constructors typed to concrete classes (`ArrayList`, `PostgresUserRepo`, `SmtpMailer`) that have a natural abstraction; `instanceof` chains recovering the concrete type the code just erased.
- **Review trigger:** A collaborator is `new`'d or typed concretely where more than one implementation exists or is plausibly coming; tests can't substitute a fake without touching production wiring.
- **Suggestion shape:** Extract the role the caller actually uses (often narrower than the full class), depend on that, and inject the concrete choice from the edge/composition root.
- **When NOT to apply:** Value objects, DTOs, and stable data carriers don't need an interface — a single-implementation interface that merely mirrors its class is ceremony. Don't abstract a type that has exactly one realistic implementation forever.

### Favor composition over inheritance
- **Idea:** Assemble behavior by holding and delegating to other objects rather than by subclassing, so behavior can vary at runtime and you avoid inheriting an entire base contract you didn't want.
- **Smell it catches:** Deep or wide class hierarchies where subclasses exist only to tweak one method; a subclass overriding methods to "turn off" inherited behavior; combinatorial subclass explosion (`RedLargeButton`, `BlueSmallButton`).
- **Review trigger:** A new requirement is met by adding another subclass level, or a base class grows a protected hook purely so one child can intercept it.
- **Suggestion shape:** Pull the varying behavior into a collaborator interface (strategy-like) and compose it in; reserve inheritance for genuine "is-a substitutable for" relationships.
- **When NOT to apply:** Inheritance is right when there's a true subtype relationship with Liskov substitutability, or when a framework mandates extending a base class. Composition adds an indirection cost; don't shred a clean two-level hierarchy to obey a slogan.

### Encapsulate what varies
- **Idea:** Find the part of the design that changes and isolate it behind a stable boundary, so change is localized and the stable parts stay untouched.
- **Smell it catches:** One conceptual change forcing edits in many files; a `switch`/`if-else` on a type code duplicated across the codebase; formatting/pricing/validation rules interleaved with unrelated logic.
- **Review trigger:** The diff touches five call sites to add one new case; a comment says "remember to update X here too when you add a Y."
- **Suggestion shape:** Name the axis of variation, give it its own abstraction, and route all variants through one place so adding a variant is a single, additive change.
- **When NOT to apply:** If the code has never varied and there's no concrete second case on the horizon, isolating it is speculative. Wait for the second real instance before paying for the seam — one occurrence is data, not a pattern.

### Depend on abstractions, not concretions (dependency inversion)
- **Idea:** High-level policy shouldn't reach down and bind to low-level mechanism; both should meet at an abstraction owned by the policy side.
- **Smell it catches:** A domain/service layer importing infrastructure packages (DB drivers, HTTP clients, cloud SDKs) directly; the "important" code recompiled whenever a detail changes.
- **Review trigger:** Import statements crossing a layer boundary the wrong way; business logic constructing its own database connection or clock (`new Date()`, `LocalDateTime.now()` inline).
- **Suggestion shape:** Define the port on the consumer's side, implement it in the outer layer, and wire it at the composition root; inject clocks/randomness/IO.
- **When NOT to apply:** Depending on a stable, ubiquitous abstraction (the standard library, the language's collection types) needs no further inversion. Inverting dependencies on things that will never be swapped just adds a layer to trace through.

### Open–closed: open for extension, closed for modification
- **Idea:** You should be able to add new behavior by adding new code, not by reopening and editing code that already works and is already tested.
- **Smell it catches:** Every new feature edits the same central file/enum/switch; a class that everyone touches and no one trusts.
- **Review trigger:** The MR adds a case to an existing conditional dispatch instead of adding a new implementation of an existing extension point; a shared "manager"/"handler" file appears in most feature diffs.
- **Suggestion shape:** Introduce (or reuse) a polymorphic extension point so the new variant is additive; leave the stable dispatcher untouched.
- **When NOT to apply:** Open–closed is bought with abstraction, and you can't predict every axis. It's cheaper to edit a small, well-tested switch than to build a plugin framework for a dimension that turns out never to grow. Refactor toward it when the third case arrives, not preemptively.

### Least knowledge / talk to friends only (Law of Demeter)
- **Idea:** An object should interact with its immediate collaborators, not reach through them into their internals, so coupling stays shallow.
- **Smell it catches:** Train-wreck chains (`order.getCustomer().getAddress().getCity().toUpperCase()`); code that must understand three other classes' structure to do one thing.
- **Review trigger:** Long getter chains, or a method that navigates an object graph to pull out a value and compute on it.
- **Suggestion shape:** Add a method on the nearest owner that answers the question directly ("tell, don't ask"); move the computation to the data.
- **When NOT to apply:** Fluent builders and query DSLs chain intentionally; navigating a plain data structure (parsed JSON, a config tree) isn't a Demeter violation. Don't wrap every field access in a delegating method.

### Single responsibility / one reason to change
- **Idea:** A unit should answer to one stakeholder or concern, so changes from unrelated directions don't collide in the same file.
- **Smell it catches:** "God" classes/services with mixed persistence, formatting, business rules, and orchestration; a class whose name contains "and" or "Manager/Util/Helper."
- **Review trigger:** A single class is edited by unrelated feature streams; the class has private helpers that cluster into two or three clearly separate topics.
- **Suggestion shape:** Split along the seams the responsibilities already reveal; let each collaborator be independently testable.
- **When NOT to apply:** Don't atomize into single-method classes — cohesion matters as much as separation. A handful of tightly related operations belong together; splitting them creates a scatter that's harder to follow than the original.

### Strive for loose coupling between objects that interact
- **Idea:** Interacting components should share the minimum they must (a small interface, an event), so each can change or be tested in isolation.
- **Smell it catches:** Two classes that must be edited in lockstep; a change in one breaking compilation in a distant module; observers/publishers that know concrete subscriber types.
- **Review trigger:** A new field or method added to one class immediately requires edits in another; bidirectional references where one direction would do.
- **Suggestion shape:** Narrow the shared surface to an interface or a notification; invert the reference direction; consider an event/callback where the producer needn't know consumers.
- **When NOT to apply:** Loose coupling via events/indirection makes control flow harder to follow. For two components that genuinely form one cohesive unit, a direct call is clearer than an event bus. Don't decouple things that always ship and change together.

### Know the pattern intents, match by problem not by name
- **Idea:** Each classic pattern answers a specific recurring problem — pick it because your problem matches its intent, not because the pattern is elegant. Rough intent map below.
- **Smell it catches:** Patterns applied for their own sake; a "FactoryFactory"; a Singleton used as a global variable in disguise.
- **Review trigger:** A class name announces a pattern (`XxxFactory`, `XxxStrategy`, `XxxVisitor`) but the code has one implementation, no variation, and no second caller — pattern vocabulary with no pattern problem.
- **Suggestion shape:** Ask "what varies, and who needs to vary it?" If nothing does, delete the machinery and inline. If something does, confirm the chosen pattern's intent actually matches.
- **When NOT to apply:** This is itself the caution — see the anti-patterns section. Naming things after patterns is not the same as needing them.

#### Intent quick-map (creational / structural / behavioral)
- **Factory Method / Abstract Factory:** let a caller create objects without naming concrete classes; use when the concrete type is chosen elsewhere or comes in coordinated families.
- **Builder:** assemble a complex object step by step; use when a constructor has many optional/order-sensitive parts.
- **Prototype:** create by cloning a configured instance; use when construction is costly or configuration-driven.
- **Singleton:** restricts a type to a single shared instance reachable from anywhere — the most abused; prefer a DI-scoped singleton bean over the static pattern.
- **Adapter:** make an existing interface fit an expected one; use at integration boundaries.
- **Decorator:** add responsibilities to an object at runtime without subclassing; use when behaviors combine in many orders.
- **Facade:** offer a simple front over a complicated subsystem; use to shrink a client's knowledge.
- **Composite:** treat individual objects and groups uniformly through one interface; use for tree structures.
- **Proxy:** stand in for another object to control access (lazy, remote, guarded).
- **Bridge:** separate a thing's high-level abstraction from its concrete implementation so each side can evolve on its own.
- **Flyweight:** share fine-grained objects to save memory; use only under real memory pressure.
- **Strategy:** make an algorithm interchangeable at runtime; the default answer to "too many if-branches on behavior."
- **Observer:** notify dependents of state changes without hard-wiring them; use for event fan-out.
- **Command:** wrap a request as an object to queue, log, or undo it.
- **Template Method:** lock the overall shape of a procedure while letting subclasses fill in individual steps; the inheritance-based cousin of Strategy.
- **State:** swap an object's behavior as it moves between named states, replacing sprawling state flags.
- **Chain of Responsibility:** pass a request along handlers until one takes it (middleware/pipelines).
- **Iterator / Visitor / Mediator / Memento / Interpreter:** traverse without exposing internals / add operations over a stable structure / centralize many-to-many interaction / capture and restore state / evaluate a small language.

### Beware speculative generality (YAGNI)
- **Idea:** Structure added to handle a future that hasn't arrived is a net liability — it costs comprehension now and usually guesses the future wrong.
- **Smell it catches:** Interfaces with one implementation; abstract base classes with one subclass; config flags nothing sets; "we might need to swap the database" scaffolding with no second database.
- **Review trigger:** New abstraction whose justification is a hypothetical ("in case we ever…", "to be future-proof") rather than a present, concrete second case.
- **Suggestion shape:** Collapse the indirection to the simplest thing that works today; leave a clear seam only where change is genuinely imminent and evidenced.
- **When NOT to apply:** Some seams are cheap to add now and very expensive to retrofit (public API boundaries, persistence contracts, cross-team interfaces). Draw the line where reversal cost is high — that's judgment, not a blanket rule.

### Beware pattern overuse and premature indirection
- **Idea:** Patterns trade directness for flexibility; every layer you add is a layer every future reader must decode. Flexibility you don't use is just cost.
- **Smell it catches:** Ceremony to reach simple logic (five files to add one field); a factory returning a strategy wrapped in a decorator behind a facade for a single code path; abstraction depth that outstrips the domain's actual variation.
- **Review trigger:** Following one request through the code requires opening many small classes that each do almost nothing; the pattern count exceeds the number of real variations.
- **Suggestion shape:** Inline the indirection, keep the direct call, and reintroduce a pattern only when a second concrete case forces the variation into the open.
- **When NOT to apply:** Genuinely high-variation, high-churn areas (payment providers, notification channels, rule engines) earn their patterns — don't strip structure that's actively absorbing change. The test is realized variation, not aesthetics.

## Quick review checklist
- If you see a `switch`/`if-else` on a type or mode code repeated in more than one place → consider Strategy/State or polymorphic dispatch (encapsulate what varies).
- If you see a subclass added just to override one method → consider composition/Strategy instead of another hierarchy level.
- If you see business/domain code importing infrastructure packages directly → consider a port owned by the domain, wired at the edge.
- If you see `new Date()`, `now()`, `Random`, or a DB/HTTP client constructed inside logic → consider injecting it so the behavior is testable.
- If you see a getter chain three deep (`a.getB().getC().getD()`) → consider tell-don't-ask; move the behavior to the data.
- If you see one logical change forcing edits across many files → the varying axis isn't encapsulated; name it and give it a boundary.
- If you see a class named `*Manager`/`*Util`/`*Helper` growing unrelated methods → consider splitting by responsibility along its natural seams.
- If you see a Singleton used to reach global mutable state → treat it as a coupling/test smell; prefer an injected, scoped instance.
- If you see an interface with exactly one implementation and no second case in sight → question the abstraction; it may be speculative.
- If you see a class named after a pattern (`*Factory`, `*Strategy`, `*Visitor`) with no variation behind it → the vocabulary is there but the problem isn't; inline it.
- If you see a new abstraction justified only by "we might need…" → push back for a concrete present case; apply YAGNI.
- If following one request means opening many near-empty classes → suspect pattern overuse; collapse indirection.
- If you see combinatorial subclasses (`AB`, `AC`, `BC`, …) → the dimensions should be composed (Bridge/Decorator), not multiplied.
- If you see two classes that must always be edited together → narrow their shared surface or merge them; the coupling is telling you something.
- If a base class grows `protected` hooks only so one child can intercept → question whether Template Method earns its keep here versus plain composition.