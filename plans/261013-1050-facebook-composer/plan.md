# Composer and Facebook collaboration

Outcome: desktop30/70 input/preview, responsive stacked smaller screens, Facebook-like post frame and ordered photo grids, real video collaborator invitation with review and durable no-resend status. Keep fonts/palette/Phosphor/CTA, text/photo/video publishing and Free deployment.

Register: Product
Scene: owner composes Facebook Page posts on desktop and checks media presentation before publishing.
Direction: existing minimalist workspace with a recognizable Facebook post preview, because layout must expose the actual content hierarchy.
Color: Restrained; existing white/charcoal neutrals and brand green CTA.
Type: existing Mona Sans + Space Grotesk.
Signature: wide Facebook post frame beside compact input column.
Dials: variance3,motion2,density6.

Preview is an approximation; Facebook controls final cropping/device rendering. No invented reactions/comments/verified badge. Single-photo aspect preserved,2-5 photo mosaics selected by leading image orientation,+remaining overlay. Display actual selected Page name.

Collaboration: official Meta SDK exposes POST /video-id/collaborators target_id and GET same edge. Only enable for a real confirmed Page video, with target identity read and explicit invitation approval after publication. Do not substitute tagging for collaboration; no evidence of photo/text collaborator API found. Separate Published from invitation response and recipient acceptance. Claims stored before writes; uncertain requests never auto-resend. Live invite test requires actual target and approval.

Validation: frontend lint/type/build, backend auth/claim safety tests, responsive browser screenshots375/768/1440, reviewer, Free deploy; no unapproved post or invitation.

Review: no critical security/claim/regression blocker. Fixed non-Facebook preview identity fallback and concurrent prepared-review replacement. Added explicit read-only collaborator refresh; requestsid,name. Status is optional raw API data, not an inferred acceptance state. No documented statusfield schema was found; do not request unsupported status blindly.46tests/lint/type/build passed; liveUI/responsive/targetverification next.

LiveUIverified1440/768/375 with no horizontal overflow/brokenimages; image overlayverified. Deployed b71328f then3d67782. Sharelabel corrected. Meta denied Apple alias resolution (100) and video collaboratorGET. No invitation sent; numericPageID requested. UI complete, collaboration live verification pending; see plans/reports/facebook-composer-261013-1058-socialchoice-report.md.

Owner supplied numericID100064606995009. PublicFacebook redirects thatID toApple; Meta metadataAPI100/33. Updated review to permit explicitly supplied numericID without claimingverifiedname/eligibility after knownmetadata-access denials only. Actual Meta inviteauthorization stillrequired.47tests passed; invitationnot sent.

Finalcanvasratio verified online at default1280px:282/658 columns, no overflow/brokenimages.47tests + lint/type/build passed. ID-only Apple invitation review shown; ownerapprovalpending, no invitePOSTsent.

Owner decision2026-10-13: approved real invitation rejected. Remove collaboration UI/client and disable API; preserve private history/published video and30/70 preview.
