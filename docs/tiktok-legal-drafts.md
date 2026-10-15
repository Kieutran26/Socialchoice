# Socialchoice public policy drafts

Status: owner approved publication on2026-10-15; public HTML pages deployed and exact bytes verified. This Markdown retains the reviewed preparation record. Operator identity/contact supplied and approved. These drafts describe current single-admin testing, not a launched multi-user service. TikTok sandbox support is implemented; a live account connection is verified separately.

## Privacy policy — draft

Socialchoice is operated by Kiều Trân. Questions about personal data, access or deletion can be sent to cv.kieutran@gmail.com. Effective date will be the publication date.

Socialchoice stores the brand information, drafts, captions, media, publishing schedules and delivery records entered into its workspace. When an account is explicitly connected, it stores the platform account identifier, available profile information, granted permissions, authorization expiry and encrypted access credentials needed for the enabled integration. Facebook analytics may store reaction, comment and share counts for verified publications. TikTok is limited to explicitly authorized sandbox accounts and private test posts.

This information is used to manage the workspace, authenticate its administrator, connect selected accounts, publish specifically approved content, run confirmed schedules and display delivery results. Connecting an account alone does not approve a new post.

The web interface is hosted on Vercel. The hosted backend and private SQLite media/content storage run on Cloudflare. Approved content and the necessary authorization information are sent to the selected social platform to carry out the requested action. Those providers process data under their own policies. Socialchoice does not require users to enter their social-platform passwords into Socialchoice; authorization occurs on the platform's own site.

Socialchoice uses an administrator session cookie and OAuth flow cookies for authentication and request protection. The interface also stores language/settings preferences in the browser. The current app does not implement advertising profiles or sell workspace data.

Workspace content and delivery history persist until removed through supported controls or an operator-managed deletion request. Some records cannot be deleted in the interface while referenced by other content or delivery history. Disconnecting an integration removes its local delivery credential when no other destination references it; disconnecting does not itself erase prior posts on the platform or revoke access at the platform. Users can also revoke authorization in the platform's account settings. Backups and provider operational records may remain subject to their retention mechanisms; no instant backup purge is promised.

Access tokens are encrypted on the server and are not returned to the browser. Access controls protect workspace/media routes. Expiring links permit platforms to retrieve only media approved for an active delivery attempt. No security measure is an absolute guarantee.

The current deployment is a private, single-administrator test workspace. It is not open registration for the public. Before a public launch, the operator will review this policy and publish any changes that describe the actual service.

## Terms of use — draft

Socialchoice is operated by Kiều Trân. Contact: cv.kieutran@gmail.com. Effective date will be the publication date.

Socialchoice is currently a private test workspace for planning social content and using supported account integrations. It is provided for testing without a paid subscription or a promise of uninterrupted service. Public registration is not available.

Use only accounts and content you are authorized to manage. Keep your administrator access private. You remain responsible for the rights to your captions, images, videos and music, and for the privacy and content rules of each destination platform. Do not use Socialchoice to infringe rights, mislead others or access accounts without authorization.

Review the destination account, caption, media, visibility options and timing before confirming publication or a schedule. A confirmed schedule may run while the browser is closed. Platform processing, access restrictions, quotas, outages or approval requirements may delay or prevent publication. A result marked unconfirmed may already exist on the platform; inspect the destination before creating a replacement.

Connecting an account authorizes only the permissions selected in the platform consent flow. It does not transfer ownership of the account or content. Disconnecting local access does not automatically remove published content from a social platform. Manage that content and any remote authorization in the platform itself.

Features may change during testing. Keep independent copies of important content. Any later public service, pricing or additional terms will be presented separately rather than treated as accepted through this private test.

## Publication checklist

- Supply and verify the operator name and public contact email.
- Owner review/approval of these exact drafts; resolve applicable legal obligations before public service launch.
- Publish accessible pages without administrator login; test actual URLs before registering them in TikTok.
- Use a real approved app icon, not a placeholder or third-party trademark.
- Do not submit production review or claim approved TikTok publishing before the integration and demonstration are working.
