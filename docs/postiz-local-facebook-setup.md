# Postiz local Facebook configuration

Updated 2026-11-01. Scope: local Docker only; Socialchoice production and its Meta app unchanged.

- Meta app: Postiz Local (`1421752886706512`).
- Compose directory: `D:\Socialchoice-Staging\postiz-app`.
- Compose inputs: `docker-compose.yaml`, `docker-compose.staging.yaml`; environment: `.env.staging` (private; never commit).
- Docker executable: `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe`.
- Override maps `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` from environment. No credentials are included here.
- Previous override backup: `docker-compose.staging.yaml.before-facebook.bak`.
- Validation: Compose config check passed. Recreated only `postiz` with `--no-deps --pull never`; database and Redis remain healthy. Browser reaches local Calendar. OAuth now sends the correct app ID.
- The owner approved the four initial permissions plus `pages_read_user_content`; all five now show ready for testing. The owner completed Facebook authorization and channel selection.
- Verified: authenticated GET `http://localhost:4007/api/public/v1/integrations` returns HTTP 200 and two Facebook integrations: TalentChoice and NextChoice, both `disabled: false`. This confirms persisted integrations and Public API access; publishing and token longevity have not been tested. No post was created, scheduled or published. The existing API key was used without rotation; machine clipboard cleared after verification.
- Rollback: restore the override backup and recreate only `postiz` using the same Compose inputs and `.env.staging`. Remove the two Facebook environment entries if reverting the configuration fully. Never remove volumes.


