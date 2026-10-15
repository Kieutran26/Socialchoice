# Instagram connection prerequisite

Status: DONE

Implemented Facebook Login opt-in `start` args `[brandId, "instagram"]`. Existing Facebook default scopes preserved. Instagram adds `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list`.

Pending selection uses existing `pages` endpoint: `platform: "instagram"`, `pages: [{id,name,username,pageId,pageName,tasks}]`. Tokens stay server-only. Import accepts discovered Instagram IDs only; chosen live brand is OAuth-bound. Account uses platform Instagram and profile enum; independent encrypted credential stores Page linkage. Check verifies current Page linkage then Instagram identity. Disconnect/reconnect preserves credentials referenced by another account. Only Meta code190 marks expired; stale checks cannot overwrite reconnect.

Validation: `node --test server/instagram-connection.test.js server/meta-connection.test.js` —11 passed. No live OAuth, publication, deployment or external writes performed.

Official Meta source: https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-e75c10a1-9f03-4e91-9cb3-69eafacac57d

Root integration: add username to server-owned metadata guard in validation.js. No new schema needed. UI/HTTP/publishing remain root and other worker ownership.

Unresolved questions: None. Live owner linking/authorization remains required for actual access.
