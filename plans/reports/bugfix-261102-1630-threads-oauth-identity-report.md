# Threads OAuth identity repair

Status: DONE. Production Threads account connected and read access verified.

Cause: code exchange returned a numeric account identity outside JavaScript's safe integer range. The adapter's safety guard rejected it before profile selection. Callback failures also omitted platform, causing the locked channel dialog to discard safe diagnostic information.

Fix: parse provider JSON with a source-aware reviver for numeric id/user_id fields. Exact decimal digits become strings before rounded Number values can be used. Other validation stays intact. Add fixed stage/reason diagnostics, and retain platform on failure responses. No raw provider body, token or secret enters diagnostics.

Verification: connection/HTTP tests12pass, including raw JSON17digit identity, OAuth session/replay/expiry, encrypted explicit selection and failure routing. Reviewer found no actionable precision/security issue. Real OAuth on socialchoice.site reached profile selection, imported the intended account into Test, and access check completed connected. Screenshot data/threads-connected-verified.png. No publication or schedule was created.

Deployment: Worker ef5c14e6-6970-49d1-92d2-9b0a404fca4d via existing keep-vars route. Existing bindings/keys/state preserved; no migration or frontend release. Intermediate diagnostic versions0486af59-a5d8-40aa-85c3-572d4bac1217 and1d7a8bde-8446-4fba-aca4-d4c1b85f0095 preceded final precision repair and do not fix the identity rejection.

Unresolved: real publishing not tested; outside this connection repair.
