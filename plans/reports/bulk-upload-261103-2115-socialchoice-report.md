# Excel / CSV bulk upload delivery

Status: complete in the working tree; not committed, pushed or deployed to production.

## Delivered

- All Posts opens the existing-design import dialog with CSV template download, brand/timezone/default destinations, automatic/manual column mapping and per-row error preview.
- Real UTF-8 CSV (including BOM, multiline quotes and semicolon delimiters) and first-sheet XLSX parsing; Excel date and fractional time cells normalize correctly. Bounded file/expanded workbook sizes, row counts and content sizes.
- Atomic server-side same-brand/demo validation and draft creation; durable import receipts provide repeat-safe recovery across Node and Cloudflare restarts. No provider calls or publishing/schedule attempts occur.
- Optional Media Library/strategy references; complete paginated reference retrieval scoped to the selected brand. Existing publishing approval remains required after import.
- Vietnamese UI strings and [usage guide](../../docs/bulk-post-upload.md); root README links to the guide.

## Validation

- Focused parser/import/HTTP tests: 8/8 pass.
- Complete server regression run: 305/305 pass, including new Cloudflare authenticated import and restart replay assertions.
- Added tenant isolation assertions subsequently pass in the actual customer Worker runtime: customer B cannot import into customer A's brand, read A's imported draft, or recover A's receipt.
- Lint, typecheck and production frontend build pass. Build retains a large-main-chunk advisory; Excel parser is a separate lazy-loaded chunk.
- Real browser on an in-memory preview: XLSX imports two independent drafts; list shows both drafts with zero scheduled/published records. CSV invalid date blocks review; valid multiline Vietnamese CSV previews correctly. At390px, document width390/dialog358: no page-level horizontal overflow.
- Read-only code reviewer reports no remaining actionable findings after fixes. An initial uncertain-retry concern was rejected by the actual enabled confirm-button condition; Cancel/Back stay locked while retry remains available with unchanged request ID.

Screenshots (ignored local artifacts): `data/bulk-upload-desktop-review.png`, `data/bulk-upload-mobile-review.png`.

## Operational notes

- The first complete test run failed on an existing Wrangler log-directory sandbox permission. Re-running with project-local `WRANGLER_LOG_PATH` and `XDG_CONFIG_HOME` passed; no test gates were weakened.
- An early new HTTP test incorrectly named the database option and created two test-only brands/drafts in the default local database. The option was corrected to `dbPath`; exact IDs/content/timestamps were verified and only those two brands/drafts and associated import receipts were removed. Nothing was published. Subsequent tests and browser preview use temporary/in-memory databases.
- No production service/configuration, secrets, Meta/Whop setup or social posts were changed. Preview process must be stopped after acceptance.
- Desktop prototype support, remote media fetching and cross-import deduplication are outside this implementation. A new import is intentionally independent; safe retry applies within the same import request.

Unresolved questions: none for the implemented draft import. Production deployment is not performed.
