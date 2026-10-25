# Login service rollout

Status: PARTIAL — deployed service, configured normal Windows build and packaged smoke pass. Meta callbacks saved; real Facebook code exchange/identity verification passes but yields zero eligible Pages. Await owner Page selection/access validation. Native real import and remaining provider registration/grants unverified.

User authorized deploying the isolated login broker, configuring provider apps, building desktop with the real service origin, and verifying real OAuth starting with Facebook. No real publishing, customer-content storage or modification to the existing web backend is authorized by this rollout.

1. Verify authenticated Cloudflare account, existing scripts and workers.dev hostname. Check provider credential presence without printing values.
2. Configure the separate socialchoice-login Worker: exact origin, no data bindings/log collection, private generated state key and privately reused local provider App credentials. Preserve web callbacks and append desktop callback URLs when provider UI permits.
3. Deploy reviewed broker and verify public readiness, no-store/error/redirect guards and deployed settings. Never log callback tickets/tokens/secrets.
4. Build native desktop with the verified origin; complete user-mediated browser login/account selection/check/disconnect where owner interaction is needed. Never claim a live grant from readiness/fixtures alone.
5. Document exact callback routes, deployment version, rollback and remaining provider/app-review requirements. Run affected checks; preserve real customer workspace data.

Accepted constraints: local DPAPI tokens, one-machine licenses, customer-owned media storage, no production license-authority generation, no SaaS data store, no automatic post or paid AI call.

Evidence and remaining work: [rollout report](../reports/login-rollout-261025-1445-socialchoice-report.md).
