# Bulk upload: Excel / CSV

Open **All Posts → Import Excel / CSV**. Select one active brand, an IANA timezone, and optional default destinations. Download the CSV template, fill it in Excel or another spreadsheet editor, then choose a UTF-8 `.csv` or `.xlsx` file. XLSX uses the first worksheet. Legacy `.xls` files must first be saved as `.xlsx` or CSV.

The first row supplies column headers. English template headers and Vietnamese `Tiêu đề`, `Nội dung`, `Ngày`, `Giờ` are recognized automatically; every field can be mapped manually. Unmapped columns are ignored. Blank rows are skipped, retaining spreadsheet row numbers in error messages. CSV supports quoted newlines, commas, semicolons and UTF-8 BOM.

| Column | Contract |
| --- | --- |
| `title` | Required, 1–200 characters. |
| `caption` | Required, up to 63,206 characters. Platform publication limits still apply later. |
| `date`, `time` | Optional together; `YYYY-MM-DD` and `HH:mm` in the selected timezone. Excel date cells/fractional times supported. Invalid dates and nonexistent local times are rejected. |
| `account_ids` | Optional semicolon-separated Socialchoice IDs; overrides default destinations for that row. |
| `media_ids` | Optional semicolon-separated existing Media Library IDs, up to 10. No remote media download or file upload occurs during this import. |
| `pillar_id`, `angle_id` | Optional existing same-brand strategy IDs. An angle requires its owning pillar. |

Reference IDs are available in the dialog. Maximum 200 nonempty rows, 50 columns and 5 MB per file; expanded XLSX content is limited to 20 MB. Total normalized API content is limited to below the existing 1 MiB request boundary. Split larger imports.

Review all rows before confirming. Any invalid or identical duplicate row blocks the entire batch; fix the spreadsheet/mapping and review again. References must still exist in the same brand and demo/live scope when saving. The server revalidates all rows and commits all drafts plus their import receipt in one transaction. A later row failure creates no partial batch.

Import **never publishes or creates automatic publishing jobs**. Optional dates remain proposed times on draft records. Open the resulting drafts to edit, add media, or use the existing reviewed scheduling/publishing flow. Platform-specific media/caption eligibility is validated there, not claimed by the import's Ready label.

On an uncertain connection/server error, keep the dialog open and retry the same import. A durable request ID returns the original post IDs even after backend restart, without duplication. Starting a new import is intentionally independent; uploading the same file in a new dialog can create new copies. There is no cross-import content deduplication.

Files are parsed in the browser; only mapped row values are sent to the existing authenticated workspace API. This feature is available in the web runtime; the separate desktop prototype does not expose it. Node and Cloudflare share the same store/endpoint. Local implementation does not deploy the online frontend or Worker automatically.

Validation: `node --test server/bulk-post-import.test.js`, plus project lint, typecheck, build and server regression tests. The local preview script in `plans/261103-2115-bulk-upload` creates only an in-memory workspace and fixture files under ignored `data/`; it never opens the user's workspace database. Stop the preview when acceptance is complete.
