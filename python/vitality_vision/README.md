# Vitality vision server (source mirror)

These files are a **copy** of the HTTP vision service that normally lives next to your release assets (`phase2_retrieval_e3/`, `vendor_models/`, etc.).

- Replace the `.py` files in your full runtime directory with these when you pull updates, **or** set `VITALITY_RUNTIME_DIR` in `scripts/local-paths.env` to a folder that contains **both** this code and the large asset bundle.

The bundle itself (FAISS index, encoder checkpoints, etc.) is not stored in git; see `docs/MODEL_ASSETS.md` patterns in the parent project README.
