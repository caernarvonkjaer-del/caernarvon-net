# Agent Directives & Operational Rules

## Windows Path Formatting for Search Tools

When executing codebase search, pattern matching, or file viewing tools (`grep_search`, `find_by_name`, `view_file`) on Windows:

- **Always use forward slashes (`/`) for all file paths** (e.g. `d:/caernarvon-net/probate-guardian/src/features/...`).
- **Do not pass raw Windows backslashes (`\`) in tool path arguments.** Under underlying search utilities (such as `ripgrep` and `fd`), backslashes in exact file paths can be interpreted as string escape characters, leading to false-negative "file not found" or "no results found" responses.
