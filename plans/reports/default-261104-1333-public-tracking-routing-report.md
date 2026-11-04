Status: DONE
Summary: Public tracking redirects route by URL scope before account resolution and CSRF checks. Forwarding strips credentials; saved customer identity must match scope, and public clicks bypass license authorization and publishing reconciliation.

Files: server/customer-gateway.js, server/customer-workspace.js, server/cloudflare-workspace.js, server/cloudflare-workspace-runtime.js, server/customer-gateway.test.js, server/customer-runtime.test.js.

Validation: customer gateway/customer runtime tests 4 passed; Cloudflare owner runtime test 1 passed; scoped diff whitespace check passed. Worker tests use isolated temporary persistence and dry-run bundles.

Concern: Owner eager constructor publishing reconciliation moved to ordinary fetches so cold public clicks cannot trigger resume; scheduled alarm handling remains unchanged.

Unresolved questions: None.
