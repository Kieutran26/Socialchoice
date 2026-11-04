# UTM Builder and Link Tracking

In the web composer, add public HTTP/HTTPS URLs to captions, enter a campaign and medium, then inspect **Xem trước liên kết** and select **Áp dụng liên kết vào bản nháp**. A blank source uses the selected account's platform, or `social` without destinations. Content and term are optional. Existing UTM values remain unless replacement is selected. Signed URLs and existing tracked links are skipped.

Each selected destination receives its effective caption (account override, then platform override, then shared caption) with the transformed URLs. Other destination settings remain intact. Save the draft or continue the usual publication approval separately. Applying links does not publish or schedule a post. Editing captions after applying requires reviewing any new URLs again.

UTM parameters support campaign attribution on the destination's analytics service, such as GA4. That website must already collect analytics; this feature does not install GA4 or import its reports.

Enable **Dùng liên kết chuyển hướng có thống kê** to create fixed Socialchoice redirect URLs. Refresh brand statistics to see the latest 100 links, total requests, last request and up to 30 most recent activity days in UTC. Counts persist in workspace storage. Counts represent requests, not unique visitors. HEAD requests, known bots and prefetches are excluded heuristically; automated requests can still be counted. Visitor IP, cookies and user-agent values are not stored by this feature.

Disabling a link returns HTTP 410 for future requests; it does not restore the original URL in already published posts. A disabled exact destination/campaign combination cannot be recreated by applying again: use a different campaign. Redirect destinations are immutable and must use public HTTP/HTTPS without credentials. No destination fetch occurs on the server.

Authenticated management endpoints are POST `/api/links/build`, `/api/links/list` and `/api/links/disable`, using the existing application JSON/header/origin/session boundary. Public GET/HEAD `/api/links/go/{owner-or-customer-id}/{link-id}` routes only to its workspace. Customer redirects remain available when the customer's license is revoked, without permitting workspace management or starting publishing reconciliation.

Public tracked URLs use `SOCIALCHOICE_PUBLIC_ORIGIN`; the existing `/api` proxy must continue routing this path to the backend. Local URLs only work while the local server is running and reachable. Deploy both frontend and backend before using tracked links in public posts. This implementation does not deploy automatically.

Validation: `node --test server/tracking-links.test.js server/customer-gateway.test.js server/customer-runtime.test.js`, followed by the normal project test, typecheck, lint and build commands.
