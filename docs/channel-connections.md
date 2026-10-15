# Connecting channels

Open Social Accounts and choose Add channel. The modal lists the platforms already represented in Socialchoice, using its existing neutral surfaces, green status/action colors, typography and icon set.

Configured integrations show Available to connect, not Connected: user authorization and explicit account selection are still required. TikTok is labeled Sandbox with private video only. Unconfigured integrations show Setup required; unsupported YouTube, X and Reddit connections show Coming soon and are disabled. Service readiness loads independently so one slow status request does not block other channels.

Choose Facebook Page, Instagram, Threads, TikTok or LinkedIn, choose an active real brand, then connect on the provider's official website. Callback returns reopen the appropriate account-selection step. Meta success uses its returned platform to distinguish Facebook from Instagram; failed/cancelled Meta returns show a retry grid. Import requires explicit selection and refreshes the account list. Return to All platforms to switch. The dialog cannot be dismissed while a connection/import request is in progress.

The planning-reference link opens the existing manual form and does not grant OAuth or mark a channel connected. Demo workspace controls preserve their existing restrictions. Existing reconnect, check-access and disconnect actions remain on the account rows.

Desktop uses three columns; smaller screens use two or one with contained vertical scrolling. No new provider capability, credential, server endpoint or publishing behavior is introduced by this UI change.
