# Vietnamese interface delivery

Project D:\Socialchoice. Date 2026-10-12, Asia/Saigon.

## Behavior

Settings → Language adds English/Tiếng Việt. Switching changes the active interface immediately; localStorage preference socialchoice.language survives reload and synchronizes across same-origin tabs. New browsers retain the previous English default. Document language/title follow the selection.

React hooks and owned Vietnamese catalogs localize the 11 active pages and shared components: navigation, headings, actions, fields, placeholders, dialogs, filters, validation, notifications, empty states, strategy, calendar, analytics, status labels and stored system diagnostics. Platform names use human-readable locale labels. Calendar date/number display uses Intl locale formatting; identifiers, API enum keys and stored UTC timestamps remain unchanged. User-authored names, titles and captions are never translated.

Preserved layout/CSS/font/palette/Phosphor/skewed-button design. No new dependencies, translation API, credential requirement or social integration/status claim.

Files: src/lib/i18n-core.js, src/lib/i18n.jsx, src/lib/locales/vi-{common,components,pages}.json; shared constants/format/AuthContext/App; active page and component text surfaces; Settings selector; native form validation; server/i18n.test.js; README.

## Verification

- 14 tests pass (existing seven plus locale/interpolation/store/format/native-validation coverage). Catalog placeholders preserved, unknown strings/prototype-like keys safe, empty Vietnamese plural suffix supported, blocked browser storage handled, dynamic platform/status labels update, UTC/calendar keys remain stable.
- ESLint/typecheck pass. Production build passes; existing large-bundle warning remains.
- AST scan: 522 catalog keys, zero missing static t keys; unwrapped JSX text only socialchoice and the self-names English/Tiếng Việt.
- Browser en→vi→en→vi switches settings/sidebar/title immediately; refresh retains Tiếng Việt. Form labels, required-field validation, draft-save toast, modal, filters and statuses verified in Vietnamese.
- Brand named Settings and post titled Draft with English caption stayed byte-for-byte unchanged in database; status remained draft. Only test records created by this run removed afterward.
- Calendar month uses tháng 10 năm 2026, weekdays T2–CN; week range displays 12/10/2026 → 18/10/2026 without changing ISO keys. Strategy platform summary shows Chỉ Trang Facebook while query enum stays facebook. Analytics and remaining active screen headings verified.
- Independent review findings fixed: malformed English All statuss → All statuses; internal platform code display → locale label; ISO/count display surfaces → locale formatters. No backend schema, publishing lifecycle or user records migrated.

Screenshot: vietnamese-settings-261012-1021.jpg. Source checkpoint captured during implementation: plans/261012-1021-vietnamese-language/source-checkpoint.zip.

Browser/OS chrome (native date picker and system dialogs) follows browser settings; application labels and validation messages are localized. Preference is per browser, matching the current local-only workspace.

Cleanup: test API PID 59088 (3001) and frontend PID 61164 (5173), both in D:\Socialchoice, stopped after validation. Final port check shows neither listening. Test browser closed; chosen Vietnamese browser preference retained. No existing user records removed.

Unresolved questions: none.
