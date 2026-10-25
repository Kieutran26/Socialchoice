# Web license rollout

Status: deployed and HTTPS boundaries verified. Owner explicitly requested proceeding after the issuer setup and production deployment next step was stated. See [rollout report](../reports/web-license-rollout-261025-2032-socialchoice-report.md).

Outcome: keep the owner workspace and existing keys; establish a separate Windows-protected web issuer, deploy reviewed customer code, verify HTTPS boundaries and matching UI. No paid infrastructure or real posts. Commercial edition differences remain undecided.

1. Inspect remote bindings and rollback references. Retain WORKSPACE namespace `2d292e578a9a4b65a13a43b10099294b`, owner actor name and every existing secret. Starting Worker version `9e64bdd5-5eed-47d1-91f4-24eff5702b08`.
2. Add a usable owner issuance menu, validate it with disposable keys, review code. Initialize separate issuer outside source with current-user-only Windows ACL and DPAPI passphrase; send only public key to server.
3. Deploy additive customer class migration with activation initially disabled; verify owner/runtime health. Publish matching Vercel static build retaining API rewrites and verification files. Enable public issuer only when code and UI are verified.
4. Verify actual HTTPS customer config, anonymous denial, invalid license rejection and owner data preservation. Use isolated runtime tests for destructive cross-customer account/recovery behavior. Record any live customer acceptance gap explicitly; do not create fake production sales or paid customer accounts.

Acceptance: public UI and API match tested code, signed license issuance can be operated on Windows, customer activation is server enforced, original owner identity/bindings unchanged, no private issuer material in source/cloud. Rollback code must retain newly created Durable Object exports/namespaces; older versions predating the class migration cannot be restored directly.

Unresolved: off-device issuer recovery backup, production customer enrollment evidence, commercial provider approvals and edition/pricing policy.
