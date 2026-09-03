# MCP Servers Configuration

| MCP server | Used for | When |
|---|---|---|
| Filesystem MCP | Scaffolding project structure, reading/writing `.agent/types/` | All blocks |
| Browser MCP (Antigravity's own) | Live-testing consent audio, OCR upload, mic permission flows | Blocks 1, 4, 7, 8 |
| Stitch MCP | Google's AI UI-generation tool — `extract_design_context` to lock tokens, `generate_screen_from_text` | Block 0, then as-needed |
| Obsidian MCP | Mirrors `.agent/decisions.md` and completion notes into vault (`claude/MediKiosk/`) | End of each block |
| GitHub MCP | Repo push, remote branch ops | **Block 8 only** |
| Railway MCP | Backend service provisioning, environment variables, deploy triggers | **Block 8 only** |
| Kaggle Official MCP | Dataset search and preview | Research tasks after Block 0 |
