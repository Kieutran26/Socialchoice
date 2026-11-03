# Excel / CSV bulk post upload

Outcome: import real XLSX/CSV files into reviewed Socialchoice draft posts, preserving the existing design and publishing confirmation flow.

Constraints: web Node/Cloudflare runtime; no production deployment or publication; select one brand per batch; validate same-brand/demo references; atomic draft-only writes and durable retry receipt. Dates represent proposed times, never scheduling consent.

Phases:
- Inspection and contracts: complete.
- CSV/XLSX parsing, mapping and review UI: complete; real browser XLSX import and valid/invalid CSV verification pass.
- Atomic draft endpoint and replay protection: implemented; focused tests pass.
- Regression checks, reviewer and docs: complete. 305 server tests, lint/typecheck/build pass; reviewer has no remaining findings. Desktop and 390px dialog verified.

Acceptance: both file formats read correctly; Unicode/multiline CSV preserved; invalid rows/date/reference/duplicates block the batch; server rejects cross-scope input; retry after restart returns original IDs; no PublishJobs/attempts created; lint/typecheck/build and relevant server regressions pass.

Operations: [bulk upload guide](../../docs/bulk-post-upload.md).
