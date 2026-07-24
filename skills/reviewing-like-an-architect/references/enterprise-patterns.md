# Patterns of Enterprise Application Architecture — Review Ammunition
> Distilled principles from *Patterns of Enterprise Application Architecture* (Martin Fowler) — original synthesis for architecture review, not book text.

**Why this lens matters in review:** Most enterprise defects are not algorithmic — they are placement mistakes: business rules living in controllers, SQL smeared through domain objects, transactions that quietly span HTTP round-trips, or a full domain-modelling apparatus bolted onto what is really a spreadsheet. This lens lets you catch code that "works today" but has put logic, persistence, and concurrency concerns in the wrong layer, and — just as important — catch the opposite failure of over-building for problems that don't have the complexity to justify it.

## Principles

### Three-layer separation (presentation / domain / data source)
- **Idea:** Keep the code that talks to users, the code that decides business outcomes, and the code that talks to storage in distinct layers, with dependencies pointing inward toward the domain rather than the domain reaching outward.
- **Smell it catches:** A controller method that validates business rules, builds a SQL string, and formats a response; or a domain object that imports the web framework or the ORM session directly.
- **Review trigger:** A diff where an HTTP handler, a message consumer, or a UI component contains conditionals expressing business policy, raw queries, or field-level formatting all in one place.
- **Suggestion shape:** Push the decision logic down into a domain/service type, pull persistence behind a data-source type, and leave the entry point doing only translation (parse request → call domain → shape response).
- **When NOT to apply:** A genuinely trivial endpoint (health check, static lookup, one-line passthrough) doesn't need three files to move one value; forcing the ceremony there is noise.

### Choosing the domain-logic style deliberately
- **Idea:** There are three legitimate homes for business logic — Transaction Script (a procedure per use case), Domain Model (behaviour-rich objects), and Table Module (one class per table operating over a record set) — and the choice should track how tangled the rules are, not habit.
- **Smell it catches:** A codebase that started as one-procedure-per-request and is now drowning in duplicated validation and branching because the rules grew but the style never changed.
- **Review trigger:** A plan that picks an approach implicitly — e.g. "add another service method" — when the logic being added has clearly crossed into interdependent rules, invariants, and state transitions that a script will duplicate.
- **Suggestion shape:** Name the trade-off explicitly in review: script for simple, mostly-CRUD flows; domain model once rules interact and evolve; table module when the platform/tooling is record-set oriented and rules are moderate. Ask the author to justify the pick against rule complexity.
- **When NOT to apply:** Don't demand a Domain Model for a reporting job or an import script — a straight-line Transaction Script is the honest, cheaper answer there.

### Transaction Script: fine until the rules interlock
- **Idea:** Organising each business action as a self-contained procedure is easy to understand and quick to write, and it is the right default for thin, weakly-interrelated logic.
- **Smell it catches:** The same validation, tax calculation, or eligibility check copy-pasted across five scripts, each drifting slightly out of sync.
- **Review trigger:** A new procedure that re-implements a rule you can see already exists elsewhere, or a single method growing past comprehension with nested branches on entity state.
- **Suggestion shape:** Extract the shared rule; if extraction keeps colliding with entity state and behaviour, that is the signal to graduate the concept into a domain object rather than a shared helper.
- **When NOT to apply:** For small apps or scripts with little rule overlap, scripts are the least-effort choice and refactoring toward objects is premature.

### Domain Model: earn it with real complexity
- **Idea:** Rich objects that carry both data and the behaviour that governs it pay off when rules are intricate and interconnected, because each rule has one clear home and invariants are enforced where the state lives.
- **Smell it catches:** An "anaemic" model — entities that are pure getter/setter bags while all the actual logic sits in service classes manipulating them from outside. That's a Domain Model in name only.
- **Review trigger:** A diff that adds a rich entity/aggregate but keeps every decision in a service, leaving the entity as a data holder; or, conversely, a service layer that reaches into an entity's internals to enforce an invariant the entity should own.
- **Suggestion shape:** Move behaviour and invariant enforcement onto the object that owns the state; keep services for orchestration across objects, not for logic that belongs to one object.
- **When NOT to apply:** When the "rules" are just field storage and simple CRUD, a full domain model plus its mapping layer is dead weight — see the over-engineering principle below.

### Data Mapper vs Active Record: match persistence coupling to model richness
- **Idea:** Active Record lets an object know how to save and load itself (data + persistence in one class); Data Mapper keeps a separate translation layer so domain objects stay ignorant of the database. The richer and more test-critical the domain, the more the separation pays.
- **Smell it catches:** A behaviour-heavy domain object that also carries `save()`/`find()` and a database connection, making it impossible to unit-test the logic without a database, and coupling the object's shape rigidly to the table's shape.
- **Review trigger:** A new complex aggregate implemented as Active Record; or Active Record entities where the object model and table schema are diverging (inheritance, value objects, multi-table concepts) and the pattern is fighting that.
- **Suggestion shape:** Introduce a mapper (or lean on the ORM as the mapper) so the domain object holds no persistence knowledge; reserve Active Record for objects whose structure closely mirrors a single table and whose behaviour is thin.
- **When NOT to apply:** For simple table-shaped CRUD entities with little behaviour, Active Record is less ceremony and perfectly appropriate — don't mandate a mapper layer just for purity.

### Repository: a collection-like boundary over querying
- **Idea:** A Repository presents stored aggregates as if they were an in-memory collection, hiding query construction behind intention-revealing methods so the domain and callers never assemble raw queries.
- **Smell it catches:** Query logic (JPQL/SQL/criteria building) scattered across services and controllers, the same "find active X by Y" reconstructed in several places, and callers depending on storage details.
- **Review trigger:** A new query written inline in a service, or a repository that has quietly become a passthrough exposing generic query primitives so callers still hand-build predicates.
- **Suggestion shape:** Give the repository a named, meaningful finder that expresses the business question; keep query mechanics inside it. Prefer one well-named method over a leaky generic query surface.
- **When NOT to apply:** A repository per table that only wraps `findById`/`save` with no querying variety adds indirection without payoff — a thin data-source/DAO is enough for pure CRUD.

### Unit of Work: one transaction, one tracked change set
- **Idea:** Track the objects touched during a business transaction and commit their inserts, updates, and deletes together in a single, correctly-ordered database transaction, instead of writing each change ad hoc.
- **Smell it catches:** Multiple independent saves inside one use case with no shared transaction boundary, so a mid-way failure leaves the database half-updated; or N+1 write chatter because nothing batches the flush.
- **Review trigger:** A service method that calls several repository saves/updates with no transactional boundary around them, or opens a transaction whose lifetime doesn't match the business operation (too wide or too narrow).
- **Suggestion shape:** Wrap the whole business operation in one transactional boundary (framework-managed unit of work / `@Transactional` at the use-case seam) so all writes commit or roll back atomically.
- **When NOT to apply:** A single-write operation needs no elaborate change-tracking abstraction; and don't stretch one unit of work across external calls or user think-time — see offline locking.

### Service Layer: a thin use-case seam, not a logic dumping ground
- **Idea:** A Service Layer defines the application's operations as a coarse-grained API — orchestrating domain objects, transactions, and cross-cutting concerns — giving multiple clients (UI, API, jobs) one consistent entry point.
- **Smell it catches:** Either no seam at all (controllers orchestrating transactions and domain objects directly) or a bloated service holding all the business rules while entities stay anaemic.
- **Review trigger:** Two clients (say a REST controller and a scheduled job) each re-implementing the same orchestration; or a service method hundreds of lines long that is clearly doing domain reasoning rather than coordination.
- **Suggestion shape:** Keep services thin: transaction boundary, security, orchestration, and translation — delegating actual rules to the domain. Extract shared orchestration so every client goes through the same operation.
- **When NOT to apply:** A small app with a single client and simple flows may not need a distinct service layer; a controller calling a repository directly can be honest and adequate.

### DTO: cross a boundary, not decorate every call
- **Idea:** A Data Transfer Object bundles data into a single shape to cross an expensive or contractual boundary (network, API contract, serialization), decoupling the wire/API shape from internal domain objects.
- **Smell it catches:** Domain entities serialized straight onto the API (leaking internal structure, lazy-loading traps, and coupling the contract to the schema); or, at the other extreme, DTOs mirroring entities one-to-one for in-process calls that never cross a boundary.
- **Review trigger:** A new endpoint returning a JPA entity directly; or a diff that adds a DTO + mapper for a purely internal, in-JVM method call where it buys nothing.
- **Suggestion shape:** Introduce a DTO precisely at the external boundary and map to it; internally, pass domain objects and skip the ceremony. Keep the API shape decisions in the DTO, not in the entity.
- **When NOT to apply:** In-process, same-layer calls don't need transfer objects — mapping there is pure overhead and an extra thing to keep in sync.

### Offline concurrency: optimistic vs pessimistic lock
- **Idea:** When a business transaction spans multiple requests (edit-then-save with user think-time in between), the database transaction can't protect it, so you need an explicit strategy: optimistic (detect a conflicting change at commit via a version) or pessimistic (prevent concurrent editing by reserving the record up front).
- **Smell it catches:** A read-modify-write across separate requests with no version check and no lock — last writer silently wins and clobbers the other user's change (lost update).
- **Review trigger:** An update path that loads an entity in one request and persists it in a later one without a version/timestamp column check, or without any conflict detection; or a pessimistic lock held across user interaction with no timeout/expiry.
- **Suggestion shape:** Default to optimistic (version column, reject/merge on mismatch) for low-contention edits; use pessimistic only when conflicts are frequent or a lost re-edit is genuinely costly, and always bound the lock with a timeout to avoid stranded locks.
- **When NOT to apply:** Single-request atomic updates are already covered by the database transaction — don't add offline-lock machinery there. And avoid pessimistic locking in high-throughput paths where held locks will serialize users and kill concurrency.

### Rich domain model as over-engineering for simple CRUD
- **Idea:** The whole domain-modelling apparatus (rich entities, mappers, repositories, service layer, DTO mapping) earns its keep only when business complexity is real; applied to store-and-retrieve CRUD it multiplies files and indirection while adding no capability.
- **Smell it catches:** Five layers to move one form's fields into one table; mappers translating between three near-identical shapes; "domain services" that only call a repository and return the result.
- **Review trigger:** A plan that specifies entity + mapper + repository + service + DTO + assembler for a feature whose entire behaviour is create/read/update/delete on flat data with no invariants or interacting rules.
- **Suggestion shape:** Collapse toward the complexity actually present — Transaction Script or Active Record with a thin controller — and reserve the heavier structure for the parts of the system that genuinely have rules. Let different areas of the same app use different styles.
- **When NOT to apply:** Don't over-correct: if the "simple CRUD" is a facade over rules that already exist or are clearly coming (pricing, workflow, eligibility), the lightweight choice will rot fast — size the structure to real and near-term complexity, not just today's happy path.

## Quick review checklist
- If a controller/handler contains business rules or SQL → move logic to domain/service, persistence to a data-source type.
- If the same rule is copy-pasted across several transaction scripts → extract it; if extraction keeps dragging entity state along, graduate to a domain object.
- If entities are pure getter/setter bags and all logic sits in services → anaemic model; push behaviour onto the objects that own the state.
- If a complex aggregate is Active Record with a DB connection inside it → consider Data Mapper so logic is unit-testable without a database.
- If a simple table-shaped entity gets a full mapper + repository + service + DTO stack → collapse toward Active Record or a thin script.
- If query/criteria building appears inline in a service or controller → move it behind a named repository finder.
- If a repository only exposes generic query primitives callers must assemble → replace with intention-revealing methods.
- If a use case does several saves with no shared transaction boundary → wrap the whole operation in one unit of work.
- If a transaction boundary spans external calls or user think-time → narrow it; use offline locking instead.
- If two clients re-implement the same orchestration → introduce/route through a thin service-layer operation.
- If a JPA entity is serialized directly onto an API → introduce a DTO at the boundary.
- If a DTO + mapper wraps a purely in-process call → delete the ceremony.
- If a multi-request edit persists without a version check or lock → add optimistic versioning (or bounded pessimistic lock for high contention).
- If a pessimistic lock has no timeout/expiry → require one to prevent stranded locks.
- If a plan proposes 5+ layers for flat CRUD with no invariants → challenge the complexity and size the structure to the real rules.