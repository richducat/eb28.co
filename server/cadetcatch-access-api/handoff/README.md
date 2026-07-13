# Search API patch for Ken

`cadetcatch-search-web-repair.patch` is commit `6c159f4` from the local `cadetcatch-search-api` reference repository. SHA-256:

```text
536ee0c8e28095c22308f902ad2146e1994e15cda82c575af1998c7bc1d55685
```

Ken must first identify the exact source currently deployed at `api.cadetcatch.com`. Review and port this patch into that source; do not blindly replace production or change the existing mobile `/search` contract. The patch adds the separate protected `/desktop/search` route, durable photo ingestion/reconciliation, readiness reporting, image normalization, and the fallback detector.

No iOS or Android files are part of the patch.
