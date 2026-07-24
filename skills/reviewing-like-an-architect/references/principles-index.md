# Principles Index — which reference to consult

Match the change in front of you to a review lens below, open only the reference file(s) that lens points to, and ground every finding in a named principle from that source.

## Review lenses → references

| Review lens | What you're checking | Reference file(s) to open |
|---|---|---|
| Naming & readability | Do names reveal intent; is the code self-explanatory without comments; does each comment earn its place (design intent, not restating code) | `clean-code.md`, `philosophy-of-software-design.md` |
| Function/method design | Small functions doing one thing; few arguments; command-query separation; validate/fail fast | `clean-code.md`, `effective-language-idioms.md` |
| Class & module structure | Deep modules (simple interface over real implementation); information hiding, no leakage; large-class / god-object smell; refused bequest | `philosophy-of-software-design.md`, `refactoring-and-smells.md`, `clean-code.md` |
| Duplication & change-amplification (smells) | DRY; long method, feature envy, data clumps, shotgun surgery, divergent change, message chains, middle man; make-the-change-easy-then-make-the-easy-change | `refactoring-and-smells.md`, `clean-code.md` |
| Domain modeling & boundaries | Ubiquitous language; entities vs value objects; aggregates & invariants; bounded contexts & context mapping; anti-corruption layer; anemic-domain-model smell | `ddd.md`, `enterprise-patterns.md` |
| Coupling, cohesion & complexity | Complexity as dependencies + obscurity; pull complexity downward; general- vs special-purpose; pass-through/thin-layer smell; strategic vs tactical | `philosophy-of-software-design.md`, `clean-code.md` |
| Design-pattern fit (and misfit) | Right pattern intent; program to an interface, favor composition, encapsulate what varies, open-closed; and when NOT to (speculative generality, pattern overuse) | `design-patterns.md`, `effective-language-idioms.md` |
| Language/API idioms & immutability | Immutability; static factory / builder vs constructor for many params; composition over inheritance; avoid null (Optional/empty); minimize accessibility; equals/hashCode; DI over hard-wiring | `effective-language-idioms.md`, `design-patterns.md` |
| Layering & enterprise structure | Presentation/domain/data-source layering; Transaction Script vs Domain Model vs Table Module; Repository, Unit of Work, Service Layer, DTO, Data Mapper vs Active Record; rich model vs CRUD over-engineering | `enterprise-patterns.md`, `ddd.md` |
| Data, persistence & scalability | Data models; indexes & storage trade-offs; partitioning/sharding; replication; batch vs stream; schema evolution & backward/forward compatibility | `ddia.md`, `enterprise-patterns.md` |
| Concurrency & consistency | Transactions & isolation levels; consistency vs availability; idempotency; stateless share-nothing processes; the process/concurrency model | `ddia.md`, `twelve-factor.md` |
| Configuration, deployment & operability | Config in the environment; declared dependencies; backing services as attached resources; build/release/run separation; disposability & graceful shutdown; logs as event streams; dev/prod parity | `twelve-factor.md` |

## Reference files

- `clean-code.md` — *Clean Code* (Robert C. Martin): meaningful naming, small single-purpose functions, minimal arguments, comments as a last resort, exceptions over error codes, command-query separation, DRY, clean boundaries, the Boy Scout rule.
- `refactoring-and-smells.md` — *Refactoring* (Martin Fowler): the code-smell catalog and behavior-preserving small-step refactoring under test; make the change easy, then make the easy change.
- `ddd.md` — *Domain-Driven Design* (Eric Evans): ubiquitous language, bounded contexts & context mapping, entities vs value objects, aggregates & invariants, domain services, repositories, anti-corruption layer, the anemic-domain-model anti-pattern.
- `ddia.md` — *Designing Data-Intensive Applications* (Martin Kleppmann): reliability/scalability/maintainability, data models & indexes, replication, partitioning, transactions & isolation, consistency vs availability, idempotency, batch vs stream, schema evolution.
- `design-patterns.md` — *Design Patterns (GoF) / Head First Design Patterns*: intents of the classic patterns and the principles behind them (program to an interface, favor composition, encapsulate what varies, depend on abstractions, open-closed) — and when NOT to apply a pattern.
- `effective-language-idioms.md` — *Effective Java, generalized* (Joshua Bloch): immutability, static factory/builder vs constructor, composition over inheritance, minimize mutability & accessibility, enums/typed constants, avoid null, fail fast, program to interfaces, DI, consistent equals/hashCode.
- `enterprise-patterns.md` — *Patterns of Enterprise Application Architecture* (Martin Fowler): layering, Transaction Script vs Domain Model vs Table Module, Repository, Unit of Work, Data Mapper vs Active Record, Service Layer, DTO, offline locking, and when a rich domain model is over-engineering.
- `philosophy-of-software-design.md` — *A Philosophy of Software Design* (John Ousterhout): complexity as dependencies + obscurity, deep vs shallow modules, information hiding & leakage, general-purpose design, define errors out of existence, pull complexity downward, comments as design intent, strategic vs tactical, pass-through methods as a smell.
- `twelve-factor.md` — *The Twelve-Factor App* (Adam Wiggins): declared dependencies, config in the environment, backing services as attached resources, build/release/run separation, stateless share-nothing processes, port binding, concurrency via the process model, disposability, dev/prod parity, logs to stdout, admin tasks as one-off processes.

## How to use in a review

- **Start from the change's altitude.** A rename or a single method touches naming/function lenses; a new service, data store, or deployment concern reaches into domain, enterprise, data, or twelve-factor territory. Let the scope of the diff decide which lenses are in play.
- **Open only the relevant lenses.** Consult the two or three references the lens points to — don't sweep the whole library at every diff.
- **Ground each finding in a named principle.** State the specific principle (e.g. "deep module / information leakage", "feature envy", "config in the environment"), not a vague preference.
- **Cite the source.** Attribute the principle to its reference file and author so the author can follow up in the original.
- **Never nitpick.** Raise a finding only when it maps to a real principle and materially affects the design; skip stylistic quibbles the lenses don't support.
