# Agent Rules & Safety Guidelines

To ensure the safety, stability, and integrity of this codebase, any AI agent interacting with this repository must strictly adhere to the following rules.

---

## 🛡️ Codebase Preservation & Safety

1. **Precise & Minimal Edits**
   * Do not rewrite entire files if only small changes are needed. Always use targeted replacements (`replace_file_content` or `multi_replace_file_content`).
   * Preserve all existing comments, docstrings, formatting, and structure unless they are directly related to the requested change.

2. **No Placeholders or Truncated Code**
   * Never output partial code blocks, generic `// TODO` comments, or `...` placeholders that replace existing functional code.
   * Every line of code written must be complete, syntactically valid, and fully operational.

3. **Incremental Development**
   * Implement complex tasks in small, logical, and self-contained steps.
   * Verify each step before moving on to the next one to avoid compounding errors.

4. **Verify Imports and Dependencies**
   * When modifying or introducing files, ensure all import paths are correct and resolve successfully.
   * Respect standard import patterns and TypeScript `type` imports (`import type { ... }`) to comply with `verbatimModuleSyntax` as established in this project.

---

## 🛠️ Verification & Quality Assurance

1. **Compilation & Static Checks**
   * After making changes, always run the appropriate build or compilation commands (e.g., `npm run build` or type checks) to ensure that no typescript errors or broken imports are introduced.
   * Ensure that the client app and server processes compile cleanly without syntax or type errors.

2. **No Destructive Tool Usage**
   * Never run destructive shell commands (like `rm -rf` on critical directories, `git clean -fd`, etc.) without explicit user approval.
   * If a file needs to be deleted, ensure it is completely unused and obsolete before proposing its deletion.

---

## 🎨 Architectural Consistency

1. **Respect Design Patterns**
   * Follow the existing folder structure and design patterns. For instance, respect the modular API type definitions under `client/src/types/` and the server route/controller separation.
   * Do not introduce arbitrary coding styles, styling frameworks, or libraries that diverge from the current technology stack unless specifically instructed by the user.

2. **Error Handling & Resilience**
   * All new handlers, utility functions, or API routes must include appropriate `try/catch` blocks, descriptive error logging, and graceful error responses.
   * Always validate inputs at system boundaries (e.g., IPC channels or API endpoints) to prevent crashes.
