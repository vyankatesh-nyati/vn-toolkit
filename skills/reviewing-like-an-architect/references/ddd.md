# Domain-Driven Design — Review Ammunition

> Distilled principles from *Domain-Driven Design* (Eric Evans) — original synthesis for architecture review, not book text.

**Why this lens matters in review:** This foundation helps you catch the slow-motion failures that no single test will flag: code that models the database instead of the business, terms that mean different things in different files, logic that leaks out of the objects that own the data, and modules that fuse together until every change ripples everywhere. You use it to judge whether a change keeps the model expressive and the boundaries honest, or quietly erodes both.

## Principles

### Ubiquitous language
- **Idea:** The words in the code, the tests, the tickets, and the conversation with domain experts should be the *same* words. When a business person says "settlement" the class should be `Settlement`, not `TxnProcessor`.
- **Smell it catches:** A translation layer living in people's heads — devs saying "what the users call an order is our `Job` entity." Method names that describe mechanics (`process`, `handle`, `doUpdate`) instead of domain intent.
- **Review trigger:** New class/method names that no domain expert would recognize; a ticket that uses one term and the diff that uses another; comments that exist only to map a code name back to a business concept.
- **Suggestion shape:** Rename to the domain term; push the vocabulary back into the ticket/spec so language converges. If the term is genuinely ambiguous, that ambiguity is the real finding — flag it for the expert.
- **When NOT to apply:** Pure technical plumbing (serializers, retry policies, connection pools) has no domain expert and shouldn't be forced into business vocabulary.

### Bounded contexts
- **Idea:** A model is only coherent within a boundary. The same word ("customer", "product") legitimately means different things in billing vs. fulfillment vs. support — so give each context its own model rather than one god-model everyone fights over.
- **Smell it catches:** A single shared entity with dozens of nullable fields, half of them meaningful only to one team. Constant merge conflicts and cross-team coupling on one "core" class.
- **Review trigger:** A change adds a field/method to a widely-shared model to serve one specific use case; an import crosses what should be a context boundary and reaches into another area's internals.
- **Suggestion shape:** Split the concept per context; let each context keep its own representation and translate at the edge. Make the boundary explicit in package/module structure.
- **When NOT to apply:** A genuinely small, single-team system with one consistent meaning per term doesn't need multiple contexts — premature partitioning adds ceremony with no payoff.

### Context mapping
- **Idea:** Where two contexts meet, name the relationship honestly — who is upstream, who conforms, who translates, what the contract is — so integration is a deliberate design decision, not an accident.
- **Smell it catches:** Two services sharing a database table or a serialized model "for convenience." Undocumented assumptions about another team's data shape that break silently on their next release.
- **Review trigger:** A new integration between modules/services with no defined contract; direct reads into another context's storage; a shared DTO library that both sides can mutate freely.
- **Suggestion shape:** Define the relationship explicitly (published contract, conformist, shared kernel with joint ownership, or a translation layer). Pick one intentionally and document which it is.
- **When NOT to apply:** Two modules genuinely inside the *same* context and owned by the same team don't need a formal map between them.

### Entities vs. value objects
- **Idea:** Some things matter because of *who they are* across time and state changes (an account, an order) — those need stable identity. Others matter only for *what they are* (a money amount, a date range, an address) — those should be immutable and compared by value.
- **Smell it catches:** Identity assigned to things that are really just values (an `Address` entity with a DB id nobody uses meaningfully); or mutable "value" objects shared by reference and mutated in place, causing spooky action at a distance.
- **Review trigger:** A new class with an id field but no real lifecycle; a `setX` on something that should be replace-whole (money, coordinates, quantities); equality overridden on an entity by field instead of by identity.
- **Suggestion shape:** Make values immutable with value-based equality (records/value types); reserve identity and mutability for things with a true lifecycle. Replace value mutation with "return a new value."
- **When NOT to apply:** A framework that mandates mutable entities (e.g. ORM-managed rows) constrains this — accept managed mutability there rather than fighting the tool.

### Aggregates and invariant boundaries
- **Idea:** Group objects that must stay consistent together into an aggregate with one root as the only entry point. The aggregate boundary is exactly the set of things that must be transactionally consistent; everything outside is referenced by id and made consistent eventually.
- **Smell it catches:** Invariants enforced by scattered checks across services; loading a huge object graph to change one field; external code reaching past the root to mutate an inner object, bypassing the rules.
- **Review trigger:** A repository/setter that hands out internal child objects for outside mutation; a transaction that locks several unrelated aggregates at once; a "just add a reference" that turns into a giant tangled cluster loaded on every request.
- **Suggestion shape:** Route all changes through the root; keep aggregates small (favor referencing other aggregates by id); move cross-aggregate consistency to eventual consistency / domain events.
- **When NOT to apply:** Reporting/read paths and analytics don't need aggregate discipline — don't force them through roots; use dedicated read models.

### Domain services
- **Idea:** Some domain operations aren't a natural responsibility of any single entity or value (a funds transfer between two accounts, a pricing calculation over many inputs). Model those as a stateless domain service named for the activity — still domain, still ubiquitous language.
- **Smell it catches:** Contorting an operation onto one entity just because it "had to go somewhere" (`account.transferTo(...)` that really coordinates two accounts and a policy); or the opposite — the logic leaks into a controller/application layer.
- **Review trigger:** A method that reads and mutates several aggregates and belongs to none; business rules appearing in a controller, handler, or utility class.
- **Suggestion shape:** Extract a named, stateless domain service expressed in domain terms; keep it thin and free of infrastructure concerns.
- **When NOT to apply:** Don't create a service for behavior that clearly belongs on one entity — that produces an anemic model (see below). Services are for genuinely cross-object operations, not a default home for all logic.

### Repositories
- **Idea:** A repository gives the illusion of an in-memory collection of aggregate roots — you ask it for domain objects by domain-meaningful criteria, and persistence details stay hidden behind it. It abstracts *where things live*, not *what they are*.
- **Smell it catches:** Query and mapping logic smeared across services; repositories that return raw rows/DTOs instead of reconstituted aggregates; a "repository" that also holds business rules or exposes SQL/query-builder objects to callers.
- **Review trigger:** Domain code building queries directly; a repository interface leaking storage types (result sets, ORM criteria, pagination internals) into the domain; repositories returning partial/child objects instead of whole roots.
- **Suggestion shape:** Give one repository per aggregate root, expose intention-revealing finders, return fully-formed aggregates, and keep the storage technology behind the interface.
- **When NOT to apply:** Simple read-only queries for screens/reports are fine as direct, optimized reads — don't route every list view through aggregate reconstitution.

### Anti-corruption layer
- **Idea:** When integrating with a legacy system or an external model you don't control, build a translation layer that converts *their* concepts into *your* clean model, so their design flaws don't seep into and corrupt yours.
- **Smell it catches:** A third-party or legacy vocabulary and data shape spreading through your codebase; domain objects carrying fields that exist only because "that's how the vendor API returns it."
- **Review trigger:** External DTOs (payment gateway, legacy service, vendor SDK types) used directly deep inside domain logic; the external system's quirks (magic codes, weird nullability) being handled in business code rather than at the boundary.
- **Suggestion shape:** Introduce an adapter/facade that maps external models to your domain at the edge; keep external types quarantined to that layer.
- **When NOT to apply:** For a trivial, stable, well-modeled external API used in one place, a full ACL is over-engineering — a thin mapper is enough.

### Keep the domain isolated from infrastructure
- **Idea:** The domain model should depend on nothing technical — no framework, ORM, HTTP, messaging, or serialization concerns inside it. Infrastructure depends on the domain, never the reverse (dependencies point inward).
- **Smell it catches:** Persistence and framework annotations, transaction management, HTTP status codes, or JSON concerns living in entities; domain classes importing web/ORM/broker packages.
- **Review trigger:** A new import of a framework/persistence/transport package inside a domain class; business rules embedded in a controller, DAO, or serializer; a domain object that can't be unit-tested without a database or Spring context.
- **Suggestion shape:** Move technical concerns to an infrastructure/adapter layer; depend on interfaces owned by the domain; make the model plain and independently testable.
- **When NOT to apply:** Some ORMs require minimal annotations on entities — a pragmatic, contained amount of mapping metadata is an acceptable compromise, not a violation to purge dogmatically.

### Anemic domain model (anti-pattern)
- **Idea:** Objects that are just bags of getters/setters with all the behavior living in "service" classes aren't a domain model — they're data structures with a procedural program bolted on. Behavior should live with the data and rules it governs.
- **Smell it catches:** Entities with only fields and accessors; fat service classes that reach into objects, read their state, compute, and write it back; invariants enforceable only if you remember to call the right service in the right order.
- **Review trigger:** A new entity with nothing but `get/set`; a service method that pulls an object's fields out, applies rules, and stuffs results back; validation/business rules sitting outside the object they constrain.
- **Suggestion shape:** Move the rule and the state-changing operation onto the object that owns the invariant; make illegal states unrepresentable by construction; shrink the service to orchestration only.
- **When NOT to apply:** DTOs, API request/response models, projections, and read models are *supposed* to be data-only — anemia is correct there. The anti-pattern is only about the *domain* model.

## Quick review checklist
- If a new class/method name wouldn't be recognized by a domain expert → push it toward the ubiquitous language.
- If one shared "god" entity is gaining fields to serve a single team → consider splitting by bounded context.
- If two modules/services share a table or serialized model → define an explicit context-mapping relationship instead.
- If an external/legacy DTO appears deep in domain logic → introduce or extend an anti-corruption layer.
- If a domain class imports a framework/ORM/HTTP/messaging package → move the concern to infrastructure.
- If a new entity has only getters/setters and a service holds all its logic → move behavior onto the entity (anemic-model smell).
- If a "value" has a `setX` and is shared by reference → make it immutable with value equality.
- If something has a DB id but no real lifecycle → it's probably a value object, not an entity.
- If outside code mutates an aggregate's inner object directly → route it through the root.
- If a single transaction spans several aggregates → question the boundary; consider eventual consistency.
- If business rules live in a controller/handler/util → extract to an entity or a named domain service.
- If a repository returns rows/DTOs or leaks query types → have it return whole aggregate roots and hide storage.
- If an operation touches multiple aggregates and belongs to none → model it as a domain service, not a forced entity method.
- If a domain object can't be unit-tested without a DB or framework context → its dependencies point the wrong way.
- If a comment exists only to map a code name to a business term → rename the code and delete the comment.