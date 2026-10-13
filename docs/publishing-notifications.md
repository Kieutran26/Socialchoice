# Publishing notifications

Use the bell in the Socialchoice header. It shows real failed publishing attempts and deliveries whose result is unconfirmed, including missed scheduled times and lost Page access. Open a notification to inspect the affected post and its publishing history. Mark one or all as read; this state persists on the backend across refresh and restart.

Notifications derive from server-owned attempts, not sample posts or manually entered log messages. Repeated status checks do not create duplicate notifications. A later confirmed result resolves an unconfirmed warning. Reading a notification never retries or resends a post. Check Facebook before duplicating any unconfirmed content.

This is an in-app notification center. While the page is visible it refreshes every30seconds and on returning to the app. With the browser closed, the failure is retained and appears on the next visit. No email, OS/browser push permission, external messaging or paid provider is enabled.

The list is bounded to100 most recent records, with unread entries first within that window. The unread badge counts all current problems; Mark all as read acknowledges all currently recorded problems. Authentication and same-origin protections apply to list/read actions. Private notification read state and schedule batch records remain in the existing SQLite workspace.
