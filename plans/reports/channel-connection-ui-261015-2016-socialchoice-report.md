# Channel connection UI

Status: implemented, reviewed and frontend deployed.

User requested an Add channel grid based on the supplied screenshot, retaining current Socialchoice styling. Replaced the three stacked connection panels with one Add channel dialog. Existing supported platforms use their real status endpoints; unsupported existing platforms are disabled Coming soon. TikTok retains Sandbox/private-video labeling. Eight existing platform entries retained; no new provider implementation or fake connected state added.

Reused existing Meta/Threads, LinkedIn and TikTok connection/import controls inside the selected-platform step. Existing account-row reconnect/check/disconnect and manual planning references retained. Callback success autoopens selection; Meta pending payload resolves Instagram vs Facebook. Meta failure/cancel returns the retry grid. Closing/back/import clears only provider outcome query parameters. Busy connection/import prevents dismissal. Status loads independently per service.

Validation: lint, typecheck and production build passed. Independent review initially found empty-state CTA opening manual form, cross-service status blocking, and Meta failure locking retry to Facebook; fixed and reviewer final Status DONE. A transient renamed-initializer error was caught and fixed before final checks/deploy. No new mirror tests added for this reversible UI change; no backend changes.

Synthetic browser fixture used an isolated in-memory database at127.0.0.1:4301 and blocked all provider fetches. Verified main and empty-state entry; correct FB step; LinkedIn profile selection/import closes dialog; Instagram callback selected returned platform/import closes and clears query; Threads and TikTok selection; generic Meta failure grid; manual planning form; Escape close; desktop layout and375px mobile with no horizontal overflow. An8-second Threads status delay left the other configured cards usable. Fixture stopped. Existing user API on3001 (PID30340) was inspected and left running.

Frontend-only Vercel deployment dpl_EkSVYi2Yxdc8Sx1WuN9vGHzqxBMP, static-only staging .test-tools/channel-ui-release. Production accounts200, exact JS index-Bz2fpeVG.js and CSS index-l44BQvHO.css SHA256 matches, backend health200, policies and TikTok verificationfile200. No Worker deployment, secrets, stored records, OAuth grants or publications changed. Production browser currently requires owner sign-in; authenticated new grid verified through synthetic browser, not production session. Previous Vercel dpl_9M5PGvY58V4tJXWDeeDS4D4F5qRC is rollback reference.

Guide: docs/channel-connections.md. Desktop/mobile screenshots in this reports directory. No commit/push requested or performed.

Unresolved questions: none for this UI scope.
