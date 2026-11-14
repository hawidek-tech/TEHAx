# Demo partner site

A neutral "Demo Learning Platform" page that embeds ACCESSFLOW with a single script tag, served from a
**different origin** (http://localhost:5500) so origin checks, `frame-ancestors` and the full-page fallback are
exercised realistically. It does not imitate Savanna or any real organisation.

```bash
# 1. Run ACCESSFLOW in production mode (backend serving the built frontend) on port 8081 - see the main README.
# 2. Serve this page:
node demo-partner-site/serve.mjs 5500 http://localhost:8081
# 3. Open http://localhost:5500
```

The partner key `pk_demo_learning_platform` is seeded with allowed origins `http://localhost:5500` and
`http://127.0.0.1:5500`. Opening the page from any other origin shows the "not allowed" message inside the frame,
and the browser refuses to render the frame at all because of the server's `frame-ancestors` policy.
