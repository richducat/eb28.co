# Search API patch for Ken

`cadetcatch-search-web-repair.patch` is commit `75536f8` from the local `cadetcatch-search-api` reference repository. SHA-256:

```text
ae955d833a43c95dfc28f80bd6841fbcb8feed204d90fba115a748e804b36a02
```

Ken must first identify the exact source currently deployed at `api.cadetcatch.com`. Review and port this patch into that source; do not blindly replace production or change the existing mobile `/search` contract. The patch adds the separate protected `/desktop/search` route, durable photo ingestion/reconciliation, readiness reporting, image normalization, and the fallback detector.

No iOS or Android files are part of the patch.
