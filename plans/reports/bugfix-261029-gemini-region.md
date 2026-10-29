# Gemini regional egress repair

The owner confirmed the newly differentiated production error was unsupported server region. Gemini was called from the existing workspace Durable Object; changing frontend placement would not relocate that object.

Implemented a private AI_EGRESS Durable Object binding with an explicit US jurisdiction, fixed Gemini generateContent endpoint, POST-only forwarding, bounded request body, fresh allowlisted headers, timeout and manual redirects. No public relay endpoint, durable prompt/key storage, third-party proxy, workspace relocation or secret rotation. OpenAI and local Node remain direct. Both owner and customer cloud workspaces inject the regional fetcher into the shared AI handler.

Checks: 192/192 backend tests pass, including 2 new relay tests; lint, web and desktop typecheck, Vite build and bundled Worker integration pass.

Deployed Worker 0c67d46f-1a45-45a6-905c-57cbae72ab58 with --keep-vars; migration ai-us-egress appends SocialchoiceAiEgress. Existing workspace classes, object identities and bindings retained. Public health 200 and unauthenticated AI test 401 confirmed. Frontend unchanged.

Live Gemini success is not yet verified: owner must run Settings > Test AI using their saved key. US jurisdiction constrains execution location; Google remains the authority on accepted egress IP geography. No claim that the stored key or model is valid.

Rollback: preserve the new class export and migration history; disable regional fetch injection in repaired source if needed. Do not delete workspace namespaces or change encryption keys.
