# App UI Audit — 2026-03-24

## Anti-Patterns Verdict
Pass with caveats.

This does not read as obvious AI-generated UI, but it still carries several generic utility-app tells: repeated rounded cards, widespread gray/indigo fallback styling, hidden-on-mobile behavior for important actions, and a mixed token/non-token theme system that keeps reintroducing visual regressions. The product direction is clearer than a generic AI dashboard, but the implementation discipline is still inconsistent.

## Executive Summary
- Total issues found: 10
  - High: 4
  - Medium: 4
  - Low: 2
- Most critical issues:
  1. Activity filters disappear on small screens
  2. Provider row actions disappear on small screens
  3. Theme token adoption is incomplete, causing repeat dark-mode regressions in forms
  4. Navigation labels still rely on hover-only disclosure
- Overall quality score: 6.8/10
- Recommended next steps:
  1. Use `/i-adapt` to restore mobile access to filters and provider actions
  2. Use `/i-normalize` to finish migrating forms and action surfaces to shared tokens/components
  3. Use `/i-harden` to improve navigation labeling and small control accessibility

## Detailed Findings by Severity

### Critical Issues
None verified in the current state.

### High-Severity Issues

#### 1) Filters are hidden entirely on small screens
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/filters/Activities.tsx:128`
- Severity: High
- Category: Responsive
- Description: The main filter controls are wrapped in `hidden md:flex`, so only the search box remains available on smaller viewports.
- Impact: Users on narrow screens lose access to type, race, subtype, date, and gear filters. This removes core list-management functionality rather than adapting it.
- WCAG/Standard: Responsive design best practice; violates the i-frontend-design rule to not hide critical functionality on mobile.
- Recommendation: Replace the desktop-only strip with a stacked or collapsible mobile filter layout.
- Suggested command: `/i-adapt`

#### 2) Provider actions are hidden on small screens
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/ProviderRow.tsx:248`
- Severity: High
- Category: Responsive / Accessibility
- Description: Download, upload, and manual export actions are inside `hidden md:flex`.
- Impact: On smaller screens, provider reconciliation actions become unavailable even though the activity rows still render.
- WCAG/Standard: Responsive design best practice; functional parity issue.
- Recommendation: Provide a stacked action row, overflow menu, or compact icon group on small screens.
- Suggested command: `/i-adapt`

#### 3) Form theming remains fragile because token usage is incomplete
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/AddActivity.tsx:169-311`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/ActivityDetails.tsx:275-336`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/other/index.tsx:150-197`
- Severity: High
- Category: Theming
- Description: Many form and action surfaces still use hard-coded `gray`, `indigo`, `blue`, `green`, and `red` utility classes instead of shared tokens. Recent dark-mode regressions came from this split system.
- Impact: Theme changes are brittle, regressions recur, and different forms do not behave consistently across light/dark modes.
- WCAG/Standard: Design-system consistency / dark-mode reliability.
- Recommendation: Move all inputs, selects, date fields, inline status buttons, and destructive/affirmative actions onto shared theme tokens or shared form components.
- Suggested command: `/i-normalize`

#### 4) Navigation labels are effectively hover-only
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/Sidebar.tsx:54-62`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/Link.tsx:38-44`
- Severity: High
- Category: Accessibility / Responsive
- Description: Sidebar labels are hidden visually and revealed only on hover. In `Sidebar`, the label span also includes `sr-only`, which makes the hover-disclosure pattern internally inconsistent.
- Impact: Touch users and many keyboard users do not get the same navigation context. The collapsed rail depends too heavily on icon recognition.
- WCAG/Standard: WCAG 2.1 1.3.3 and 2.5.1 adjacent usability concerns; not a strict failure in every case, but a meaningful navigation clarity issue.
- Recommendation: Add persistent accessible names, keyboard-visible labels/tooltips, or a rail state that exposes text labels.
- Suggested command: `/i-harden`

### Medium-Severity Issues

#### 5) Provider row performs repeated per-card file existence checks on mount
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/ProviderRow.tsx:95-126`
- Severity: Medium
- Category: Performance
- Description: Each rendered provider row performs download/upload availability checks via async file existence calls, and Garmin rows fan out across all upload candidates.
- Impact: Large activity lists can generate substantial IPC chatter and repeated disk checks during render-heavy screens.
- WCAG/Standard: Performance quality issue.
- Recommendation: Cache file existence per activity/provider combination at the list level or centralize file availability lookup.
- Suggested command: `/i-optimize`

#### 6) Theme toggle is below comfortable touch size and uses a dense control pattern
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/settings/ThemeSection.tsx:10-29`
- Severity: Medium
- Category: Accessibility / Responsive
- Description: The visual switch is `w-11 h-6`, with a small thumb and narrow hit area.
- Impact: The control is harder to use on touch devices and for users with reduced motor precision.
- WCAG/Standard: WCAG target size guidance / mobile usability best practice.
- Recommendation: Increase the interactive target to at least 44x44 or wrap the row in a larger hit area.
- Suggested command: `/i-harden`

#### 7) Activity detail provider connection styling bypasses the theme system
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/ActivityDetails.tsx:275-336`
- Severity: Medium
- Category: Theming
- Description: The provider connection block mixes direct `border-gray-*`, `bg-white`, `bg-gray-800`, and semantic button colors inline instead of using shared button/input tokens.
- Impact: This page remains a hotspot for dark-mode inconsistencies and visual drift relative to the rest of the app.
- WCAG/Standard: Design-system consistency.
- Recommendation: Refactor the provider connection row to use shared Box/Button/Input primitives or dedicated tokenized helpers.
- Suggested command: `/i-normalize`

#### 8) Classification controls in the “other activity” card use unscoped default form styling
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/other/index.tsx:150-197`
- Severity: Medium
- Category: Theming
- Description: The inline classification selects use plain `border-gray-300 bg-transparent` styling and do not share the newer tokenized input system.
- Impact: This component is visually inconsistent with the improved filter and settings controls, and remains exposed to dark-mode/browser-control drift.
- WCAG/Standard: Theme consistency / dark-mode resilience.
- Recommendation: Convert this small form cluster to the same shared input token pattern.
- Suggested command: `/i-normalize`

### Low-Severity Issues

#### 9) Provider badges rely on fixed width chips
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/ProviderRow.tsx:228-245`
- Severity: Low
- Category: Responsive
- Description: Provider chips use `w-[80px]`, which is rigid and not content-adaptive.
- Impact: The current provider names fit, but the pattern is brittle for localization, future labels, or tighter layouts.
- WCAG/Standard: Responsive robustness.
- Recommendation: Use content-based width with min-width if alignment matters.
- Suggested command: `/i-arrange`

#### 10) Mixed visual language persists across the app shell
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/Sidebar.tsx:25-42`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/Link.tsx:15-41`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/utils/style.ts:1-50`
- Severity: Low
- Category: Theming / Anti-patterns
- Description: Some surfaces use the new slate-based token system while shell navigation still uses older gray utility classes and hover-only tooltip behavior.
- Impact: The interface feels partially migrated rather than intentionally cohesive.
- WCAG/Standard: Visual consistency / maintainability issue.
- Recommendation: Finish the shell migration to the same token vocabulary used by newer components.
- Suggested command: `/i-normalize`

## Patterns & Systemic Issues
- Hard-coded colors still appear throughout forms, detail pages, and settings despite the new token system.
- Responsive strategy is still “hide on mobile” in key workflows instead of adapting controls.
- Form controls are split between tokenized shared styling and page-local one-off styling.
- Navigation still depends too much on icon recognition and hover disclosure.
- Async row-level checks are repeated per card instead of being consolidated.

## Positive Findings
- `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/settings/FolderPathSection.tsx` now uses direct editable input semantics instead of the previous overlay-button pattern.
- `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/IconButton.tsx` has improved focus handling and larger touch targets.
- `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/contexts/LoadingContext.tsx` no longer destabilizes the list page through changing callback identities.
- `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/filters/Activities.tsx` now has proper label associations and is closer to a reusable tokenized form pattern.
- The design direction remains aligned with a calm, technical utility tool rather than drifting into generic “AI dashboard” styling.

## Recommendations by Priority
1. **Immediate**
   - Restore mobile access to filters and provider actions.
   - Stop leaving high-traffic forms on hard-coded page-local styling.
2. **Short-term**
   - Normalize provider connection UI and manual activity forms onto shared form/button tokens.
   - Fix sidebar/link labeling so navigation context is not hover-dependent.
3. **Medium-term**
   - Consolidate file existence checks for provider rows to reduce repeated IPC work.
   - Increase small touch targets such as the theme toggle.
4. **Long-term**
   - Finish migrating remaining gray/indigo one-offs into a coherent token vocabulary.
   - Unify shell, cards, and forms under the same visual language.

## Suggested Commands for Fixes
- Use `/i-adapt` to address the 2 high-severity responsive issues.
- Use `/i-normalize` to address the 4 theming/system consistency issues.
- Use `/i-harden` to address navigation labeling and small-target accessibility.
- Use `/i-optimize` to address repeated provider-row file checks.
- Use `/i-arrange` to clean up rigid chip sizing and related layout rigidity.
