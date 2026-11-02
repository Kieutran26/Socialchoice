# LinkedIn company mentions

Status: deployed with owner authorization on 2026-11-02. Live lookup is blocked by LinkedIn organization API permission.

Outcome: exact company vanity/link lookup like Postiz, available from inline @ menu and expanded manual mention bar. Real organization IDs come from the official API using a selected connected account. Existing mention publishing contract retained. No new token exposure, credential configuration, database migration, or provider publication.

Verification: focused graph/query/connection/HTTP tests pass, typecheck and lint pass, production bundle builds (existing large-chunk warning). Isolated browser fixture verifies typing @microsoft, selecting among two account fixtures, requesting a result and inserting its token into controlled caption state. Fixture results are synthetic; real provider access is not yet verified. Review found focus containment and label-length mismatches; both corrected.

Regression suite: 291/292 passed in the restricted run; the sole failure was Wrangler filesystem access to its user configuration directory. Running that isolated Worker/R2/Queue test with filesystem permission passed 1/1. All 292 tests therefore pass across those runs. Temporary Vite test process stopped after browser verification. Screenshot: `.test-tools/mention-input/company-lookup.png` (ignored, synthetic fixture).

Rollout: owner explicitly said “cập nhật đi”. Worker `e32b8d4d-d800-4a33-bb71-5bd6a717c3b4` deployed with `--keep-vars`; existing bindings, namespaces, keys and data retained. Previous Worker `740ebfa7-8321-4f30-b82d-7c6d6eb00773` is the backend code rollback reference. Vercel `dpl_E24T1W48X3RPuGozghtMyUDgtaCc` deployed from static-only `.test-tools/linkedin-company-release`, aliased to https://socialchoice.vercel.app. Previous frontend `https://socialchoice-v0hehc1je-nguyenngockieutran-3710s-projects.vercel.app` is the UI rollback reference. Preserve storage and existing settings on rollback.

Live verification: public UI and API health200, exact deployed index/JS/CSS hashes match dist, protected anonymous APIs401 and cross-origin login403. Authenticated browser opened the existing composer and used its company lookup action with the connected LinkedIn profile. LinkedIn returned403; UI correctly reports missing organization API approval. Existing caption was not edited by the agent; no draft save, schedule, publication or account change. Screenshot `.test-tools/linkedin-company-release/live-lookup-permission.png` (ignored).

Remaining: approved LinkedIn organization API access and an appropriately authorized connection are required for successful live company discovery. Basic personal posting scopes do not grant this permission. No broader OAuth scope was silently requested.
