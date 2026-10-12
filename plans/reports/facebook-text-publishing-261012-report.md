# Facebook text Publish Now

Implemented: server-only Page token transport to Graph Page /feed, exact Page/caption confirmation, ten-minute immutable approval, synchronous SQLite claim before HTTP, one text-only Page per attempt, immutable job/variant/history and confirmed platform ID before Published. Calendar delivery, media and multi-Page execution remain unavailable.

Uncertain transport/response/interruption results remain unconfirmed and are never automatically resent. Permission/token denials retain failed history. Unused reviews can be cancelled and their drafts deleted; claimed attempts cannot be reset or deleted through generic CRUD. History displays the approved Facebook caption override and stops polling at a terminal result.

Verification: 34 tests passed including real bundled Workers/SQLite restart and authenticated publishing route rejection; full lint, typecheck, production build passed. After final unused-review deletion fix, 12 relevant publisher/store/Workers tests passed. Independent reviewer found no remaining blocker. Tests use isolated storage fixtures; no fake Meta success response, production token fixture or test post was inserted. Existing large Vite bundle warning remains.

Deployment: source/UI commit 411b241, Vercel FYDEfjiPHxzzsQrxkKRHRpdjZXVa success; backend final deployment d88e407a58cd4dde8d92b7c9f3683ae5, same Free Worker, SQLite namespace and private secret bindings. Public same-origin health confirmed admin-session, configured Meta, text_publish_now. Online Vietnamese composer shows Publish now and connected Deszy (427858497068282). Screenshot artifacts are local only.

Initial approval gate: owner approval to add pages_manage_posts to Meta App 1115808334255427, owner reauthorization/import with a content creation Page task, then exact Page and text approval before a real test. App remains unpublished. No real publishing success is claimed and no Facebook password is requested.

Follow-up: owner approved scope change. Added pages_manage_posts (Ready for testing), completed OAuth for only current Deszy Page, and imported renewed credential. Backend prepare succeeded for the actual Page and exact Vietnamese technical test caption, proving required scope/task metadata passed. Review screenshot: facebook-post-review-261012.png. Waiting for specific publication approval; still no real post sent.

Live result: owner approved the exact technical test caption to Deszy. Submitted once through the deployed confirmation dialog. Facebook returned 427858497068282_122224600130487033; Socialchoice recorded post c10e9267-6962-4be6-aac5-4ae823774ac8 as Published with destination history/link. Opened https://www.facebook.com/427858497068282_122224600130487033 and verified the Deszy author, exact caption and Public visibility. Local screenshots: facebook-post-confirmed-261012.png, facebook-live-post-261012.png. One real post, no retry or duplicate. Publishing test passed; app itself remains unpublished and no broader Meta approval is claimed.

Unresolved: automatic scheduling, media and multi-Page delivery are future implementation, not part of this text Publish Now pilot.
