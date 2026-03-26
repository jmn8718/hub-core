# App UI Audit — 2026-03-24 (Post Normalize/Harden/Optimize)

## Anti-Patterns Verdict
Pass.

This no longer reads as generic AI-generated UI. The interface has a clearer product-specific shape and the recent normalization pass reduced some of the “utility class soup” drift. The remaining issues are mostly implementation consistency problems rather than AI-slop aesthetics. The biggest anti-pattern still present is functional amputation on small screens and incomplete migration to the shared token system.

## Executive Summary
- Total issues found: 8
  - High: 3
  - Medium: 3
  - Low: 2
- Most critical issues:
  1. Activity filters still disappear on small screens
  2. Provider row actions still disappear on small screens
  3. High-traffic screens still mix tokenized UI with older hard-coded form/action styling
  4. Some detail-page controls still use underspecified dark/light styling and semantic color one-offs
- Overall quality score: 7.5/10
- Recommended next steps:
  1. Use `/i-adapt` to restore full mobile functionality for filters and provider actions
  2. Use `/i-normalize` to finish migrating remaining form/action surfaces on details, gear, and inbody flows
  3. Use `/i-harden` to clean up remaining accessibility and edge-case interaction issues on legacy controls

## Detailed Findings by Severity

### Critical Issues
None verified in the current state.

### High-Severity Issues

#### 1) Activity filters are still hidden on small screens
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/filters/Activities.tsx:128`
- **Severity**: High
- **Category**: Responsive
- **Description**: The filter controls remain wrapped in `hidden md:flex`, leaving only the search field visible on smaller screens.
- **Impact**: Users on narrow screens cannot access type, race, subtype, date, or no-gear filters. Core list management is still unavailable on mobile-sized layouts.
- **WCAG/Standard**: Responsive design best practice; violates the i-frontend-design rule against hiding critical functionality on mobile.
- **Recommendation**: Replace the desktop-only strip with a stacked mobile layout, a disclosure panel, or a compact filter drawer.
- **Suggested command**: `/i-adapt`

#### 2) Provider actions are still hidden on small screens
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/ProviderRow.tsx:276`
- **Severity**: High
- **Category**: Responsive / Accessibility
- **Description**: Download, upload, and manual export actions are still wrapped in `hidden md:flex`.
- **Impact**: Provider reconciliation remains unavailable on smaller screens even though the activity card itself is visible. This breaks parity across viewports for a core workflow.
- **WCAG/Standard**: Responsive design best practice; functional parity issue.
- **Recommendation**: Provide a small-screen variant such as stacked buttons, a compact action row, or an overflow menu.
- **Suggested command**: `/i-adapt`

#### 3) Token migration is still incomplete on high-traffic pages
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/ActivityDetails.tsx:393-537`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/AddGear.tsx:89-193`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/InbodyAdd.tsx:141-223`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/InbodyEdit.tsx:165-248`
- **Severity**: High
- **Category**: Theming
- **Description**: Recent work normalized some forms, but several high-use screens still rely on older `gray`/`indigo`/`blue` utility styling, page-local focus states, and non-tokenized buttons.
- **Impact**: The app remains visually and behaviorally inconsistent, and future theme regressions are still likely because the design system is only partially adopted.
- **WCAG/Standard**: Design-system consistency / dark-mode reliability.
- **Recommendation**: Continue the token migration through remaining create/edit/detail flows, prioritizing pages with editable form controls and status actions.
- **Suggested command**: `/i-normalize`

### Medium-Severity Issues

#### 4) Detail-page status and destructive controls still use one-off color semantics
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/ActivityDetails.tsx:402-459`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/ActivityDetails.tsx:521-537`
- **Severity**: Medium
- **Category**: Theming / Accessibility
- **Description**: The race flag toggle, delete button, subtype select, and subtype apply button still use direct utility classes instead of the newer shared button/input styles.
- **Impact**: These controls remain visually inconsistent and are more prone to theme drift than the newly normalized provider connection section.
- **WCAG/Standard**: Consistency and maintainability issue.
- **Recommendation**: Move these controls onto the same shared action/input tokens now used elsewhere on the page.
- **Suggested command**: `/i-normalize`

#### 5) Some small-screen and shell areas still use legacy hover/color patterns
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/filters/Gears.tsx:24-56`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/providers/ActionButton.tsx:24-45`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/providers/InputField.tsx:29-56`
- **Severity**: Medium
- **Category**: Theming / Hardening
- **Description**: These shared-ish controls still use hard-coded gray styling, older hover-only affordances, and local dark/light branching.
- **Impact**: They dilute the gains from the token migration and leave recurring weak points for future regressions.
- **WCAG/Standard**: Theme consistency / interaction resilience.
- **Recommendation**: Fold these controls into the same tokenized vocabulary or replace them with normalized shared components.
- **Suggested command**: `/i-normalize`

#### 6) Provider-row cache is an improvement, but cache invalidation is still narrow
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/ProviderRow.tsx:18-96`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/ProviderRow.tsx:184-221`
- **Severity**: Medium
- **Category**: Performance / Hardening
- **Description**: File existence checks are now cached, but invalidation only occurs on direct download success for the current provider activity. Manual export/upload side effects and broader lifecycle invalidation are still implicit.
- **Impact**: This is much better than before, but stale availability state is still possible in some indirect flows.
- **WCAG/Standard**: Performance and state resilience issue.
- **Recommendation**: Centralize file-availability invalidation rules around download/export/upload outcomes and consider hoisting availability state above individual rows.
- **Suggested command**: `/i-optimize`

### Low-Severity Issues

#### 7) Provider badges still use rigid minimum sizing
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/ProviderRow.tsx:256-267`
- **Severity**: Low
- **Category**: Responsive
- **Description**: The provider chips improved from fixed width to `min-w-[80px]`, but still assume short English labels and a fixed visual rhythm.
- **Impact**: Better than before, but still slightly brittle for localization or longer provider names.
- **WCAG/Standard**: Responsive robustness.
- **Recommendation**: Prefer content-led sizing with padding unless strict alignment is materially useful.
- **Suggested command**: `/i-arrange`

#### 8) Some informational/loading states still bypass tokens
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/ActivityDetails.tsx:83-91`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/GearDetails.tsx:93-101`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/DataList.tsx:204-234`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/BottomStatus.tsx:19-29`
- **Severity**: Low
- **Category**: Theming
- **Description**: Loading, empty, and bottom-status surfaces still use older gray utility classes or local dark/light branches.
- **Impact**: These are not core blockers, but they keep the app from feeling fully cohesive.
- **WCAG/Standard**: Visual consistency.
- **Recommendation**: Move passive status surfaces to tokenized text/background styles during the next consistency pass.
- **Suggested command**: `/i-normalize`

## Patterns & Systemic Issues
- The largest remaining product issue is still responsive strategy: important controls are hidden rather than adapted.
- Token migration is working, but the app is in a mixed state with both normalized and legacy surfaces.
- Legacy utility styling clusters remain concentrated in older create/edit flows and provider helper components.
- Performance posture is better after file-check caching, but some state invalidation logic is still local rather than architectural.

## Positive Findings
- `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/AddActivity.tsx` now uses shared tokenized inputs and button patterns instead of ad hoc dark/light form styling.
- `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/ActivityDetails.tsx` provider connection UI is significantly more consistent and theme-safe than before.
- `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/Sidebar.tsx` and `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/Link.tsx` now expose navigation labels more reliably and align better with the tokenized shell styling.
- `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/settings/ThemeSection.tsx` now has a larger, more touch-friendly control.
- `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/ProviderRow.tsx` now avoids repeated duplicate file existence checks and is measurably more efficient than the previous implementation.

## Recommendations by Priority
1. **Immediate**
   - Restore mobile access to activity filters and provider actions.
   - Finish token migration on remaining activity detail controls and create/edit flows.
2. **Short-term**
   - Normalize shared provider helper components and gear/inbody forms.
   - Strengthen file-availability invalidation around export/upload side effects.
3. **Medium-term**
   - Sweep passive states and loading/empty components into the token system.
   - Reduce remaining hard-coded gray/indigo branches in charts, cards, and filters.
4. **Long-term**
   - Consolidate older page-local styling into a smaller set of shared primitives.
   - Review the broader shell and card system for final consistency once responsive gaps are closed.

## Suggested Commands for Fixes
- Use `/i-adapt` to address the 2 high-severity responsive issues.
- Use `/i-normalize` to address the remaining 4 theming/system consistency issues.
- Use `/i-harden` to clean up remaining legacy interaction and edge-case control patterns.
- Use `/i-optimize` to strengthen the provider-row file availability architecture.
