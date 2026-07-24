# The Twelve-Factor App — Review Ammunition
> Distilled principles from *The Twelve-Factor App* (Adam Wiggins / Heroku) — original synthesis for architecture review, not book text.

**Why this lens matters in review:** This foundation catches the design flaws that only surface at deploy, scale, or 3am — hidden environmental coupling, state smuggled into processes, and build/runtime boundaries that leak. When a change reads fine in isolation but will misbehave across environments, break horizontal scaling, or resist automated rollout, one of these factors is usually being quietly violated.

## Principles

### Explicit declared dependencies
- **Idea:** Everything the app needs to run is named and pinned in a manifest the tooling installs into an isolated environment — nothing is assumed to already exist on the host.
- **Smell it catches:** Code that calls a system binary (`curl`, `imagemagick`, `psql`) or imports a library that was never added to the manifest; "works on my machine" because a global is present.
- **Review trigger:** A diff that shells out to a CLI tool, or a new import with no corresponding change to `pom.xml` / `package.json` / `requirements.txt` / lockfile; a version range left open where the rest of the repo pins.
- **Suggestion shape:** Add the dependency explicitly (or vendor the tool into the image), pin the version, commit the lockfile, and remove reliance on any ambient host state.
- **When NOT to apply:** The platform/runtime contract itself (the OS syscalls, the language runtime you build against) is a reasonable assumed baseline — don't try to declare the kernel.

### Config in the environment, never in code
- **Idea:** Anything that differs between deploys — credentials, hostnames, toggles, resource handles — lives in the environment, so the same build artifact runs anywhere without edits.
- **Smell it catches:** Hardcoded URLs/passwords, `if (env == "prod")` branches, per-environment config files selected by a baked-in flag, secrets committed to the repo.
- **Review trigger:** A new constant that varies by environment; a `config.prod.yaml` added alongside `config.dev.yaml`; a secret literal in source or in a checked-in properties file.
- **Suggestion shape:** Move the value to an env var / injected secret; make the code read it at startup; delete the environment-named branch. A good test: could you open-source the repo without leaking anything?
- **When NOT to apply:** Genuinely internal config that never varies between deploys (routing maps, framework wiring) belongs in code — not everything is "config." Grouped config files per env are acceptable if managed by a secrets system rather than committed.

### Backing services as attached resources
- **Idea:** Databases, queues, caches, mail, and third-party APIs are all just resources reached via a URL/handle in config — swappable without touching code, whether local or managed.
- **Smell it catches:** A local DB treated differently from a remote one in code; connection details assembled from hardcoded pieces; inability to point at a replica or a swapped provider without a code change.
- **Review trigger:** A change that special-cases "our" database vs an external one, or hardwires a broker/host so a failover or provider swap would require a redeploy of new code rather than a config change.
- **Suggestion shape:** Represent every backing service as a single opaque resource handle from config; make attach/detach a config operation, not a code operation.
- **When NOT to apply:** Don't over-abstract to swap things you will never swap — a thin indirection is enough; a full pluggable-provider framework for a single fixed dependency is speculative generality.

### Strict build / release / run separation
- **Idea:** Building code into an artifact, combining that artifact with config to make a release, and running the release are three distinct stages with a one-way flow; releases are immutable and identifiable.
- **Smell it catches:** Editing code on a running server; building on the box at boot; a release you can't uniquely name or roll back to; config baked at build time so one artifact can't be promoted across envs.
- **Review trigger:** A deploy script that compiles/pulls source at runtime, hot-patches a live instance, or lacks a versioned/immutable release identity; build-time injection of environment config.
- **Suggestion shape:** Produce one immutable artifact in build, bind config at release time to form a versioned release, and make run do nothing but execute it — with rollback = re-run an older release.
- **When NOT to apply:** Local dev with hot-reload deliberately blurs these for iteration speed — the strictness is a production discipline, not a dev-loop constraint.

### Stateless, share-nothing processes
- **Idea:** App processes hold nothing durable in memory or local disk between requests; any persistent state lives in a backing service, so any process can serve any request.
- **Smell it catches:** In-memory session stores, user data cached to local disk, "sticky session" assumptions, work that only completes because it lands on the same instance twice.
- **Review trigger:** New use of a static/in-memory map keyed by user/session, local-file writes expected to survive, or a multi-request flow that assumes affinity to one process.
- **Suggestion shape:** Push session/state into a shared store (DB, cache); treat memory and local disk as a single-transaction scratchpad only; make the flow work regardless of which instance handles each step.
- **When NOT to apply:** A short-lived in-memory cache used purely as a performance optimization (safely rebuildable, never the source of truth) is fine — statelessness is about durable state, not zero caching.

### Port binding — self-contained services
- **Idea:** The app exports its service by binding a port itself, embedding its own server rather than being injected into an external application container at runtime.
- **Smell it catches:** Deployment that depends on dropping a WAR into a shared app-server, or on an ambient webserver being pre-installed and configured on the host.
- **Review trigger:** A change assuming an external container/runtime provides the HTTP listener, or one service reaching into another via anything other than a URL to a bound port.
- **Suggestion shape:** Embed the server, bind a port from config, and let one app become another's backing service purely through that address.
- **When NOT to apply:** Sitting behind a reverse proxy / load balancer / ingress for TLS termination and routing is normal and expected — that's routing in front of a self-bound port, not a violation.

### Concurrency via the process model
- **Idea:** Scale out by running more processes of the right type (web, worker, clock), not by growing a single process ever-larger; process types are a first-class scaling unit.
- **Smell it catches:** Scaling only by adding threads/bigger boxes; one monolithic process doing web serving, background jobs, and scheduling together; work that can't be distributed because it's trapped inside one process.
- **Review trigger:** A long-running or CPU-heavy task added inline to the request path, or a new background responsibility folded into the web process instead of a distinct worker type.
- **Suggestion shape:** Split the workload into named process types that scale independently; let the process manager (not in-app daemonization) handle running, restarting, and counting them.
- **When NOT to apply:** In-process concurrency (threads, async, event loops) is still valid and often right within a process type — the factor is about the outermost scaling unit, not banning threads.

### Disposability — fast startup, graceful shutdown
- **Idea:** Processes can be started or stopped at a moment's notice; they boot quickly and, on a shutdown signal, stop taking new work, finish or safely release in-flight work, and exit cleanly.
- **Smell it catches:** Multi-minute startup; no handling of the termination signal; requests dropped or jobs half-done on shutdown; work that isn't idempotent and can't survive an abrupt crash.
- **Review trigger:** A new worker that consumes a job without making it re-runnable, a service with no graceful-shutdown hook, or heavy eager initialization that balloons boot time.
- **Suggestion shape:** Add signal handling that drains gracefully; make jobs idempotent/re-queueable so a crash mid-work is safe; trim startup so autoscaling and fast redeploys stay cheap.
- **When NOT to apply:** Some workloads legitimately need warm-up (caches, JIT, large models) — optimize and mask it (readiness gating) rather than pretending instant boot is always achievable.

### Dev/prod parity
- **Idea:** Minimize the divergence between local development, staging, and production — the time gap before code ships, the personnel gap between who writes and who operates, and the tooling gap in the stack — above all by running the same class of backing service in every environment.
- **Smell it catches:** SQLite in dev but Postgres in prod; an in-memory queue locally vs a real broker in prod; long gaps between writing code and shipping it; "it passed locally" failing on a behavioral difference.
- **Review trigger:** A change that swaps a backing service for a lighter substitute only in dev/test, or introduces a code path that only exists to paper over that substitution.
- **Suggestion shape:** Run the same service types locally (containers make this cheap); shrink the deploy gap; delete adapter code whose only job is hiding a dev-vs-prod backend mismatch.
- **When NOT to apply:** Pure unit tests with fakes/mocks are fine and desirable — parity targets integration behavior against real backing-service *types*, not banning test doubles.

### Logs as event streams to stdout
- **Idea:** The app never manages log files or routing; it writes an ordered stream of events to stdout and lets the execution environment capture, aggregate, and ship it.
- **Smell it catches:** Code opening and rotating its own log files, configuring log destinations per environment, or deciding where logs get archived.
- **Review trigger:** A change that adds file-based log handlers, log rotation, or environment-specific log-shipping logic inside the app.
- **Suggestion shape:** Emit events to stdout as a stream (structured/JSON preferred for downstream parsing); remove in-app file handling and let the platform route to the aggregator.
- **When NOT to apply:** In constrained or on-prem setups without a log-collection layer, a thin file sink may be a pragmatic bridge — but keep it at the edge (a sidecar/agent), not woven into app logic.

### Admin/one-off tasks as first-class processes
- **Idea:** Migrations, backfills, and console/REPL sessions run as one-off processes in an environment identical to the app's long-running ones — same code, same config, same release.
- **Smell it catches:** Migrations run by hand from a laptop against prod; admin scripts living outside the repo or drifting from the app's dependency set; ad-hoc SQL applied directly to production.
- **Review trigger:** A schema change or data backfill with no repo-committed, release-bound task to execute it; an operational script that pulls a different dependency version than the app.
- **Suggestion shape:** Ship one-off tasks as commands in the same codebase, run against the same release/config, and gate them like any deploy — reproducible and auditable, not manual.
- **When NOT to apply:** Genuinely exploratory, read-only investigation on a throwaway console is fine — the discipline is aimed at state-changing admin work, not every ad-hoc query.

## Quick review checklist
- If you see a shell-out or new import with no manifest/lockfile change → confirm the dependency is declared and pinned.
- If you see a hardcoded URL, credential, or `if (env == "prod")` → move it to environment config and delete the branch.
- If you see a secret literal in source or a committed properties file → pull it into an injected secret; check git history for leakage.
- If you see local special-casing of a backing service → represent it as one opaque config handle so it's swappable.
- If you see build/compile or source-pull happening at runtime, or a live server being patched → enforce build→release→run with an immutable, rollback-able release.
- If you see an in-memory session store, local-disk persistence, or sticky-session assumptions → move durable state to a shared backing service.
- If you see reliance on an external app-server providing the listener → embed the server and bind a port from config.
- If you see heavy work added to the request path → move it to a distinct worker process type that scales independently.
- If you see a consumer that isn't idempotent or a service with no shutdown handling → add graceful drain and make jobs re-runnable.
- If you see slow/eager startup added → question boot cost against autoscaling and fast redeploys; gate readiness instead.
- If you see a lighter backing service substituted only in dev/test → push for parity or justify the divergence explicitly.
- If you see in-app log files, rotation, or per-env log routing → write events to stdout and let the platform handle them.
- If you see a migration/backfill/admin action with no repo-committed, release-bound task → make it a first-class one-off process.
- If a change would force a code deploy to do what should be a config change (swap a resource, flip a toggle) → that's a config-in-code smell; externalize it.