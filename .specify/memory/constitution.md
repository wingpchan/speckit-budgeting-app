<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0 (initial ratification)

Modified principles: N/A (first version)

Added sections:
  - Core Principles (5 principles)
  - Technology Standards
  - Development Workflow
  - Governance

Removed sections: N/A

Templates reviewed:
  - .specify/templates/plan-template.md       ✅ aligned (Constitution Check gate present)
  - .specify/templates/spec-template.md       ✅ aligned (user stories + acceptance criteria)
  - .specify/templates/tasks-template.md      ✅ aligned (TDD task ordering, phase structure)
  - .specify/templates/agent-file-template.md ✅ aligned (generic project guidance)

Deferred TODOs:
  - None. All fields resolved from project name and app domain.
-->

# Budgeting App Constitution

## Core Principles

### I. Data Integrity (NON-NEGOTIABLE)

Financial data MUST be accurate, consistent, and auditable at all times.

- All monetary values MUST use fixed-point arithmetic or a dedicated currency type;
  floating-point (`float`/`double`) is PROHIBITED for financial calculations.
- Every mutation to budget, transaction, or balance data MUST be logged with a timestamp
  and actor identifier to support audit trails.
- Database migrations MUST be reversible (down migrations provided) or explicitly
  justified as irreversible in the Complexity Tracking table.
- No financial figure may be derived without a traceable source record.

**Rationale**: Rounding errors and silent data loss in financial software erode user trust
immediately and permanently. An audit trail is required for debugging and user support.

### II. Security & Privacy

User financial data MUST be protected against unauthorized access and leakage.

- Authentication MUST be enforced on every endpoint that reads or writes user data.
- Secrets (API keys, credentials, tokens) MUST NOT appear in source code or be committed
  to version control; environment variables or a secrets manager MUST be used.
- Sensitive fields (account numbers, full transaction details) MUST NOT be logged in plain
  text at any log level.
- Dependencies MUST be reviewed for known CVEs before introduction; `npm audit` / equivalent
  MUST pass with zero high/critical findings before any release.

**Rationale**: Budgeting apps hold sensitive personal financial information. A single
exposure incident can cause irreparable reputational damage.

### III. Test-Driven Development (NON-NEGOTIABLE)

Tests MUST be written and confirmed failing before implementation begins.

- Red-Green-Refactor cycle is strictly enforced for all financial calculation logic.
- Unit tests MUST cover every monetary calculation function with boundary cases
  (zero, negative, max value, currency rounding).
- Integration tests MUST cover the primary user journeys defined in each feature's spec.
- A feature MUST NOT be marked complete unless all its associated tests pass.
- Tests for financial logic are never optional, regardless of feature spec wording.

**Rationale**: Financial bugs discovered in production are costly to remediate and
damaging to user trust. Testing gates prevent regressions.

### IV. User-Centric Design

Every feature MUST map to a concrete user need expressed as an acceptance scenario.

- Features without at least one independently testable user story MUST NOT enter
  implementation planning.
- UI flows MUST be validated against real user journeys before investing in polish.
- Feature scope MUST be the minimum needed to satisfy the user story; gold-plating
  is a constitution violation.
- Each delivered increment MUST be demonstrable to a non-technical stakeholder.

**Rationale**: Budgeting tools succeed only when users adopt them. Shipping to user
needs before technical elegance keeps the feedback loop short.

### V. Simplicity

The simplest solution that satisfies requirements MUST be preferred.

- YAGNI: No abstractions, configurations, or generics for hypothetical future use.
- Maximum 3 architectural layers unless a 4th is justified in the Complexity Tracking
  table.
- Dependencies MUST be evaluated for necessity; prefer standard library solutions
  over third-party packages for simple operations.
- Refactoring for its own sake MUST NOT be bundled with feature PRs.

**Rationale**: Premature complexity in financial code is a source of subtle bugs and
makes audits harder. Simple code is easier to verify and maintain.

## Technology Standards

Language, framework, and tooling choices MUST be documented in each feature's `plan.md`
before implementation begins.

- **Consistency**: Once a language/framework is chosen for the core application, it MUST
  be used for all subsequent features unless a migration plan is approved via the amendment
  process.
- **Dependency management**: A lock file (e.g., `package-lock.json`, `poetry.lock`) MUST
  be committed and kept up-to-date.
- **Formatting**: A project-wide formatter MUST be configured and enforced via CI. Formatting
  diffs MUST NOT appear in feature PRs.
- **Environment parity**: Development, staging, and production environments MUST use the
  same dependency versions. Docker Compose or equivalent SHOULD be provided for local setup.

## Development Workflow

All feature development MUST follow the speckit workflow:

1. **Specify** (`/speckit.specify`): Draft or update the feature spec with user stories
   and acceptance scenarios.
2. **Plan** (`/speckit.plan`): Produce `plan.md`, `data-model.md`, `research.md`, and
   API contracts. Constitution Check gate MUST pass.
3. **Tasks** (`/speckit.tasks`): Generate `tasks.md` with dependency-ordered, independently
   testable increments.
4. **Implement** (`/speckit.implement`): Execute tasks in dependency order; each checkpoint
   MUST be validated before the next phase begins.

**Pull Request Requirements**:
- Every PR MUST reference the feature spec and tasks it implements.
- PRs MUST NOT include scope beyond the tasks listed in `tasks.md`.
- All CI checks (tests, lint, security scan) MUST be green before merging.
- At least one peer review is REQUIRED for any change touching financial calculation logic.

## Governance

This constitution supersedes all other development practices and informal agreements.

**Amendment Procedure**:
1. Propose the amendment in writing with rationale and migration plan.
2. Obtain approval from the project lead (or team majority if applicable).
3. Increment the version number per semantic versioning rules.
4. Update `LAST_AMENDED_DATE` and propagate changes to dependent templates.

**Versioning Policy**:
- **MAJOR**: Removal or backward-incompatible redefinition of a principle.
- **MINOR**: New principle or section added, or material expansion of existing guidance.
- **PATCH**: Clarifications, wording fixes, non-semantic refinements.

**Compliance Review**: Every PR and code review MUST verify that the implementation
does not violate Principles I–V. Violations MUST be recorded in the Complexity Tracking
table of the relevant `plan.md` with explicit justification.

**Version**: 1.0.0 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-03-18
