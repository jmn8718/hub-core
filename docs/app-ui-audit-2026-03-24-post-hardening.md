# App UI Audit - Post Hardening/Clarify - 2026-03-24

Scope: `packages/app/src` and the shared UI used by the desktop renderer.

This is a follow-up audit after the recent hardening and copy updates. It focuses on remaining issues rather than repeating items that are already fixed.

## Anti-Patterns Verdict

Verdict: **Borderline fail, but materially improved**

The app no longer has the strongest "unfinished utility UI" tells from the earlier pass: several semantics problems and vague copy issues were addressed. It still reads as a generic Tailwind-heavy internal tool more than a deliberate product interface because of:

- pervasive hard-coded gray/blue utility classes
- hidden-on-mobile functionality instead of adapted layouts
- icon-first navigation and hover-driven discovery
- repeated rounded card containers with limited hierarchy differentiation

It does not look like trendy AI slop, but it still lacks a distinct, calm notebook-like visual system aligned with the new design context.

## Executive Summary

- Total issues found: **8**
  - Critical: **0**
  - High: **3**
  - Medium: **4**
  - Low: **1**
- Most critical issues:
  1. Activity filters still disappear below `md`
  2. Provider row actions still disappear below `md`
  3. Folder picker overlay blocks direct text input and has poor control semantics
  4. Global loading overlay is not announced accessibly and provides no contextual status
- Overall quality score: **6.6 / 10**
- Recommended next steps:
  1. Fix the mobile-hidden functional controls
  2. Repair the folder picker/input interaction model
  3. Normalize tokens and interaction states before further feature additions

## Detailed Findings by Severity

### Critical Issues

No confirmed WCAG A blockers were found in this pass.

### High-Severity Issues

#### H1. Main activity filters are still removed on smaller viewports
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/filters/Activities.tsx:129`
- **Severity**: High
- **Category**: Responsive
- **Description**: The filter controls remain inside `hidden md:flex`, so type, subtype, race, date, and apply controls still disappear under the `md` breakpoint.
- **Impact**: Smaller-window and mobile users lose core activity list functionality rather than receiving an adapted version of it.
- **WCAG/Standard**: Responsive design best practice; violates the project’s "adapt, don’t amputate" design principle.
- **Recommendation**: Replace the hidden row with a stacked mobile filter layout, bottom sheet, or collapsible filter panel.
- **Suggested command**: `/i-adapt`

#### H2. Provider actions are still removed on smaller viewports
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/cards/ProviderRow.tsx:248`
- **Severity**: High
- **Category**: Responsive
- **Description**: Download, upload, and manual upload actions are still wrapped in `hidden md:flex`.
- **Impact**: Provider workflows become unavailable on smaller screens, which is a direct functional loss in a data-reconciliation product.
- **WCAG/Standard**: Responsive design best practice.
- **Recommendation**: Convert the actions into a compact mobile row, segmented stack, or menu instead of hiding them.
- **Suggested command**: `/i-adapt`

#### H3. Folder path fields are effectively click-trapped by an invisible overlay
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/settings/FolderPathSection.tsx:60`
- **Severity**: High
- **Category**: Accessibility
- **Description**: A full-size absolute-positioned button sits on top of the input field. This makes the input look editable while routing interaction to the folder dialog instead.
- **Impact**: Users cannot reliably interact with the text field directly, and assistive tech gets a confusing control model: a visible input plus an unlabeled overlay button.
- **WCAG/Standard**: WCAG 4.1.2 Name, Role, Value; form usability and semantic clarity failure.
- **Recommendation**: Separate the browse action into its own labeled button and leave the input directly focusable/editable.
- **Suggested command**: `/i-harden`

### Medium-Severity Issues

#### M1. Global loading overlay lacks accessible status semantics and context
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/contexts/LoadingContext.tsx:29`
- **Severity**: Medium
- **Category**: Accessibility
- **Description**: The blocking overlay shows a spinner and the generic text `Loading...`, but it has no `role="status"` or `aria-live`, and no task-specific message.
- **Impact**: Screen-reader users may not be informed that the interface is busy, and all users get weak feedback during blocking operations.
- **WCAG/Standard**: WCAG 4.1.3 Status Messages.
- **Recommendation**: Add live-region semantics and support passing contextual loading messages such as "Syncing Garmin activities" or "Saving activity".
- **Suggested command**: `/i-harden`

#### M2. Provider sync button has a duplicated screen-reader label
- **Location**: `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/providers/CardSync.tsx:151`
- **Severity**: Medium
- **Category**: Accessibility
- **Description**: The `sr-only` span renders two phrases back to back: `Syncing...` / `Sync Now` and `Sync ${provider}`.
- **Impact**: Assistive technology gets redundant or awkward announcements, which undermines the clarity work done elsewhere.
- **WCAG/Standard**: WCAG 4.1.2 Name, Role, Value.
- **Recommendation**: Collapse this into one accessible label string that reflects the current state, for example `Sync Garmin` or `Syncing Garmin`.
- **Suggested command**: `/i-harden`

#### M3. The app still relies on hard-coded color classes instead of semantic tokens
- **Location**:
  - `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/filters/Activities.tsx:99`
  - `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/IconButton.tsx:29`
  - `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/pages/ActivityDetails.tsx:297`
- **Severity**: Medium
- **Category**: Theming
- **Description**: The codebase still contains roughly `309` gray, `66` blue, and `60` indigo utility color references in `packages/app/src`.
- **Impact**: The interface remains visually inconsistent and difficult to evolve toward the desired calm, light-first design system.
- **WCAG/Standard**: Design-system consistency and maintainability issue.
- **Recommendation**: Introduce semantic tokens for surfaces, text, borders, accents, success, danger, and focus, then refactor shared primitives first.
- **Suggested command**: `/i-normalize`

#### M4. Several compact controls are still below ideal touch-target size
- **Location**:
  - `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/IconButton.tsx:32`
  - `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/settings/ThemeSection.tsx:23`
- **Severity**: Medium
- **Category**: Responsive
- **Description**: `IconButton` uses `px-2 py-1`, and the theme switch remains `w-11 h-6`. Both are tight for touch interaction.
- **Impact**: Tap precision suffers on smaller screens and touch-enabled desktops, especially in provider rows where actions are already dense.
- **WCAG/Standard**: WCAG 2.5.5 Target Size (AAA); mobile usability best practice.
- **Recommendation**: Increase hit areas to 44x44 or add invisible padding around the visible control.
- **Suggested command**: `/i-polish`

### Low-Severity Issues

#### L1. Sidebar still relies on hover-only label discovery
- **Location**:
  - `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/Sidebar.tsx:54`
  - `/Users/josemiguel/workspace-personal/w/hub-core/packages/app/src/components/Link.tsx:38`
- **Severity**: Low
- **Category**: Responsive
- **Description**: Navigation is still icon-first, with labels exposed only through hover-revealed tooltips.
- **Impact**: Discoverability stays weaker than it should be for first-time or infrequent users, especially in a non-playful utility product where clarity matters more than visual minimalism.
- **WCAG/Standard**: Information-scent and wayfinding issue.
- **Recommendation**: Add an expanded sidebar mode or persistent labels at at least one breakpoint.
- **Suggested command**: `/i-clarify`

## Patterns & Systemic Issues

- **Responsive adaptation is still the main structural weakness**: critical actions are still hidden instead of transformed.
- **Tokenization has not started**: the app remains visually coupled to raw utility classes.
- **Accessibility is improving, but still uneven**: major click-target semantics were fixed, but busy states and some composite controls remain under-specified.
- **The current UI still leans generic**: spacing and copy improved, but the visual system does not yet express the calm, technical notebook direction defined in the new design context.

## Positive Findings

- Filter controls now use proper label associations rather than suppressed a11y lint workarounds.
- Inline edit controls were upgraded to semantic buttons, which meaningfully improves keyboard access.
- Provider badges that open external links now use semantic buttons instead of click-bound text spans.
- Copy across create, link, sync, and export workflows is noticeably clearer and more consistent than in the previous audit.
- File-availability checks in the provider row now resolve in parallel, reducing avoidable latency.

## Recommendations by Priority

1. **Immediate**
   - Fix the mobile-hidden filter and provider action layouts
   - Replace the folder path overlay pattern with separate browse + input controls

2. **Short-term**
   - Add accessible status semantics and contextual messages to loading states
   - Correct the duplicated screen-reader label in provider sync controls
   - Increase touch target sizes for compact controls

3. **Medium-term**
   - Introduce semantic tokens and refactor shared primitives
   - Rework navigation labeling to improve information scent

4. **Long-term**
   - Push the visual system closer to the defined target: calm, technical, lightly athletic, and light-first

## Suggested Commands for Fixes

- Use `/i-adapt` to address the mobile-hidden functionality in filters and provider rows
- Use `/i-harden` to fix folder-path interaction semantics, loading-state announcements, and sync button labeling
- Use `/i-normalize` to establish and apply design tokens
- Use `/i-polish` to improve touch targets and interaction consistency
- Use `/i-clarify` after structural changes to tighten any remaining wayfinding and navigation language
