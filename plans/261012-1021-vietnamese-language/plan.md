# Vietnamese interface language

Outcome: Settings offers English/Tiếng Việt; switching translates the whole UI immediately and persists after refresh.
Constraints: preserve React/Vite stack, page layouts/design tokens, all stored records/status enum keys, user captions/names and timezone calculations. No new integration or credentials.
Non-goals: translating user-authored content, changing platform connections/publication status, external translation service.
Acceptance: labels/navigation/forms/filter options/dialogs/toasts/errors/statuses/calendar/analytics localized; date/number display respects UI locale while UTC and calendar keys remain stable; English remains available; preference stored locally; existing checks plus locale tests/browser switch/refresh pass.

1. Shared locale store/catalog/interpolation and document language — complete.
2. Page and component text catalogs, live rendering and Settings selector — complete.
3. Status/format/error localization and tests — complete, 14 tests pass.
4. Coverage scan, browser language switch/persistence, review, checks and README — complete. Review findings corrected; see ../reports/vietnamese-language-261012-1021-socialchoice-report.md.

Unresolved questions: none.
