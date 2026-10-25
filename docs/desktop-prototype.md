# Windows desktop prototype

Version 0.4 adds optional BYOK AI to local media and portable backup/restore to native SQLite content planning in the existing React UI. Desktop supports Overview, Settings/brands, Content Pillars, Content Angles, Content Strategy, Create Post, All Posts, Calendar and Media Library. The browser/web build retains its existing backend. Desktop uses native commands, a hash router and its own application data directory; it does not start Node or contact the cloud API. Other routes show an explicit unavailable message. Demo seeding and publishing notifications remain disabled for desktop; media imports use native file dialogs.

The typed adapter is in `src/api/desktop/`; native store, entity validation, relationship guards and mutations are separate modules in `src-tauri/src/`. Existing pure query helpers preserve filtering and aggregation contracts. Native validation permits Brand/ContentPillar/ContentAngle/Post writes only. Protected fields, cross-brand references, invalid strategy, cross-brand/invalid media references, connected accounts and forged publishing results are rejected. Referential checks and multi-record changes use a single SQLite write transaction; failed bulk changes roll back completely. No arbitrary SQL, file paths or secrets cross the IPC boundary.

## Build and run

On Windows install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/): Rust MSVC toolchain1.88 or newer (locked image decoder requires1.88), Microsoft C++ Build Tools with a Windows SDK and WebView2. These are developer build requirements; the eventual installed app does not need Node or Rust.

```powershell
pnpm install --frozen-lockfile
pnpm run typecheck:desktop
pnpm run test:desktop
pnpm run desktop:test:native
pnpm run desktop:dev
```

The desktop scripts initialize the installed MSVC environment and find Cargo in the user's `.cargo/bin` if it is not on PATH. Desktop dev starts only Vite on deterministic port 1420. If that port is in use, inspect the owner rather than starting a duplicate. Stop the session when done.

```powershell
pnpm run desktop:build
```

Build output: `src-tauri/target/release/bundle/nsis/`. This prototype is unsigned and is not a commercial release. No updater or publisher integrations are configured. The root `package-lock.json` belongs to the pre-existing source; use `pnpm-lock.yaml` for this branch. Do not alternate package managers.

## Data and restart check

The desktop identifier is `com.socialchoice.desktop.prototype`; the database is `prototype.sqlite` under Tauri's platform application data directory (on Windows, normally `%APPDATA%\com.socialchoice.desktop.prototype`). Never point it at `data/socialchoice.sqlite` or copy customer data into it. A fresh install begins empty.

1. Launch the installed app without starting any Node API.
2. Open Settings, create a brand named `Desktop restart check`, and confirm it appears.
3. Exit the app completely; reopen with network disconnected and verify the same brand remains.
4. Edit, archive/restore and delete the test brand. Check unsupported routes show their notice and no cloud request is made.
5. Create a pillar and angle under the brand. Create/edit/duplicate a draft; duplication saves a new independent draft without a date.
6. Save a calendar plan without connecting any social account. Verify month/week/list; drag it to another day, or open its detail dialog to set date/time/timezone. Dragging preserves the record’s timezone and local clock time while shifting by the displayed day difference; moves that cannot land on the selected calendar day are rejected and can be set explicitly in the dialog. Cancel removes it from the calendar while preserving a cancelled post in All Posts.
7. Restart and check caption, relationships and UTC instant. A scheduled plan must be cancelled before deletion; drafts/cancelled posts can be removed. Strategy records used by other records must be archived rather than deleted/moved.
8. Verify the existing web build still calls its original API.

Native tests use temporary directories and reopen SQLite to verify persistence; they do not open the real workspace. They do not replace an installed WebView smoke check.

## Current limits and rollback

Commercial sales policy, account connections and real publishing remain later work. Calendar plans are ordinary Post records with a normalized UTC timestamp and timezone; no PublishJob, PostVariant or platform attempt is created. Saving a draft clears its planned timestamp. Strategy referenced by an existing post may be archived without rewriting history; duplicated drafts clear archived strategy that cannot be selected for new content.

UI tokens/layout remain unchanged. Desktop bundles Mona Sans and Space Grotesk through Fontsource, including Vietnamese subsets, and removes external font URLs from its HTML/CSS. Their OFL licenses must accompany distribution (see `public/third-party-licenses/`). The web font setup remains unchanged.

No delivery scheduler runs in this prototype. The agreed product rule for later publishing is that it needs an awake machine, a running app and internet. Closing the app or disconnecting can miss the time; overdue schedules must be reviewed, and uncertain writes must never be resent automatically. Calendar planning itself works offline, accepts past dates and does not publish when a planned time arrives. Nonexistent local times at DST transitions are rejected; ambiguous times use the existing timezone helper's deterministic instant.

Rollback source by returning to the web branch. This does not delete prototype data. Do not downgrade an unknown future database schema. Before copying a backup, exit the prototype fully so SQLite WAL is no longer active. No import/migration from local web or Cloudflare is performed.

## Verification status

`pnpm run desktop:smoke:build` builds the same application source with identifier `com.socialchoice.desktop.smoke` and no installer. This isolates test data from user brands. Its output uses the normal release executable path; copy it for testing and run `desktop:build` again before distributing, so the delivered identifier is `com.socialchoice.desktop.prototype`. Never distribute a smoke build.

Record actual checks in the delivery report. Native compile/tests and a packaged close/reopen smoke check are required. Offline CDP emulation starts after bundled resources load; it is not a physical adapter-disconnection test. Installer upgrade/uninstall and Windows drag hit-testing need separate verification. Automated drag tests dispatch the native HTML drag events in WebView2; the date/time dialog provides the equivalent keyboard-accessible operation.

## Local media and portable backups (0.3)

Media Library and the composer import files through a native file picker. JPEG/PNG/still WebP are decoded and limited to3MiB/40MP; MP4 is limited to100MB with an H.264 video track. Video validation inspects container/track metadata, not every decoded frame. Posts accept ten distinct image entries or one video, with native same-brand/reference guards. The original file can move: managed bytes are copied under the app-data `media/` directory using SHA256 filenames. The asset protocol exposes only `$APPDATA/media/*`, with local image/video CSP origins; the UI has no general filesystem or shell permission. Media URLs are generated at read time and are not portable filesystem paths in saved records.

Deleting a library entry is rejected while a post references it. Immutable bytes remain locally for recovery; they are not automatically garbage-collected. Current backups contain library records and their referenced bytes, not orphan files.

Settings → Backup and restore exports `.scbackup` archives with all supported brand/strategy/post/media records and deduplicated files. Format1 has a JSON manifest and exact media entries, no SQL/code/configuration/secrets. Max10000 records,32MiB manifest and2GiB media. Backups are unencrypted; choose another drive for resilience. Export uses a synchronized temporary file in the chosen directory, then renames it; export into the app-data directory is rejected.

Restore first stages and validates the full archive (version, duplicate/traversal/unknown entries, size limits, hashes, media contents/metadata and record relationships), then asks the user to type RESTORE. The inspected staged content is bound to a one-use token. Before replacing records, a recovery archive is written under app-data `backups/before-restore-<UUID>.scbackup`. If recovery export or validation fails, current records stay unchanged. Content-addressed files are installed without overwriting existing bytes, then records are replaced in a single SQLite transaction. Interrupted/failed restore can leave unused immutable files but cannot expose partially replaced records. After success reopen the workspace with the offered button. To undo, choose that recovery archive and restore it through the same process. Test restores must use the smoke identifier only.

Implementation references for Tauri asset scope and native dialogs: https://v2.tauri.app/reference/config/ and https://docs.rs/rfd/latest/rfd/struct.FileDialog.html. API checks verified against the dependency lockfile used for0.3.

## Optional BYOK writing (0.4)

Settings → AI with your own API key configures one active OpenAI or Gemini account/model. Enter a model ID available to that API account; model availability, price or entitlement is not assumed. Save only stores configuration, without network verification. Test AI connection explicitly generates minimal text and may use quota. Save model/provider changes before testing. Blank key keeps the saved key only for the same provider. Remove AI key disables future requests without affecting local planning. Damaged settings can be removed or overwritten with a new key.

The vault is app-data credentials/ai.dpapi, protected by Windows DPAPI for the current Windows user (no machine-wide flag), written through synchronized temporary-file rename. Keys never return in native status, enter workspace SQLite/backups or become accessible through the media-only asset protocol. Restoring a backup preserves current machine AI settings; another machine needs its own key entry. Same-user processes/admin access are outside this protection boundary. Native settings/workspace locks are released before network waits.

Create Post supports drafting, rewriting, shortening and five ideas in Vietnamese/English. Only Generate sends the brief/title/current caption and selected brand/pillar/angle names/descriptions. Other posts and media stay local. Output is plain text, preview only. Use suggestion changes the current editor caption; Save draft is separate, nothing publishes. Context fingerprint and functional state checks reject stale application after brand/title/caption/strategy edits or navigation. Limits: caption input20000 characters, brief4000, output2048 tokens/63206 characters.

Native HTTP uses fixed HTTPS endpoints (OpenAI Responses/Google generateContent), key headers, no redirects or system/env proxy,10s connection/90s total timeout and512KiB response bound. No application retries, polling or background generation. Timeouts may incur provider usage; retry is deliberate. Fixed errors never include raw provider bodies/headers/prompts/keys. Requests use store:false; provider retention policies still apply. No developer AI server. Custom URLs, automatic campaigns, AI media generation and history are outside0.4.

Tests use real Windows DPAPI, temporary workspaces and local HTTP provider-contract fixtures. Live paid generation with a customer key is unverified; never request keys in chat. Fixtures cannot prove model/account entitlement.

References: [OpenAI text](https://developers.openai.com/api/docs/guides/text), [Responses/storage](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Gemini generateContent](https://ai.google.dev/api/generate-content), [Gemini key header](https://ai.google.dev/api/), [Windows DPAPI](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata).


## Machine-bound offline license (0.6)

Commercial policy is one license per computer for Starter, Professional and Business. Additional computers require additional purchases. Edition features/caps/prices remain undecided and configurable; every issuance must supply an explicit rights policy. The default build remains a clearly marked unrestricted prototype until the owner configures a production issuer public key. No production issuer/private key or customer license is supplied.

SC2/schema2 perpetual licenses require a signed SCM1 machine ID. The native Windows GetSystemFirmwareTable RSMB provider reads the SMBIOS system UUID; only a domain-separated SHA256 hash is returned to Settings/issuance, never the raw firmware UUID or serial. The app performs no licensing HTTP, subprocess or registry writes. It does not persist a random installation identity. Same firmware UUID gives the same hash across app reinstalls, Windows accounts and normally Windows reinstalls; changing motherboard/firmware identity may require support. Missing, truncated or all-zero/all-FF UUID data fails closed in a configured build while viewing and backup export stay available. Old installation.dpapi files are ignored and retained; do not delete app-data to repair activation.

SC1/unbound/installation tokens are no longer accepted by configured0.6 builds. The owner must verify the old purchase and issue a new machine-bound token; importing an invalid token does not replace a valid activation. Strict Ed25519 verification uses the embedded issuer public key and version2 domain before claims are read. Native writes, AI test/generation, media import and backup restore enforce rights and machine matching independently of the UI. Brand caps affect new/reactivated active brands; existing records remain editable after downgrade. Removal leaves workspace records available for viewing and backup export. License/machine identity and AI credentials are excluded from workspace backups; workspace restore preserves current activation.

Machine binding deters copying a valid file to a different ordinary computer. It cannot distinguish virtual-machine clones sharing firmware UUIDs, spoofed firmware identifiers or a locally patched executable. Fully offline licenses have no remote revocation: after approved repair/reissue, an old file may still work if the old hardware identity becomes available again. Do not advertise guaranteed concurrent-seat enforcement or automatic revocation. Additional simultaneous computers are new purchases; support reissue is for verified repair/reinstall, not an extra seat. A licensing server is outside this architecture.

### Owner issuance

Create encrypted Ed25519 PKCS8 keys using scripts/license-issuer.mjs init --out with a NEW directory outside source. Supply an at-least16-character SOCIALCHOICE_ISSUER_PASSPHRASE in the owner shell, never command-line arguments or chat. Keep an independent backup of the encrypted private key. Run policy-template --out, then explicitly choose every rights field before issue. No placeholder feature policy is accepted. Existing ancestors of issuer paths are canonicalized and symbolic links/junctions are rejected before key generation.

Example arguments (replace paths and machine ID, not a ready-to-use customer license):

~~~text
node scripts/license-issuer.mjs issue --key <private-pem> --policy <policy-json> --edition starter --licensee <customer-label> --machine-id <SCM1-code-from-Settings> --out <new-license.sclicense>
~~~

Every edition requires exactly one of --machine-id or --request <file.scactivation>. The CLI rejects --unbound/--installation-id, ambiguous policy and overwriting outputs. Customer sends only the hashed machine ID and order reference to the owner through their normal support route; no content database/API key is needed.

### Repair/reinstall support

1. Customer preserves/exports workspace data, sends their order reference, original license and current machine ID to support. Do not ask for their API key or private content.
2. Owner checks purchase and confirms this is the same repaired/reinstalled computer. A new additional computer is a separate sale. If machine ID is unchanged, reimport the existing file; no reissue is needed.
3. For a verified identity change, use reissue --key <private-pem> --original <old-sc2-file> --machine-id <replacement-code> --reason <support-reference-and-repair-reason> --confirm-replacement --out <new-file>. The tool verifies the original signature under this issuer, preserves license ID/owner/edition/rights, and signs prior machine ID plus reason as an audit trail. It does not auto-upgrade rights or revoke the old file. Keep original/replacement alongside the order record outside Git; do not put sensitive support details in the signed reason.
4. Customer imports the replacement file; no workspace deletion or data migration is needed. Viewing/export remains available if activation fails.

### Build and validation

Use pnpm run desktop:build:licensed -IssuerPublicKeyFile <issuer-public.hex>, or the owner tool Build action. A public-key file is mandatory; an inherited environment key alone is rejected. Only the public key belongs in builds. Missing/malformed input fails that build; weak keys fail closed at runtime. The standard desktop:build/dev commands clear inherited issuer keys; only explicit licensed or smoke builds may embed them. Native test wrapper clears inherited issuer keys in its child process and injects trusted fixture policies explicitly. Use test:license and desktop:test:native. Never ship a smoke build/test issuer or private key. Commercial readiness still requires production issuer custody, Windows code signing and selected edition policy.

References: [Microsoft firmware API](https://learn.microsoft.com/windows/win32/api/sysinfoapi/nf-sysinfoapi-getsystemfirmwaretable), [Microsoft SMBIOS system-info layout](https://github.com/microsoft/Windows-universal-samples/blob/main/Samples/CustomCapability/Service/Client/smbios.cpp).


## Customer request and owner workflow (0.7)

Settings -> Export activation request saves a .scactivation file through the native Save dialog, available before activation and in prototype mode. Its five fields are format, version, product, app_version and hashed machine_id. It contains no owner label, license token, API key, content or filesystem paths. Save is atomic, requires this extension and rejects the application data directory (including resolved descendants). Cancel leaves activation unchanged. Send the request plus order reference through the owner's chosen sales/support route; the app sends nothing automatically. Requests are unsigned routing data, never proof of payment or hardware ownership.

The issuer accepts --request instead of manually transcribing --machine-id, for both issue/reissue. It reads at most4KiB, requires the exact five-field schema/version/product and canonical machine hash, and rejects ambiguous machine/request inputs. Request contents cannot grant edition rights: policy and purchase verification remain separate owner decisions.

Run scripts/socialchoice-license-owner.cmd on Windows, or pnpm run license:owner. The portable owner-tools ZIP contains the same scripts; extract the whole folder before opening the CMD file. Node.js24+ is required. The local text menu provides:

1. Create encrypted issuer keys in a NEW directory outside source. Enter the private-key passphrase in the hidden prompt; keep an independent key backup. No keys are created until the owner chooses this action.
2. Configure all three editions. Every feature needs Y/N and each brand cap an integer or UNLIMITED, with no commercial defaults. Output is validated and refuses overwrites.
3. Issue using the customer's .scactivation, an explicit edition/owner label/policy, and confirmation that this computer's purchase was verified. The generated .sclicense must be sent manually; no email/payment service is called.
4. Reissue only after explicit verified-repair acknowledgment, original signed SC2 and replacement request/reason. Rights/owner/license ID are preserved. Offline reissue still cannot revoke the old file remotely.
5. Build with the source folder/toolchain and issuer-public.hex. This action needs only the public key, strips the issuer passphrase from the build child and restores the caller's environment. Missing/malformed/conflicting public-key selection fails; private keys are never build inputs.

Private-key passwords are SecureString prompts and transient environment values only for the issuer subprocess, restored in finally; never argv, configuration, logs or request files. A bounded JSON stdin bridge preserves Vietnamese labels/embedded quotes under legacy Windows PowerShell without invoking a shell. Same-user administrators/process inspection remain outside this boundary. Owner tools deliberately remain outside the customer installer and do not start a local web server. Noninteractive actions exist for fixture tests; supply SecureString values inside a local PowerShell session, never plaintext password arguments.

Explicit LicensedBuild now uses tauri.licensed.conf.json: product Socialchoice, identifier com.socialchoice.desktop. Prototype remains Socialchoice Desktop Prototype / com.socialchoice.desktop.prototype; smoke stays com.socialchoice.desktop.smoke. App-data directories are distinct. Existing prototype data is retained; a commercial workspace starts empty. To move plans/media deliberately, export a portable backup from prototype then restore through Settings in an activated commercial workspace whose rights include restore; enter AI keys separately. Do not copy live SQLite or point both apps at one folder. The hardware license ID is independent of these application data directories.

The owner ZIP is a tool bundle, not a customer app or a preconfigured production issuer. Building requires the source repository, pnpm dependencies, Rust/MSVC/SDK. Commercial build validation uses disposable test trust only; never distribute that binary. Final commercial release still needs owner-generated production trust, explicit edition policy and release/signing validation.
