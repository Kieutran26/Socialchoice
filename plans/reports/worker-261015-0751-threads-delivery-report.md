# Threads durable delivery

Status: DONE

Implemented independent Threads configuration/vault, reviewed profile/caption/media validation, text/JPEG/MP4 durable container create → processing → publish → verify checkpoints, shared schedule alarm routing, and explicit Facebook runner isolation. Every outbound operation claims persistently; uncertain writes and expired write claims never resend. Verification failures after acknowledgement remain unconfirmed and nonretryable. Read recovery is bounded to 30 minutes.

Signed media stays on existing /api/instagram-media endpoint, binds platform into HMAC, and revalidates the matching connected account, encrypted credential scopes/expiry/profile and immutable stored asset. Private library access remains authenticated. HTTP caller must pass third threadsConfig argument into createInstagramMediaAccess.

Validation: 25 focused tests passed (7 Threads;18 Facebook/Instagram). Includes Threads-only configuration, exact reviewed content change rejection, scheduling metadata, durable text claim, lost-response/no replay, interrupted read recovery, acknowledged verification denial, credential expiry/media revocation, and complete stage progression. No actual Graph writes or live publication performed.

Primary reference: https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api (Meta official collection): single text/image/video containers, remote image URL, separate publication, documented status states. https://developers.facebook.com/docs/threads/posts returned429; PNG requirement could not be established from readable primary source, so initial supported image is JPEG.

Unresolved questions: None. PNG remains excluded pending readable primary documentation.

Follow-up review: preserved legacy Instagram HMAC payload byte-for-byte, with a separate threads-media-v1 prefix for platform binding. Added compatibility verification using a legacy-generated signature. Restored unconfigured Meta error contract while keeping Threads-only publishing available. Focused15 tests and complete110-test suite passed.
