# App UI Audit — 2026-03-24

## Anti-Patterns Verdict

Pass, with caveats.

This does not read as generic AI-generated UI. The product has a consistent utilitarian shape, restrained copy, and provider-specific workflows that feel product-driven rather than template-driven. The main recurring anti-pattern is not visual slop, but functional amputation on small screens: critical controls are still hidden instead of adapted. There is also a partial design-token migration, so some newer screens feel coherent while older surfaces still fall back to one-off Tailwind color branches.

## Executive Summary

- Total issues: 7
  - High: 2
  - Medium: 3
  - Low: 2
- Most critical issues:
  1. Activity filters disappear on small screens.
  2. Provider action buttons disappear on small screens.
  3. Token migration remains incomplete on gear/settings/shell surfaces.
- Overall quality score: 7.6/10
- Recommended next steps:
  1. Restore small-screen access to filters and provider actions.
  2. Finish token migration on remaining high-traffic screens.
  3. Clean up remaining hard-coded status/action styling and checkbox/input variants.

## Detailed Findings by Severity

### Critical Issues

None.

### High-Severity Issues

#### 1) Activity filters are removed from the small-screen experience
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/filters/Activities.tsx:128`
- Severity: High
- Category: Responsive
- Description: The full filter control group is wrapped in `hidden md:flex`, which removes type, race, subtype, gear, and date controls entirely below the `md` breakpoint.
- Impact: Users on smaller screens cannot perform the main reconciliation workflow. Search remains available, but filtering by training type/date/gear is a core task in this product.
- WCAG/Standard: Violates the responsive principle from the design system guidance: do not hide critical functionality on mobile.
- Recommendation: Replace hiding with an adaptive mobile layout such as a stacked filter sheet, collapsible section, or inline two-row layout.
- Suggested command: `/i-adapt`

#### 2) Provider actions are removed from the small-screen experience
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/ProviderRow.tsx:276`
- Severity: High
- Category: Responsive
- Description: Download, upload, and manual-upload actions are wrapped in `hidden md:flex`, so the action row disappears entirely on smaller screens.
- Impact: Users cannot complete provider reconciliation from small screens. This blocks file transfer workflows and provider management on activity cards.
- WCAG/Standard: Responsive usability failure; critical actions should be adapted, not removed.
- Recommendation: Keep actions available on all breakpoints via an overflow menu, wrapped button row, or compact icon stack with preserved labels/accessibility.
- Suggested command: `/i-adapt`

### Medium-Severity Issues

#### 3) Design-token migration is still incomplete on gear detail provider actions
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/GearDetails.tsx:125`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/GearDetails.tsx:153`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/GearDetails.tsx:167`
- Severity: Medium
- Category: Theming
- Description: The gear detail provider connection rows still use raw `border-gray-*`, `text-gray-*`, and `hover:bg-gray-*` branches instead of the shared tokenized action/input styles used elsewhere.
- Impact: This page now diverges visually from normalized activity detail flows and remains more fragile when theme tokens change again.
- WCAG/Standard: Internal design-system consistency issue.
- Recommendation: Move these rows to the same shared action/button and panel token classes used in activity detail/provider connection UIs.
- Suggested command: `/i-normalize`

#### 4) Settings text fields still bypass the shared input token system
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/Settings.tsx:34`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/Settings.tsx:39`
- Severity: Medium
- Category: Theming
- Description: The default city/country fields still hard-code dark/light gray and blue focus classes instead of using the shared input and label tokens.
- Impact: Settings remains one of the remaining places where dark-mode regressions can reappear independently of the token system.
- WCAG/Standard: Internal design-system consistency issue.
- Recommendation: Replace the local style string with the same shared input/label primitives used by normalized forms.
- Suggested command: `/i-normalize`

#### 5) App shell background still relies on raw dark/light color branching
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/Layout.tsx:29`
- Severity: Medium
- Category: Theming
- Description: The root layout still switches between `bg-gray-900` and `bg-gray-100` directly rather than using a shell/background token.
- Impact: Global visual consistency is still partially managed in component code, which weakens the token migration and makes future palette changes more expensive.
- WCAG/Standard: Internal design-system consistency issue.
- Recommendation: Introduce or reuse a shell/background token and consume it here so page chrome follows the same theme contract as panels/buttons/inputs.
- Suggested command: `/i-normalize`

### Low-Severity Issues

#### 6) Some controls still use one-off color classes instead of shared semantic variants
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/settings/SignOutSection.tsx:35`
- Severity: Low
- Category: Theming
- Description: The sign-out action still uses hand-written blue button classes instead of the shared button variant system.
- Impact: Low direct user impact, but it leaves small pockets of inconsistent interaction styling in the settings area.
- WCAG/Standard: Internal consistency issue.
- Recommendation: Convert this to the shared button component or a semantic token-backed variant.
- Suggested command: `/i-normalize`

#### 7) Filter checkbox styling still bypasses shared theme tokens
- Location: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/filters/Activities.tsx:177`
- Severity: Low
- Category: Theming
- Description: The `Running without gear` checkbox still uses fixed `border-gray-300 text-blue-600 focus:ring-blue-500` styling while the surrounding filter inputs are tokenized.
- Impact: This is a smaller inconsistency, but it is exactly the kind of control that tends to drift in dark mode and high-contrast states.
- WCAG/Standard: Internal consistency issue.
- Recommendation: Introduce a shared checkbox/radio control token or local semantic class that follows the theme contract.
- Suggested command: `/i-normalize`

## Patterns & Systemic Issues

- Responsive strategy is still using control removal in two core workflows instead of adaptation.
- Token migration is progressing, but several shell/settings/gear surfaces still carry legacy dark/light class branches.
- Form primitives are more standardized now, but checkboxes and a few action buttons still sit outside the shared styling path.

## Positive Findings

- `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/ActivityDetails.tsx` is materially improved: race toggle, subtype controls, destructive action, and provider linking are now much closer to the shared token system.
- `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/AddGear.tsx`, `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/InbodyAdd.tsx`, and `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/InbodyEdit.tsx` are no longer the largest theming outliers.
- The product still avoids common AI-slop tells: no gratuitous gradients, no glassmorphism, no generic metric-dashboard hero patterns, and no over-designed decorative noise.
- Provider workflows remain understandable and purpose-built, which supports the product’s technical/utilitarian design direction.

## Recommendations by Priority

1. **Immediate**
   - Restore small-screen access to activity filters.
   - Restore small-screen access to provider actions.
2. **Short-term**
   - Finish token migration on `GearDetails`, `Settings`, and the shell background.
   - Normalize remaining one-off action/button styles.
3. **Medium-term**
   - Introduce shared checkbox styling and continue removing raw dark/light class branches from high-traffic components.
4. **Long-term**
   - Audit charts, summaries, and older card variants for the same token migration gaps once the core workflow surfaces are complete.

## Suggested Commands for Fixes

- Use `/i-adapt` to restore mobile access to filters and provider actions.
- Use `/i-normalize` to finish token migration on gear detail, settings, shell, and remaining control variants.
- Use `/i-harden` after adaptation to confirm mobile controls preserve accessibility and touch-target quality.
- Use `/i-audit` again after those changes to confirm the responsive issues are fully closed.
