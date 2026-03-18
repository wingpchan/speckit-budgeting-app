<!--
SYNC IMPACT REPORT
==================
Version change: 1.2.0 → 1.3.0 (generic CSV parsing added as NON-NEGOTIABLE principle)

Modified principles: None

Added sections:
  - Principle VI: "Generic CSV Parsing (NON-NEGOTIABLE)" — mandates auto-detecting,
    data-driven, extensible CSV parsing; prohibits hardcoded bank-specific logic.

Removed sections: None

Templates reviewed:
  - .specify/templates/plan-template.md       ✅ aligned (Constitution Check gate is dynamic;
                                                 planners will now include Principle VI checks)
  - .specify/templates/spec-template.md       ✅ aligned (technology-agnostic; no conflicts)
  - .specify/templates/tasks-template.md      ✅ aligned (illustrative tasks; no conflicts)
  - .specify/templates/agent-file-template.md ✅ aligned (generic guidance; no conflicts)

Governance update: Compliance Review reference updated from "Principles I–V" to "Principles I–VI".

Follow-up TODOs: None. All fields resolved.
-->

# Budgeting App Constitution

## Core Principles

### I. Data Integrity (NON-NEGOTIABLE)

Financial data MUST be accurate, consistent, and auditable at all times.

- All monetary values MUST use fixed-point arithmetic or a dedicated currency type;
  floating-point (`float`/`double`) is PROHIBITED for financial calculations.
- Every mutation to budget, transaction, or balance data MUST be recorded with a
  timestamp so the user can inspect or reconstruct their financial history.
- localStorage data schemas MUST be versioned; when a schema change is introduced,
  a migration function MUST be provided that upgrades existing stored data without
  data loss.
- No financial figure may be derived without a traceable source record.

**Rationale**: Rounding errors and silent data loss in financial software erode user
trust immediately and permanently. Schema versioning protects users who return to
the app after an update from silent data corruption caused by a changed data shape.

### II. Security & Privacy

User financial data MUST be protected against unauthorized access and leakage.

- No secrets, API keys, or credentials MUST appear in source code or be committed
  to version control.
- Sensitive fields (account numbers, full transaction details) MUST NOT be written
  to `console.log` or any third-party analytics endpoint.
- localStorage data is accessible to all JavaScript on the same origin; third-party
  scripts MUST be reviewed and minimized to reduce the attack surface on stored
  financial data.
- Dependencies MUST be reviewed for known CVEs before introduction; `npm audit` /
  equivalent MUST pass with zero high/critical findings before any release.

**Rationale**: Budgeting apps hold sensitive personal financial information. A single
exposure incident can cause irreparable reputational damage. In a client-side app the
primary risk vector is malicious or compromised third-party scripts accessing
localStorage.

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

### VI. Generic CSV Parsing (NON-NEGOTIABLE)

CSV parsing MUST be generic, auto-detecting, and data-driven. No bank-specific logic
MAY be hardcoded anywhere in the application.

- The CSV parser MUST auto-detect column semantics (date, amount, description, balance,
  etc.) from header names and data patterns, without prior knowledge of the source bank.
- Bank-specific parsing rules MUST NOT be encoded in application logic. All format
  variations MUST be expressed as configuration or data (e.g., a mapping registry or
  declarative rule set).
- The parsing rule system MUST be extensible: adding support for a new bank statement
  format MUST require only a data or configuration change — never a code change.
- The parser MUST handle common UK bank CSV conventions (varying column orders, date
  formats such as DD/MM/YYYY, credit/debit split columns, running balance columns)
  without branching on bank identity.
- When column mapping is ambiguous, the parser MUST surface a structured error or
  prompt for user clarification rather than silently misclassifying fields.

**Rationale**: UK banks export statements in dozens of incompatible CSV layouts.
Hardcoding per-bank logic creates a fragile maintenance burden: every new bank or
format change requires a code release. A generic, data-driven approach keeps the
parser resilient, auditable, and extensible without touching business logic. This
principle is non-negotiable because violations directly undermine Data Integrity
(Principle I) and Simplicity (Principle V).

## Technology Standards

**Architecture Constraint (NON-NEGOTIABLE)**: This is a client-side only application.
There is NO backend server, NO API endpoints, and NO database. `localStorage` is the
sole persistence mechanism. Any proposal to introduce a backend or remote data store
MUST go through the full amendment procedure before any implementation work begins.

**Approved Tech Stack (NON-NEGOTIABLE)**: The following libraries and tools MUST be
used for all features. Substitutions or additions MUST go through the full amendment
procedure before any implementation work begins.

| Concern | Approved Choice | Version |
|---|---|---|
| UI framework | React | 18.x |
| Language | TypeScript | latest stable |
| Bundler | Vite | latest stable |
| Styling | Tailwind CSS | latest stable |
| Data visualisation | Recharts | latest stable |
| Testing | Vitest | latest stable |

Language, framework, and tooling choices MUST be documented in each feature's `plan.md`
before implementation begins. The Technical Context section of every `plan.md` MUST
reflect the approved stack above — "NEEDS CLARIFICATION" is not acceptable for fields
covered by this table.

- **Dependency management**: A lock file (`package-lock.json`) MUST be committed
  and kept up-to-date.
- **Formatting**: A project-wide formatter MUST be configured and enforced via CI.
  Formatting diffs MUST NOT appear in feature PRs.
- **Build parity**: The local development build and the production build MUST use the same
  dependency versions and produce functionally identical output.

## Development Workflow

All feature development MUST follow the speckit workflow:

1. **Specify** (`/speckit.specify`): Draft or update the feature spec with user stories
   and acceptance scenarios.
2. **Plan** (`/speckit.plan`): Produce `plan.md`, `data-model.md`, `research.md`, and
   UI/component contracts. Constitution Check gate MUST pass.
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
does not violate Principles I–VI. Violations MUST be recorded in the Complexity Tracking
table of the relevant `plan.md` with explicit justification.

**Version**: 1.3.0 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-03-18
