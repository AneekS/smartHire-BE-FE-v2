# Resume Pipeline — Post-Audit Notes

Stack: **qwen3:8b** extraction, **qwen3-embedding:8b** embeddings (4096d), **Azure AI Search** for vectors.

## Extraction passes

- **Pass 1:** Broad extraction (always).
- **Pass 2:** Runs when any `field_confidence` is below `CONFIDENCE_THRESHOLD` (default 0.70).
- **Pass 3:** Self-critique when `OLLAMA_EXTRACTION_MAX_PASSES >= 3`, or when extraction is still sparse and `MAX_PASSES >= 2`.

`EXTRACTION_FAST_MODE=true` forces a single pass (dev only). Production startup logs a warning if fast mode is enabled.

## Async upload

- `ASYNC_RESUME_PIPELINE` defaults to **true** when `NODE_ENV=production`.
- Local dev: set `ASYNC_RESUME_PIPELINE=false` for synchronous parse in the upload request.
- Async path returns **202** with `status: QUEUED` after blob upload, then enqueues parse via Redis/Event Grid.

## Security

- Resume text is **PII-masked** and **prompt-injection sanitized** before Ollama.
- Set `PII_ENCRYPTION_KEY` to persist encrypted `piiMaskEncrypted` on `ResumeVersion`.

## Azure Search

- Documents include `tenantId` and `embeddingModel`.
- Queries must use `buildSearchFilter({ tenantId, candidateId, docType })` for isolation.
- Re-run `npm run search:setup` after adding new index fields.

## Scoring

- Core weighted score is deterministic TypeScript math.
- Semantic component uses vector search when configured; falls back to keyword overlap heuristic when search/embed is unavailable.
- Ollama narrative explanations do **not** receive numeric scores (evidence-only context).
