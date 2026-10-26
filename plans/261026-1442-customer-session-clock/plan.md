# Customer session clock validation

Status: deployed and verified. [Report](../reports/bugfix-261026-1442-customer-session-clock-report.md).

Outcome: valid customer sessions survive navigation/reload when internal actors observe slightly different clocks. Preserve8h absolute sessions, signed30s transport expiry, central revocation and authentication boundaries. No credential changes or account data changes.

Evidence: live licensed customer initially showed License verification unavailable; retry succeeded. Clock regression reproduces401context and503authority with receiver1ms older than sender. Original future bounds required identical clocks. Cloudflare documents Date.now as last I/O time. This is a verified failure mode consistent with the report; production internal clock delta was not measured.

Fix:5s tolerance only on future upper bounds; no expired-message grace. Test1/1000/5000ms differences, beyond-bound rejection, expired context/session and forged messages. Run actual Workers/revocation tests, full checks, required review; deploy same Worker preserving all bindings/secrets; live customer navigation/reload verification.
