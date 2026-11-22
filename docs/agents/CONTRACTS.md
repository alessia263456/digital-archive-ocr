# Contracts — proiect1

<!-- graffino-agentic:begin v1 -->
> Promises across a boundary. **Provided:** this repo owns the contract; the text
> lives here only. **Consumed:** a link to the provider's entry plus the fields this
> repo relies on. **External:** what we rely on from a third-party service.
> Changing a provided contract is a PROPOSAL (AGENTS.md → The gate) and the plan
> lists the consumers' files too. Status: `approved` · `proposed` · `superseded-by`.
<!-- graffino-agentic:end -->

## Index
- C-001 · Expiring Signed URL document delivery endpoint · provided

---

## Provided

## C-001 · Expiring Signed URL document delivery endpoint
- **Status:** approved
- **Date:** 2026-11-21
- **Interface:** HTTP `GET /api/documents/deliver/{token}` with query parameters `expires` (integer Unix epoch timestamp) and `signature` (HMAC-SHA256 hex digest), with optional `disposition` (`inline` [default] or `attachment`). The `{token}` parameter is an opaque, URL-safe encrypted payload resolving internally to a private storage object. Valid requests stream the document binary with accurate `Content-Type` and security headers (`Cache-Control: private, no-store, max-age=0`, `X-Content-Type-Options: nosniff`). Invalid or expired signatures return HTTP 403; unresolvable or missing files return HTTP 404.
- **Evidence:** docs/plans/p22-11-private-object-storage-and-signed-urls.md
- **Consumers:** Frontend document viewers (DS-002, DS-009) and external Share Link recipients
- **Confirmed:** 2026-11-21

## Consumed

## External
