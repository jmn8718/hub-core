# App UI Audit - 2026-03-24

Scope: `packages/app/src` and the desktop renderer shell in `apps/app/src/renderer/src`.

Method:
- Static code audit only; no browser-based interaction pass or screenshot diffing.
- Accessibility, responsiveness, theming, performance, and anti-pattern review.
- Design-context limitation: no `.impeccable.md` or explicit product design brief was present, so this report evaluates implementation quality and generic design anti-patterns rather than brand fit.

## Anti-Patterns Verdict

Verdict: **Fail**

This UI does not read as polished product design yet. It does not have obvious 2025 AI-glassmorphism tells, but it does show several "generic utility UI" patterns that make it feel generated or under-designed:

- repeated grayscale cards and rounded containers with minimal hierarchy
- mixed blue and indigo accents without a coherent token system
- hover-only/tooltip-driven navigation and action discovery
- hard-coded Tailwind color classes spread across the codebase instead of a deliberate palette
- mobile behavior that hides controls rather than adapting them

The result is functional, but visually generic and systemically inconsistent.

## Executive Summary

- Total issues found: **10**
  - High: **4**
  - Medium: **4**
  - Low: **2**
- Most critical issues:
  1. Core filter controls disappear on mobile/tablet widths
  2. Provider download/upload/manual-export actions disappear on mobile/tablet widths
  3. Inline editing controls are not keyboard-accessible
  4. Filter controls have labels visually present but not programmatically associated
- Overall quality score: **5.8 / 10**
- Recommended next steps:
  1. Fix mobile-hidden functionality first
  2. Harden inline editing and form semantics for keyboard/screen-reader use
  3. Normalize color/focus tokens before adding more features
  4. Replace hover-only discovery patterns with always-available or responsive alternatives

## Detailed Findings by Severity

### Critical Issues

No confirmed WCAG A blockers were found from static review alone.

### High-Severity Issues

#### H1. Activity filter controls are hidden on smaller viewports
- **Location**: `packages/app/src/components/filters/Activities.tsx:116`
- **Severity**: High
- **Category**: Responsive
- **Description**: The full filter control row is wrapped in `hidden md:flex`, so type, race, subtype, date filters, and the apply action disappear below the `md` breakpoint. Only the search field remains visible.
- **Impact**: Users on smaller windows or mobile-sized web layouts cannot apply the main activity filters. This removes core list functionality instead of adapting it.
- **WCAG/Standard**: Responsive design best practice; violates the "adapt, don't amputate" principle from the frontend design guidelines.
- **Recommendation**: Provide a stacked mobile filter layout, disclosure sheet, or persistent filter drawer rather than hiding controls.
- **Suggested command**: `/i-adapt`

#### H2. Provider actions are hidden on smaller viewports
- **Location**: `packages/app/src/components/cards/ProviderRow.tsx:227`
- **Severity**: High
- **Category**: Responsive
- **Description**: Download, upload, and manual upload actions are wrapped in `hidden md:flex`, so they vanish below `md`.
- **Impact**: Provider workflows become unavailable on narrower layouts. This is especially damaging because these are operational actions, not decorative controls.
- **WCAG/Standard**: Responsive design best practice.
- **Recommendation**: Collapse actions into a compact row, overflow menu, or stacked action group on small screens.
- **Suggested command**: `/i-adapt`

#### H3. Inline editable controls are not keyboard-accessible
- **Location**:
  - `packages/app/src/components/forms/EditableText.tsx:80`
  - `packages/app/src/components/forms/EditableNumber.tsx:84`
  - `packages/app/src/components/forms/DatePicker.tsx:37`
  - `packages/app/src/components/forms/DatePicker.tsx:59`
- **Severity**: High
- **Category**: Accessibility
- **Description**: Editable controls rely on `div`, `span`, and clickable icons with mouse-only `onClick` handlers. The code explicitly suppresses a11y lints instead of implementing keyboard semantics.
- **Impact**: Keyboard-only users cannot reliably enter edit mode. This blocks editing workflows for a significant accessibility segment.
- **WCAG/Standard**: WCAG 2.1.1 Keyboard; WCAG 4.1.2 Name, Role, Value.
- **Recommendation**: Replace the clickable containers with semantic `button`s, or add `role="button"`, `tabIndex={0}`, and keyboard handlers where button semantics are not possible.
- **Suggested command**: `/i-harden`

#### H4. Filter form labels are not programmatically associated
- **Location**:
  - `packages/app/src/components/filters/Activities.tsx:56`
  - `packages/app/src/components/filters/Activities.tsx:160`
  - `packages/app/src/components/filters/Activities.tsx:172`
- **Severity**: High
- **Category**: Accessibility
- **Description**: The filter UI suppresses `noLabelWithoutControl` warnings and renders labels next to controls without `htmlFor`/`id` linkage or nested input association.
- **Impact**: Screen-reader users may hear unlabeled or ambiguously labeled controls, especially in dense filter sets where context matters.
- **WCAG/Standard**: WCAG 1.3.1 Info and Relationships; WCAG 3.3.2 Labels or Instructions.
- **Recommendation**: Give every filter control a stable `id` and bind labels with `htmlFor`, or wrap each input/select directly in its label.
- **Suggested command**: `/i-harden`

### Medium-Severity Issues

#### M1. Theming is hard-coded instead of tokenized
- **Location**:
  - `packages/app/src/components/Layout.tsx:24`
  - `packages/app/src/components/Button.tsx:7`
  - `packages/app/src/pages/AddActivity.tsx:172`
  - `packages/app/src/components/settings/ThemeSection.tsx:22`
- **Severity**: Medium
- **Category**: Theming
- **Description**: The app relies on direct Tailwind color classes for neutral, accent, state, and focus styling. A scan found roughly `307` gray references, `64` blue references, and `60` indigo references in `packages/app/src`.
- **Impact**: Theme consistency degrades as the app grows. This is already visible in mixed blue/indigo accents and duplicated dark-mode logic across components.
- **WCAG/Standard**: Design-system consistency issue; raises maintenance cost and increases regression risk.
- **Recommendation**: Introduce semantic tokens for surface, text, border, accent, success, danger, and focus states, then refactor shared controls to consume them.
- **Suggested command**: `/i-normalize`

#### M2. Touch targets are undersized in several interactive controls
- **Location**:
  - `packages/app/src/components/settings/ThemeSection.tsx:23`
  - `packages/app/src/components/IconButton.tsx:32`
- **Severity**: Medium
- **Category**: Responsive
- **Description**: The theme toggle is `w-11 h-6` and `IconButton` uses compact `px-2 py-1` sizing. These frequently fall below the recommended 44x44 touch target.
- **Impact**: Touch accuracy suffers on trackpads, touchscreens, and small windows. This is a usability issue even for non-accessibility users.
- **WCAG/Standard**: WCAG 2.5.5 Target Size (AAA); strong mobile usability guidance.
- **Recommendation**: Increase interactive hit areas to at least 44x44, even if the visible icon remains smaller.
- **Suggested command**: `/i-polish`

#### M3. Provider file checks are sequential and repeated
- **Location**: `packages/app/src/components/cards/ProviderRow.tsx:88`
- **Severity**: Medium
- **Category**: Performance
- **Description**: `checkAvailableUploadSource()` awaits `existsFile()` inside a loop and runs again after several actions. The checks are serialized per candidate.
- **Impact**: The UI pays unnecessary latency when upload candidates grow or when file checks are IPC-bound. The row feels slower than it needs to.
- **WCAG/Standard**: Performance best practice.
- **Recommendation**: Resolve candidate existence in parallel with `Promise.all`, cache the result per activity/provider, and update only the affected row after download/upload events.
- **Suggested command**: `/i-optimize`

#### M4. Settings fields persist on every keystroke
- **Location**:
  - `packages/app/src/pages/Settings.tsx:24`
  - `packages/app/src/contexts/StoreContext.tsx:31`
- **Severity**: Medium
- **Category**: Performance
- **Description**: `StoreTextField` calls `setValue` on every input change, and `setValue` writes through to the client immediately.
- **Impact**: This adds unnecessary persistence traffic and creates avoidable churn in settings workflows, especially if the desktop client writes to disk or IPC-backed storage.
- **WCAG/Standard**: Performance/interaction quality best practice.
- **Recommendation**: Debounce writes or persist on blur/submit while keeping local input state immediate.
- **Suggested command**: `/i-optimize`

### Low-Severity Issues

#### L1. Sidebar navigation relies too heavily on icon recognition
- **Location**: `packages/app/src/components/Sidebar.tsx:54`
- **Severity**: Low
- **Category**: Responsive
- **Description**: Sidebar items expose labels only through a hover tooltip pattern. On top of that, the tooltip span includes `sr-only`, which is a fragile combination for visual discoverability.
- **Impact**: First-time users must infer icon meaning. Discoverability is weaker than it should be for a primary navigation system.
- **WCAG/Standard**: UX clarity issue.
- **Recommendation**: Show text labels persistently in at least one breakpoint, or provide an expanded sidebar mode.
- **Suggested command**: `/i-clarify`

#### L2. Visual language is generic and under-differentiated
- **Location**:
  - `packages/app/src/components/Layout.tsx:24`
  - `packages/app/src/components/Button.tsx:7`
  - `packages/app/src/pages/AddActivity.tsx:178`
- **Severity**: Low
- **Category**: Theming
- **Description**: The app is heavily card-based, grayscale-first, and uses standard rounded utility styling with limited compositional contrast.
- **Impact**: The interface feels serviceable but forgettable. It does not currently communicate a strong product personality.
- **WCAG/Standard**: Anti-pattern/design quality issue.
- **Recommendation**: Define a more opinionated visual system: typography hierarchy, accent logic, fewer generic card containers, and stronger spacing rhythm.
- **Suggested command**: `/i-critique`

## Patterns & Systemic Issues

- **Hard-coded color usage is pervasive**: neutral and accent classes are repeated across dozens of files, making theme drift likely.
- **Mobile adaptation strategy is inconsistent**: multiple components use `hidden md:flex` for functional UI instead of providing alternate layouts.
- **A11y lint suppression is used to bypass semantics**: the project suppresses label and keyboard warnings in several interaction-heavy components instead of fixing the underlying structure.
- **Custom inline editors are fragile**: reusable editing primitives currently favor convenience over keyboard and screen-reader support.
- **Action density is high, but hierarchy is weak**: many controls are visually similar despite different importance levels.

## Positive Findings

- Dark mode is implemented consistently at the context level, which is a solid foundation for a stronger token system.
- Many primary actions are still semantic `button` or `Link` elements rather than click-bound `div`s.
- Form pages such as `AddActivity` mostly wrap fields in labels, which is the right baseline pattern.
- Provider workflows do attempt immediate refresh after actions, which is good operational UX even where the presentation still needs work.

## Recommendations by Priority

1. **Immediate**
   - Restore mobile access to filter and provider action controls
   - Make inline editing controls keyboard-accessible
   - Fix filter control labeling semantics

2. **Short-term**
   - Normalize color, focus, and state tokens
   - Increase touch targets for compact controls
   - Remove hover-only action discovery from key navigation paths

3. **Medium-term**
   - Refactor provider file checks and settings persistence for lower UI latency
   - Consolidate shared field and button primitives so visual states do not drift

4. **Long-term**
   - Establish a more distinct visual direction for the product
   - Reduce dependence on generic card framing and default utility compositions

## Suggested Commands for Fixes

- Use `/i-harden` to fix keyboard access, labels, and interaction semantics
- Use `/i-adapt` to redesign mobile behavior for filters and provider actions
- Use `/i-normalize` to introduce and apply theme/design tokens
- Use `/i-polish` to improve touch targets, focus states, and control consistency
- Use `/i-optimize` to reduce sequential file checks and chatty settings writes
- Use `/i-clarify` to improve navigation/action discoverability
- Use `/i-critique` after the structural fixes to push the overall visual direction beyond the current generic baseline
