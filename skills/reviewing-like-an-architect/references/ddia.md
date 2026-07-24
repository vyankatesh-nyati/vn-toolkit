# Designing Data-Intensive Applications — Review Ammunition
> Distilled principles from *Designing Data-Intensive Applications* (Martin Kleppmann) — original synthesis for architecture review, not book text.

**Why this lens matters in review:** Most production incidents in data systems are not logic bugs — they are the predictable consequences of a data-model, replication, or consistency choice that nobody stress-tested against failure, scale, or schema drift. This lens helps you catch the moment a diff quietly commits the system to a guarantee it can't keep (an assumed read-your-writes, an ignored concurrent write, a partition key that will hotspot) while the code still looks correct in the happy path. Use it to separate "works on my machine with one node and no contention" from "survives a replica lagging, a node dying mid-write, and a year of data growth."

## Principles

### Design for the three properties on purpose
- **Idea:** Reliability (keeps working when things go wrong), scalability (copes with more load along a specific dimension), and maintainability (stays cheap to operate and change) are distinct goals with distinct tactics — a change usually trades one against another.
- **Smell it catches:** A PR justified as "faster" or "cleaner" with no statement of which property it improves and what it costs the others.
- **Review trigger:** New caching layer, new async path, new denormalization, or a "temporary" retry added with no load figure, no failure-mode note, and no operability impact described.
- **Suggestion shape:** Ask the author to name the load parameter that motivated it (requests/sec, data volume, fan-out) and to state the failure behavior explicitly; add the missing dimension to the description.
- **When NOT to apply:** Genuinely small or internal-only changes where the operating envelope is already well understood — don't demand a capacity study for a config tweak.

### Percentiles, not averages, define load
- **Idea:** Response-time health lives in the tail (p95/p99), because averages hide the slow requests that hit your most valuable, highest-activity users; queueing and fan-out amplify tails.
- **Smell it catches:** SLOs, dashboards, or benchmarks stated as "average latency," or a load test that reports only the mean.
- **Review trigger:** A perf claim backed by an average; a request that fans out to N backends where any one slow shard stalls the whole response.
- **Suggestion shape:** Restate targets and alerts as high percentiles; measure tail latency under concurrency, not single-threaded.
- **When NOT to apply:** Throughput-bound batch jobs where total wall-clock, not per-item tail, is the real metric.

### Match the data model to the access shape
- **Idea:** Relational, document, and graph models each make some queries natural and others painful; the right choice follows the dominant read/write and relationship pattern, not fashion.
- **Smell it catches:** A document store used for data that's queried across many join dimensions, or a relational schema forced to emulate a tree with recursive self-joins on every read.
- **Review trigger:** New entity stored as a blob/JSON when other code clearly needs to query or index its inner fields; many-to-many relationships modeled by duplicating embedded copies.
- **Suggestion shape:** Move highly connected, many-to-many data toward relational/graph; keep self-contained aggregates as documents. Name the top three queries and check each is cheap.
- **When NOT to apply:** Schema-flexible, read-as-a-whole aggregates (e.g. a rendered page, an event payload) — a document really is the simpler fit there.

### Every index is a write tax
- **Idea:** Indexes and precomputed views speed reads by making writes do more work and consuming space; storage engines (log-structured/LSM vs. update-in-place/B-tree) trade write throughput, read latency, and space differently.
- **Smell it catches:** A migration that adds several indexes "to be safe," or a new secondary index on a high-write hot table with no read query that needs it.
- **Review trigger:** `CREATE INDEX` in a diff with no accompanying slow query it serves; a write-heavy table gaining composite indexes; choosing a store without noting its write-amplification / compaction profile.
- **Suggestion shape:** Drop indexes no query uses; confirm each new index against an actual query plan; for write-heavy paths prefer an engine tuned for ingest.
- **When NOT to apply:** Read-dominated tables where the query genuinely needs it — there the write cost is the correct trade.

### Replication lag breaks "read your own write"
- **Idea:** Asynchronous leader/follower replication means a follower can serve stale data; without deliberate handling, a user won't see their own just-committed write, and two reads can go backward in time.
- **Smell it catches:** Code that writes to the leader then immediately reads from a load-balanced replica and assumes the new value is there.
- **Review trigger:** A write-then-read flow (post a comment, then reload the list) routed to read replicas; UI logic that assumes immediate visibility of a just-saved record.
- **Suggestion shape:** Route reads that must reflect a user's own recent write to the leader (or a version-pinned replica); add read-your-writes / monotonic-read handling; or make the UI optimistically show the local write.
- **When NOT to apply:** Read paths where staleness of a few seconds is harmless (analytics, feeds) — forcing leader reads there just wastes the leader.

### Multi-leader and leaderless mean concurrent writes will conflict
- **Idea:** The moment more than one node accepts writes for the same key, two clients can update it concurrently; the system must detect and resolve that conflict, and "last write wins" silently discards data.
- **Smell it catches:** A design that writes the same record from two regions/leaders with no conflict strategy, or LWW used for data you can't afford to lose.
- **Review trigger:** Multi-region active-active, offline-then-sync clients, or a leaderless store (quorum-based) introduced without a documented conflict-resolution rule; timestamps used to pick a winner.
- **Suggestion shape:** Make conflicts converge deliberately — CRDTs/mergeable structures, application-level merge, or route each key to a single writer. Reserve LWW for data where loss is acceptable.
- **When NOT to apply:** Truly single-writer-per-key domains, or immutable append-only data where writes never contend.

### Partition on the real access pattern, and plan for hot spots
- **Idea:** Sharding spreads data and load, but a key chosen for even storage can still concentrate traffic on one partition; the partition key must spread the *load*, not just the bytes.
- **Smell it catches:** Sharding by a monotonically increasing key (timestamp, sequential ID) so all recent writes hit one partition, or by a low-cardinality field.
- **Review trigger:** A new shard/partition key that is time-ordered, a celebrity/tenant field with skew, or a design that requires scatter-gather across all partitions for a common query.
- **Suggestion shape:** Add a hashing or compound component to spread writes; special-case known hot keys; align the key with the dominant query so it hits one partition, not all.
- **When NOT to apply:** Small datasets that fit one node comfortably — premature partitioning adds rebalancing and cross-shard-query pain for no benefit.

### Secondary indexes fight partitioning
- **Idea:** A secondary index either lives with each partition (local: cheap writes, scatter-gather reads) or is partitioned by the indexed term (global: targeted reads, cross-partition writes) — there's no free option.
- **Smell it catches:** Assuming a filter-by-attribute query is cheap in a sharded store without saying how the index is partitioned.
- **Review trigger:** A sharded design that adds "search by status/email/tag" with no note on whether it fans out to every partition.
- **Suggestion shape:** Make the index strategy explicit; accept scatter-gather only for low-frequency queries, otherwise partition the index by the queried term.
- **When NOT to apply:** Single-partition data where the distinction is moot.

### State the isolation level you actually rely on
- **Idea:** Weaker isolation (read committed, snapshot/repeatable read) permits real anomalies — lost updates, write skew, phantoms — that only serializable fully prevents; most defaults are weaker than developers assume.
- **Smell it catches:** Read-modify-write logic (increment a counter, check-then-insert, decrement inventory) done in application code under a default isolation level.
- **Review trigger:** A concurrent-safe-sounding operation (balance transfer, booking, unique-check) implemented as SELECT then UPDATE without atomic operations, row locks (`SELECT … FOR UPDATE`), or a serializable transaction.
- **Suggestion shape:** Use atomic DB operations or explicit locking for the specific anomaly; raise isolation for the critical transaction; name which anomaly the code must be safe against.
- **When NOT to apply:** Genuinely commutative or single-row updates the engine already makes atomic — don't wrap everything in serializable and kill throughput.

### Consistency vs. availability is a per-operation decision, not a slogan
- **Idea:** During a network partition a system must choose between refusing writes (stay consistent) and accepting them (stay available); this choice can and should differ per operation, and network faults are inevitable, not exotic.
- **Smell it catches:** "Highly available AND strongly consistent" claimed globally, or a design that assumes the network never partitions.
- **Review trigger:** A distributed feature with no stated behavior when a node/region is unreachable; a quorum or consensus config chosen without linking it to a consistency requirement.
- **Suggestion shape:** For each critical operation, state what happens under partition (reject, degrade, serve stale) and pick the setting to match its real tolerance.
- **When NOT to apply:** Single-node or single-region systems where partition tolerance isn't a live concern — don't over-engineer for a topology you don't have.

### Idempotency is the price of at-least-once delivery
- **Idea:** Networks and retries mean any request or message can arrive more than once; correctness requires operations to be safe to repeat, usually via a client-supplied idempotency key or a dedup check.
- **Smell it catches:** A retry added around a non-idempotent side effect (charge card, send email, POST create) with no dedup; consumers of a queue that assume exactly-once.
- **Review trigger:** New retry/backoff wrapping a mutating call; a message handler that inserts or charges without a unique key; "exactly-once" asserted about a delivery path.
- **Suggestion shape:** Require an idempotency key persisted and checked before the effect; make the operation naturally idempotent (upsert on a unique constraint); treat delivery as at-least-once and dedup at the boundary.
- **When NOT to apply:** Pure reads and naturally idempotent writes (setting an absolute value) — adding a key ledger there is needless machinery.

### Batch and stream are the same computation at different latencies
- **Idea:** Streaming is unbounded, incremental processing of the same data that batch jobs process in bulk; a stream must confront event-time vs. processing-time skew, late/out-of-order events, and windowing that batch can ignore.
- **Smell it catches:** A streaming aggregation windowed on arrival time, or logic assuming events arrive in order and none arrive late.
- **Review trigger:** New consumer computing rolling counts/aggregates without stating event-time handling, watermarks, or how late data is treated; "we'll just make it real-time" with no windowing plan.
- **Suggestion shape:** Window on event time with an explicit lateness policy; make sinks idempotent so reprocessing is safe; keep a batch recompute path as the source of truth where correctness matters.
- **When NOT to apply:** Reporting that tolerates hours of latency — a periodic batch job is simpler and cheaper than a streaming pipeline.

### Schema changes must be forward- AND backward-compatible during rollout
- **Idea:** In any non-trivial deploy, old and new code (and old and new data) coexist; a schema change must let new readers understand old data and old readers tolerate new data, or the rollout breaks mid-flight.
- **Smell it catches:** Renaming/removing a field, changing its type, or making an optional field required in one shot; producers and consumers of a message/event changed in the same "atomic" PR assuming simultaneous deploy.
- **Review trigger:** A field removed or repurposed in a serialized format (event, API payload, persisted record); a required field added to a message other services already emit; enum values removed.
- **Suggestion shape:** Expand-then-contract — add the new field alongside the old, migrate readers/writers, remove the old only after nothing uses it; keep fields optional with defaults; never reuse a field tag/name for a new meaning.
- **When NOT to apply:** Truly internal, single-deploy-unit data with no persistence and no other reader — a coordinated change is fine there.

## Quick review checklist
- If a perf/scale claim cites an **average** → ask for p95/p99 under concurrency.
- If you see **write-to-leader then read-from-replica** → check for read-your-writes handling.
- If a diff **adds an index** with no query that needs it → question the write-cost.
- If a **partition/shard key is time-ordered or low-cardinality** → flag the write hot spot.
- If the **same key can be written from two places** (multi-region, offline sync, quorum) → demand a conflict-resolution rule; reject silent last-write-wins for valuable data.
- If a **read-modify-write** (counter, balance, inventory, check-then-insert) runs in app code → check isolation level, atomic ops, or locking.
- If a **retry/backoff** wraps a mutating call → require idempotency-key or dedup.
- If a handler or docstring claims **exactly-once delivery** → treat as at-least-once and find the dedup.
- If a **distributed operation has no stated partition behavior** → ask what happens when a node/region is unreachable.
- If a **field is renamed, retyped, removed, or made required** in a serialized format → require expand-then-contract compatibility.
- If **producer and consumer** of an event/API change in one PR → verify it survives a staggered deploy.
- If a **streaming aggregate** is windowed → confirm event-time windowing and a late-data policy.
- If a **document store** holds data queried on many inner fields → reconsider the model.
- If a **sharded store gains a filter/search query** → ask how the secondary index is partitioned.
- If a change is justified as "faster/cleaner" alone → make it name which of reliability/scalability/maintainability it buys and what it costs.