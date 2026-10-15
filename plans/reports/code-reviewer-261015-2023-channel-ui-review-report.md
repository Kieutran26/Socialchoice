# Channel connection UI review

## Code Review Summary

### Scope

- Files reviewed: `src/components/accounts/add-channel-dialog.jsx`, `src/components/accounts/MetaConnectionCard.jsx`, `src/components/accounts/LinkedinConnectionCard.jsx`, `src/components/accounts/TiktokConnectionCard.jsx`, `src/pages/SocialAccounts.jsx`, `src/lib/i18n-core.js`, `src/lib/locales/vi-channels.json`, plus the existing callback routes and `app-client` methods.
- Review focus: new Add channel grid, callback return handling, busy dismissal, planning references, loading failures, keyboard behavior, and preservation of existing OAuth/import contracts.
- Updated plans: none.

### Overall Assessment

The supported provider flows remain wired to the existing Meta, Threads, TikTok, and LinkedIn clients and callback query contracts. Build and typecheck pass. One user-visible flow regression must be fixed: the empty-state CTA is relabeled “Add channel” but still opens the old planning-reference form, so a new workspace cannot reach the new grid from its primary CTA.

### Critical Issues

None found.

### High Priority Findings

1. `src/pages/SocialAccounts.jsx:104-105` labels the empty-state button `Add channel` but its handler is still `setAddOpen(true)`. This opens `AddAccountDialog` instead of `AddChannelDialog`, bypassing the requested channel grid for the first and most prominent entry path. Route it to `setChannelOpen(true)` or keep the old “Add a destination” label if that action is intentionally planning-only.

### Medium Priority Improvements

1. `src/components/accounts/add-channel-dialog.jsx:32-40,64-68` waits for all four status requests before enabling any supported card. `appClient` requests have no timeout, so one stalled provider status can leave Facebook, Instagram, Threads, TikTok, and LinkedIn unavailable even when their individual status is known. Track readiness per service or add a bounded loading failure path.

2. A `meta=failed` or `meta=cancelled` return from an Instagram OAuth attempt is mapped to the locked Facebook detail card by `connectionReturnPlatform()` (`add-channel-dialog.jsx:21-24`). The existing error is still visible and the user can go back to the grid, but the direct retry view cannot switch to Instagram. If callback failures need a provider-specific retry, preserve the attempted Meta platform in the pending failure or leave the Meta platform selector unlocked for failure/cancelled returns.

### Low Priority Suggestions

- The new Vietnamese catalog leaves several new labels (`Reels`, `Video`, provider names) on the English fallback. This does not affect behavior.

### Positive Observations

- Callback URLs remain unchanged: `/accounts?meta=...`, `?threads=...`, `?tiktok=...`, and `?linkedin=...`; the dialog opens the matching card and the cards still call the original `start` and `import` methods.
- `changeOpen` blocks Radix close events while an OAuth/import action is busy, and successful imports clear the return query before closing.
- The dialog uses a Radix focus trap with a real `DialogTitle`, `DialogDescription`, keyboard-focusable platform buttons, explicit `type="button"` controls, and scrollable content.
- Unsupported YouTube, X, and Reddit tiles are visibly marked “Coming soon” and disabled; no new integration client or callback was introduced.

### Recommended Actions

1. Fix the empty-state CTA handler/label mismatch.
2. Decide whether status loading should be per-provider or bounded, then add the smallest resilient state path.
3. Decide whether Meta callback failures need platform-specific retry context; this is optional after the CTA fix.

### Metrics

- Build: passed (`npm run build`).
- Typecheck: passed (`npm run typecheck`).
- Focused ESLint parse/check: passed for `add-channel-dialog.jsx` and `MetaConnectionCard.jsx`; full `npm run lint` was run while another shared-workspace edit was in progress and returned transient parser errors, so it should be rerun on the settled revision.
- Synthetic UI checks reported by the parent agent passed for desktop grid, Facebook, Instagram `meta=select`, Threads, TikTok, LinkedIn pending import, modal close/escape, and 375px mobile overflow.
- Test coverage: not measured; no committed UI test harness was present in the focused scope.

### Unresolved Questions

- Should a Meta failure/cancelled callback retain the original Facebook versus Instagram selection for direct retry?

## Follow-up recheck

The three findings were addressed in the settled revision: the empty-state CTA opens the channel dialog, status readiness resolves independently per service, and Meta failure/cancelled returns open the generic retry grid. The initializer now uses `hasConnectionReturn`, and the manual planning fallback clears OAuth query parameters before opening. No remaining blocker found in the focused static recheck.
