# Instagram HTTP capability integration validation

Status: DONE

Owned only new server/instagram-http.test.js. Real SQLite fixture uploads JPEG-independent valid PNG bytes solely to validate HTTP storage streaming; capability service tests media transport, publisher separately enforces JPEG.

Verified createHttpHandler through handleWebRequest: anonymous signed GET bytes, HEAD content length with empty body, explicit and suffix206 ranges, malformed/out-of-range416, forged/expired403, POST405, completed attempt403. Ordinary private media route401 without session. Verified connected Instagram username cannot be manually changed409.

Full validation: node --test server/*.test.js —91 tests passed, zero failures (20.4 seconds). No live Meta requests, deployment or external writes.

Unresolved questions: None.
