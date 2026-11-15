# ACCESSFLOW REST API (v1)

Interactive documentation (generated from the code): **`/swagger-ui.html`** · OpenAPI JSON: **`/v3/api-docs`**.

## Conventions
- Base path `/api/v1`. All identifiers are random UUIDs.
- JSON in and out. Errors are RFC 7807 problem details with a stable, translatable `code` and optional `fieldErrors`:
  ```json
  { "type": "https://accessflow.local/problems/error.validation", "title": "Unprocessable Entity", "status": 422,
    "code": "error.validation", "fieldErrors": [ { "field": "phone", "code": "validation.phone" } ] }
  ```
- Validation codes are shared with the frontend form engine (`validation.required`, `validation.email`, …).

## Authentication
| Client | How |
|---|---|
| First-party web app | `POST /api/v1/auth/login` or `/register` sets an HttpOnly session cookie (`AF_SESSION`). State-changing requests send header `X-XSRF-TOKEN` = value of the `XSRF-TOKEN` cookie (get one with `GET /api/v1/auth/csrf`). |
| Embedded component (iframe) | Send `X-AccessFlow-Embed: <publishable key>` on login/register; the response contains `embedToken`. Send `Authorization: Bearer <embedToken>` afterwards. No cookies are used. Tokens expire after 60 minutes and are revoked by `POST /api/v1/auth/logout`. |

Brute-force protection: progressive delays (HTTP 429 with `Retry-After`) — not permanent lockout.

## Main endpoints
| Area | Endpoints |
|---|---|
| **Learners (Track 1 contract)** | `POST /learners` (201 + Location), `PATCH /learners/{id}`, `PUT /learners/{id}/support`, `GET /learners/{id}/export`, `DELETE /learners/{id}` (body `{password}`, 204). Own id only; others → 404. |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/csrf`, `POST /auth/password` |
| Preferences | `GET/PUT /preferences` |
| Form engine | `GET /forms/{registration|profile|job-application|support-request}`, `GET /drafts`, `GET/PUT/DELETE /drafts/{flow}?context=` (PUT with `expectedVersion` → 409 `draft.conflict` on concurrent edits) |
| Onboarding & profile | `POST /onboarding/profile`, `GET/PUT /profile`, `PUT /profile/support-preferences` (private), `PUT /profile/resume` |
| Files | `POST /files?purpose=IDENTITY_DOCUMENT|RESUME` (multipart, ≤5 MB, type checked by content), `GET /files/{id}`, `GET /files/{id}/content`, `DELETE /files/{id}` |
| Identity | `GET /identity`, `POST /identity` |
| Support | `GET /support-requests`, `POST /support-requests` |
| Jobs | `GET /jobs?q=&region=&workMode=&type=&support=A&support=B` (support filter is private, never stored), `GET /jobs/{id}`, `GET /jobs/{id}/jsonld` (schema.org/JobPosting), `GET /jobs/{id}/application-form`, `GET /saved-jobs`, `PUT/DELETE /saved-jobs/{jobId}` |
| Applications | `POST /jobs/{id}/applications`, `GET /applications`, `GET /applications/{id}`, `POST /applications/{id}/withdraw`, `GET /consents`, `POST /consents/{id}/revoke` |
| Notifications | `GET /notifications`, `POST /notifications/{id}/read` |
| Help & assistant | `GET /help?locale=&q=`, `GET /help/{slug}`, `GET /assistant/status`, `POST /assistant/ask` |
| Account | `GET /account/export`, `POST /account/delete` |
| Employer (`EMPLOYER`) | `GET/POST /employer/jobs`, `GET/PUT /employer/jobs/{id}`, `GET /employer/jobs/{id}/applications`, `POST /employer/applications/{id}/status`, `GET /employer/applications/{id}/resume` |
| Support staff (`SUPPORT_STAFF`) | `GET /staff/verifications`, `POST /staff/verifications/{id}/decision`, `GET /staff/verifications/{id}/document`, `GET /staff/support-requests`, `POST /staff/support-requests/{id}/response`, `GET /staff/stats` |
| Embedding | `GET /embed/config?key=` or `?origin=` (keyless install) |

## Example: register and sign in (curl, first-party)
```bash
BASE=http://localhost:8080
curl -s -c jar -b jar $BASE/api/v1/auth/csrf >/dev/null
XSRF=$(grep XSRF-TOKEN jar | awk '{print $7}')
curl -s -c jar -b jar -H "X-XSRF-TOKEN: $XSRF" -H 'Content-Type: application/json' \
  -d '{"displayName":"Almaz","phone":"0911234567","password":"my coffee is hot","locale":"am","acceptPrivacyNotice":true}' \
  $BASE/api/v1/auth/register
curl -s -b jar "$BASE/api/v1/jobs?support=SIGN_LANGUAGE"
```

## Example: embedded flow (JavaScript inside the ACCESSFLOW iframe)
```js
const res = await fetch('/api/v1/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AccessFlow-Embed': 'pk_demo_learning_platform' },
  body: JSON.stringify({ identifier: '0911234567', password: '…' }), credentials: 'omit',
})
const { embedToken } = await res.json()
await fetch('/api/v1/profile', { headers: { Authorization: `Bearer ${embedToken}` }, credentials: 'omit' })
```
