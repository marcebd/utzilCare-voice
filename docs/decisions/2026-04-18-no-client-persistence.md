# No client-side persistence

**Status:** accepted (scope constraint)

## Context

The patient view has accessibility controls (large text, high contrast) that reset
on every page visit. The project brief explicitly stated "Do not use localStorage
or any client-side persistence." The question is whether this is a principle or a
scoping decision.

## Decision

Scope constraint for this portfolio project. No localStorage, no IndexedDB, no
cookies for client state. Accessibility preferences reset on every visit.

This is not a principle — it's a pragmatic cut. The portfolio demo is a
single-visit experience (clinician generates, patient opens once). Persisting
accessibility prefs adds code for a scenario (repeat visits) that doesn't exist
in the demo context.

**Revisit trigger:** when utzilCare-voice is embedded into the main UtzilCare
clinic dashboard. At that point, user preferences (including accessibility
settings) should persist server-side as part of the user's profile, not via
localStorage. The persistence mechanism will be the parent product's session
and user-preference system, not a standalone browser store.

## Alternatives considered

### 1. localStorage for accessibility prefs only (rejected for now)
Would take ~10 lines of code. Rejected not because it's hard but because the
brief said not to, and the portfolio context doesn't require repeat-visit
persistence. Adding it would raise the question "what else should persist?"
which leads to scope creep in a demo project.

### 2. URL query parameters for accessibility prefs (rejected)
Could encode `?contrast=high&text=large` in the patient URL. The clinician would
need to know the patient's accessibility needs at generation time, which they
might not. Also makes the URL longer and more fragile.

## Consequences

**Easier:**
- Zero persistence code on the client
- No data-retention concerns (nothing stored in the browser)
- Clean separation: all state flows from server → client, never the reverse

**Harder:**
- A patient who visits their link twice must re-enable large text / high contrast
  each time. Acceptable for a demo. Not acceptable for production.
- A future session adding "remember my preferences" must decide where to persist
  (server-side user profile, not localStorage) and plumb it through the session
  API.

## Key files

- `client/src/components/patient/AccessibilityControls.tsx` — `useState` only,
  no storage reads/writes
- `client/src/index.css` — `.large-text` and `.high-contrast` CSS classes toggled
  via `document.documentElement.classList`, cleaned up on unmount
