# Composer preview and collaboration

Status: UI complete and deployed; live collaboration blocked by Meta responses. Date2026-10-13 Asia/Saigon.

Wide desktop editor/preview uses3fr/7fr, measured330/770px at1440px viewport. Below1280px content stacks. Facebook frame uses the actual selected Facebook Page, caption expand/collapse, photo grids selected from image orientation/count, extra-photo overlay and image dialog, native video controls. No invented engagement numbers, verified badge or co-author. Final Facebook cropping remains platform-controlled.

Real video invitation service implemented using the official Meta SDK video/collaborators contract. Confirmed published-video/credential gating, verified target review,10-minute expiry, stable prepared review and private durable claim before POST. Repeated/interrupted requests do not resend. Submitted is not Accepted; the read-only refresh displays only actual returned data. Text/photo collaboration is not enabled without a verified contract.

47tests passed; lint/typecheck/build passed. Existing bundle-size warning remains. Auth/cross-origin/path escape, interrupted invite, expiry and private state safety tested without mocked successful Meta responses. Required reviewer findings fixed (destination fallback, stable review, explicit identity fields, diagnostic catches). App source/durable store namespace/secrets preserved on Free backend.

Browser checks: real published photo content loaded into unsaved composer duplication (no new post saved/sent).1440px desktop measured330/770 columns;768px document753px and375px document360px, no horizontal overflow or broken images. Image dialog opens/closes. Screenshots local to plans/261013-1050-facebook-composer/. New video collaboration UI shown on existing published post74b1e373-9d31-4c97-a9b9-cd3de8c0db6f; existing Published history/link retained.

Live blocker: owner targethttps://www.facebook.com/apple. Meta target verification rejected with code100; no target identity confirmed, no invitation sent. Live collaborators GET for the published test video also rejected. Owner supplied100064606995009. Native Facebook profile.php?id redirected to Apple, but Meta lookup returned100/33. Metadata lookup is optional for explicitly supplied numericIDs: only known100/10/2004xx metadata rejections allow ID-only review with metadataVerified=false;190/network failures do not. A real invitation remains untested and must be approved. Do not infer Apple participation, recipient acceptance or app approval. No credentials requested.

Deployment: featureb71328f/Vercel4zQXrwqx4bt4JZKjeSZTZ7zRbtQ6 Ready. Finalfix3d67782/VercelCjfAwNWGDggjvCLE5HXwdKeSH5w7 Ready. Worker270fa35ab7e744a190edbb657b6af0e6. Namespace and private bindings preserved.

Visual critique:21/24. Fidelity2 (neutral/premium/compact), hierarchy2 (large preview), spacing2 (consistent panels), alignment2 (30/70), typography2 (existing font pair), color2 (green CTA only), depth2 (hairlines), states1 (image overlay/loading/error checked; hover/focus traversal not exhaustively checked), responsive2 (three widths), slop2 (no decorations), content1 (real assets/labels;3-10photo configurations not all visually exercised), craft1 (native date/video controls retained). Corrected Share localization after render. render-check.mjs skipped under session browser-control constraints; used supported CUA at the same three widths. Automated contrast/clipping/target-size scan not claimed.

Unresolved: Meta eligibility/access for video collaborator API; real approved invitation and recipient acceptance. UI preview complete, collaboration integration not certified end-to-end.
