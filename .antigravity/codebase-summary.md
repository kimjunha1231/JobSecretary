# JobSecretary Codebase Snapshot (Token Optimized)

## 🗺 Arch: FSD (Layered Hierarchy)
- **app**: Pages, Providers, Layouts, Global CSS
- **widgets**: Boards (Archive, Dash, DocDetail/Edit/Write, Landing, Login, Resume), GlobalSidebar, GlobalAlert
- **features**: AI, Auth, DocArchive, DocEditor, DocKanban, DocWrite, RefSearch, ResumeEditor
- **entities**: Document (actions, hooks, model, server), Draft, User (model, server), Resume (UI/Lib)
- **shared**: API (client/server/query-client), UI (Shadcn-based), Lib (diff, logger, utils), Config (ai, const), Hooks, Types

## 🛠 Tech Stack
- **Core**: Next.js 15 (App Router), TS, Supabase (Auth, DB, RLS)
- **State/Data**: TanStack Query (Server), Zustand (Client), RHF + Zod (Forms)
- **Styles/UI**: Tailwind CSS, Framer Motion, Lucide, Sonner
- **Stability**: Sentry (Error tracking), Jest (Unit), Playwright (E2E)

## 🔑 Base Patterns
- **API**: Shared client/server wrappers; FSD slice-level API functions.
- **UI**: Thick Hooks (logic) + Thin Components (render); Public API (index.ts) enforcement.
- **Rules**: instructions.md (FSD, Korean Think, a11y, SEO, Simultaneous Testing).

## 🚀 Key Features Meta
- **Doc-Archive**: DnD filtering, archiving docs.
- **Doc-Editor**: AI-powered doc editing, diffing.
- **Resume-Editor**: PDF export (file-saver), complex layout management.
- **AI-Assistant**: Seamless AI integration across features.
