Status: DONE_WITH_CONCERNS
Summary: Added composer UTM preview/apply, brand-scoped redirect statistics and disable controls; uses shared form primitives, existing layout and Vietnamese translations. Async application verifies caption/destination snapshot and merges caption updates while preserving other settings. Desktop composer is unchanged.
Files: src/components/composer/utm-link-builder.jsx; src/pages/CreatePost.jsx; src/api/app-client.js; src/lib/i18n-core.js; src/lib/locales/vi-links.json.
Validation: scoped ESLint passed. Full typecheck found only src/lib/utm-links.js(48,39), default converter accepts one argument but receives context as second; notified controller/helper owner.
Concerns: Browser desktop/mobile and keyboard interaction were not exercised. No deploy performed.
Unresolved questions: None.
