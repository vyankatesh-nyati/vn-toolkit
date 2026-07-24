# Effective Java (generalized to language idioms) — Review Ammunition
> Distilled principles from *Effective Java (generalized to language idioms)* (Joshua Bloch) — original synthesis for architecture review, not book text.

**Why this lens matters in review:** This foundation catches the slow-acting design decay that unit tests rarely flag: objects that can be mutated behind your back, constructors that lie about their contracts, inheritance used where delegation was meant, and APIs that force callers to guess at nulls, magic numbers, and concrete types. In review, it converts vague unease ("this feels fragile") into named, defensible objections tied to a downstream failure mode — aliasing bugs, broken subclasses, NPEs, and untestable wiring.

## Principles

### Favor immutability
- **Idea:** A value that can't change after construction is inherently thread-safe, freely shareable, and can never drift into an inconsistent state. Model data as immutable by default; make mutability an earned exception.
- **Smell it catches:** Setters on what is conceptually a value (Money, DateRange, Coordinate); fields exposed for external mutation; defensive copies scattered everywhere to compensate for a leaky mutable core.
- **Review trigger:** A new data-carrying class with public setters or non-final fields; a class shared across threads that exposes mutators; a constructor that stores a caller-supplied collection or array reference directly.
- **Suggestion shape:** Make fields final, remove setters, return a new instance from "modify" operations (withX), take defensive copies of mutable inputs on the way in and out. In Java, prefer a `record` for plain carriers.
- **When NOT to apply:** Large objects mutated on a hot path where per-change allocation is measured and material; framework-required mutable entities (JPA managed entities need a no-arg ctor and setters); builders that accumulate state internally.

### Static factory vs constructor vs builder
- **Idea:** Constructors are the right default, but they can't be named, can't return cached or subtype instances, and collapse under many parameters. A named static factory adds intent and instance control; a builder tames many optional parameters readably and safely.
- **Smell it catches:** Telescoping constructors (`new Thing(a, b, null, null, 0, false)`); several constructors distinguished only by argument order/type; a boolean or int argument whose meaning is invisible at the call site.
- **Review trigger:** A new constructor pushing past ~4 parameters, or several optional ones; overloads that differ only by parameter type; callers passing positional booleans/nulls.
- **Suggestion shape:** Introduce a builder for many-optional construction, or a named static factory (`of`, `from`, `valueOf`) when naming or instance control adds clarity. Validate the assembled object once in `build()`.
- **When NOT to apply:** Two or three required parameters with obvious meaning — a plain constructor is clearer and a builder is ceremony. Don't add a factory that only forwards to the constructor with no added value.

### Favor composition over inheritance
- **Idea:** Inheritance couples a subclass to the internal, changeable implementation of its parent; delegating to a held instance behind an interface gives the same reuse without that fragility. Inherit only across a genuine, stable "is-a" that the parent was designed for.
- **Smell it catches:** Extending a concrete class (especially a collection or framework class) to add behavior; subclasses that break when the superclass adds a method; overrides that must know the parent's call sequence to stay correct.
- **Review trigger:** A new class `extends` a concrete, non-abstract class it doesn't own; a subclass overriding methods to intercept/augment self-calls; an inheritance hierarchy more than 2 levels deep for code reuse rather than polymorphism.
- **Suggestion shape:** Replace `extends X` with a field holding an `X` (or its interface) and forward/wrap the calls (decorator/wrapper). Reserve inheritance for classes explicitly designed and documented for it.
- **When NOT to apply:** True subtype polymorphism where callers must treat subtypes uniformly; extending abstract base classes/framework extension points designed for subclassing; sealed hierarchies modeling a closed set of variants.

### Minimize mutability and accessibility
- **Idea:** Expose the least surface that still does the job — the narrowest visibility, the smallest interface, no leaked internal state. Every public/mutable element is a promise you must keep and a coupling point others can exploit.
- **Smell it catches:** `public` fields; package internals promoted to `public` "just in case"; getters returning the live internal collection/array; a class exposing helper methods only its tests use.
- **Review trigger:** New `public` where `private`/package-private would do; a getter returning a mutable field directly; visibility widened in a diff without a caller that needs it.
- **Suggestion shape:** Tighten to the minimum visibility; return unmodifiable views or copies of collections; keep API surface to what callers genuinely need, hide the rest.
- **When NOT to apply:** Genuine public API/SPI intended for external use; test-only access better solved by testing through the public API than by widening visibility (don't loosen prod code to please a test).

### Prefer enums and typed constants
- **Idea:** A fixed set of named options should be a type the compiler enforces, not loose ints or strings. Enums (and richer typed constants) make illegal values unrepresentable and let each constant carry behavior.
- **Smell it catches:** `int`/`String` "constants" for a closed set (status = "ACTIVE", type = 1); `switch` on magic strings; validation code that exists only to reject out-of-range integer codes.
- **Review trigger:** A new parameter or field typed as `String`/`int` whose allowed values are an enumerable set; repeated `if (code == 3)`; a constants class of `public static final int`.
- **Suggestion shape:** Replace with an enum; attach per-constant behavior or data to the enum rather than branching on it externally; use the enum type in signatures so bad values can't compile.
- **When NOT to apply:** Genuinely open/extensible sets (plugin ids), values owned by an external system/protocol wire format, or sets that change at runtime — there a registry or string with validation is appropriate.

### Avoid returning null
- **Idea:** Returning null for "nothing" pushes a hidden obligation onto every caller and turns a forgotten check into an NPE far from the cause. Express absence in the type or return an empty value.
- **Smell it catches:** Methods returning `null` for "not found" or "none"; collection-returning methods that return `null` instead of an empty collection; callers wrapped in null-guards everywhere.
- **Review trigger:** A new method returning `null` on a miss; a `List`/`Map`/array return path that yields `null`; a nullable return whose contract isn't documented or typed.
- **Suggestion shape:** Return an empty collection/array for "no elements"; return `Optional<T>` (or the language's option type) for a genuine may-be-absent single value; throw for a true error condition.
- **When NOT to apply:** Hot paths where `Optional` allocation is measured and material; interop with APIs/serialization that expect null; fields and collection elements (don't stuff `Optional` into fields or collections).

### Fail fast and validate arguments
- **Idea:** Check preconditions at the boundary and reject bad input immediately with a clear error, so the failure names its cause instead of corrupting state that explodes later somewhere unrelated.
- **Smell it catches:** A public method that stores an invalid argument and fails three calls later; NPEs surfacing deep in the stack from a null that entered at the top; silent coercion of nonsensical input.
- **Review trigger:** A new public/entry method dereferencing or storing a parameter without validating it; range/nullability/invariant assumptions left implicit; a constructor that accepts values it can't actually support.
- **Suggestion shape:** Validate at the top (null checks, range/state checks) and throw a precise exception with the offending value; enforce invariants in the constructor so no invalid instance can exist; document the contract.
- **When NOT to apply:** Trusted private/internal helpers already validated by callers (don't re-check at every layer); expensive checks on hot paths where the check dominates cost; cases where the language/type system already guarantees the invariant.

### Program to interfaces, not implementations
- **Idea:** Declare variables, parameters, and return types in terms of the most general type that expresses the need. This decouples callers from concrete choices and lets the implementation change without a ripple.
- **Smell it catches:** `ArrayList<X> x = new ArrayList<>()` as a field/param/return type; signatures naming a concrete class where an interface would do; a method that can't be tested with a stub because it demands a concrete type.
- **Review trigger:** A new field/parameter/return type using a concrete class (`ArrayList`, `HashMap`, a concrete service) where an interface exists; a public API leaking an implementation type.
- **Suggestion shape:** Widen declarations to the interface (`List`, `Map`, the service interface); keep the concrete type only at the instantiation site.
- **When NOT to apply:** When you specifically need a concrete type's guarantees (e.g. a specific ordering/perf characteristic) — then name it deliberately; or when no meaningful abstraction exists and inventing one is speculative generality.

### Dependency injection over hard-wiring
- **Idea:** A class that creates or looks up its own collaborators is welded to them and hard to test or reconfigure. Pass dependencies in (constructor injection), so behavior is composable and substitutable.
- **Smell it catches:** `new ConcreteDependency()` inside a class body; static singletons or service locators fetched inline; a class that can't be unit-tested without hitting a real database/clock/network.
- **Review trigger:** A new class instantiating its own service/repository/clock/random source internally; a method reaching for a global/static to get a collaborator; tests that can't inject a fake.
- **Suggestion shape:** Inject the collaborator via constructor (behind an interface); pass in ambient dependencies like clock/UUID/random rather than calling statics; let the composition root wire concretes.
- **When NOT to apply:** Truly stable, side-effect-free, universally-correct utilities (pure functions, standard library helpers) don't need injecting; over-injecting trivial values creates ceremony. Beware turning everything into a configurable seam nobody varies.

### Consistent equals/hashCode
- **Idea:** If a type defines equality, it must obey the contract — reflexive, symmetric, transitive, consistent — and any type used as equal must produce equal hash codes, or hash-based collections silently misbehave.
- **Smell it catches:** `equals` overridden without `hashCode` (or vice versa); equality using a subset of fields inconsistently; entities used as `HashMap`/`HashSet` keys with identity equality when logical equality was intended (or mutable fields inside the hash).
- **Review trigger:** A diff overriding one of `equals`/`hashCode` but not the other; a new value type with no equality where it's used as a key or compared; equals that will break symmetry across a type hierarchy; mutable fields folded into the hash of a key.
- **Suggestion shape:** Override both together over the same fields (or use a `record`/generated pair/`EqualsBuilder`); base equality on stable identifying fields; keep hash inputs immutable while the object is a key.
- **When NOT to apply:** Reference-identity is genuinely correct (e.g. entities distinguished only by DB id, or unique lifecycle objects); don't hand-roll equality where a record or generated implementation is safer.

## Quick review checklist
- If a new data class has setters or non-final fields → ask whether it should be immutable (or a record).
- If a constructor has >4 params or several optional ones → suggest a builder or named static factory.
- If you see positional `null`/`true`/`false`/int args at a call site → the API needs naming (factory/builder/enum).
- If a class `extends` a concrete class it doesn't own → challenge it; propose composition/wrapping.
- If a getter returns a field's live collection or array → require an unmodifiable view or copy.
- If `public` appears where `private`/package-private suffices → tighten it; ask which caller needs it.
- If a closed set is modeled as `String`/`int` constants or magic values → propose an enum with behavior.
- If a method returns `null` for "not found"/"none" → suggest `Optional` or an empty collection.
- If a collection/map/array method can return `null` → make it return empty instead.
- If a public entry method uses a parameter without validating it → require fail-fast checks and a precise exception.
- If a constructor can build an object that violates its own invariant → enforce the invariant at construction.
- If a field/param/return type names a concrete `ArrayList`/`HashMap`/concrete service → widen to the interface.
- If a class does `new ConcreteDep()` or fetches a static singleton internally → inject it via the constructor.
- If code calls `System.currentTimeMillis()`/`new Random()`/`UUID.randomUUID()` inline → inject a clock/random/id source for testability.
- If a diff overrides `equals` xor `hashCode`, or uses a mutable/identity-only object as a hash key → flag the contract violation.