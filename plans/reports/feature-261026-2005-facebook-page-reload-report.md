# Facebook Page list reload

Outcome: explicit Reload Page list action in pending Facebook selection, alongside the selection heading, with Vietnamese/English text and guidance for newly allowed Pages. Existing channels and explicit import retained.

Implementation: `src/components/accounts/MetaConnectionCard.jsx` reuses the existing OAuth start/discovery path rather than cached `meta/pages` data. Outline shared Button and Phosphor icon, busy/readiness/brand/demo guards; selection checkboxes disabled while busy. `src/lib/locales/vi-components.json` supplies translations. No backend changes, token retention, new scopes or automatic imports.

Validation: typecheck, lint, production build pass. Existing build reports chunk-size/performance warnings. Required independent reviewer DONE, no blockers. Live button click opened official Facebook with existing consent, returned a freshly discovered Deszy selection, and imported nothing. No new grant, post or channel mutation. Screenshots checked at 390x844 and 1440x900; controls fit and wrap. Temporary viewport reset. Evidence: [desktop](facebook-page-reload-proof/desktop.png), [mobile](facebook-page-reload-proof/mobile.png).

Release: Vercel `dpl_4sbqRz72F9od7oNUHLAW7LD5gdqC`, static-only `.test-tools/page-reload-release`, existing project and API routing. Production HTML/JS/CSS and policy hashes match tested dist; public health/config200, anonymous session/admin/entity401 and cross-origin login403 pass via `scripts/web-license-live-check.mjs --enabled`. Backend remains unchanged. Previous frontend `dpl_BsigqNfoXMiGH4yzvBv9mNaDgs6o` is rollback reference; preserve current backend/storage/keys. No owned background server remains.

Unresolved questions: none for implementation; new Page availability depends on the owner's Meta grant.
