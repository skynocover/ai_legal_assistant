# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm dev      # Start development server (http://localhost:3000)
pnpm build    # Production build
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

## Tech Stack

- **Next.js 16** with App Router and React 19
- **TypeScript** with strict mode, path alias `@/*` maps to project root
- **Tailwind CSS 4** with PostCSS plugin (`@tailwindcss/postcss`)
- **shadcn/ui** components (New York style) built on Radix UI
- **react-hook-form + Zod** for form handling and validation
- **next-themes** for dark mode support

## Architecture

### Routing Pattern
The app uses state-based client-side routing rather than file-based routing:
- `app/page.tsx` renders a sidebar + content area
- Four main sections controlled by `activeMenuItem` state:
  - `"line-chat"` → ImageToPdfConverter (images/Line chats to PDF)
  - `"transcription"` → TranscriptionEditor (audio transcription)
  - `"rename"` → FileRenamer (batch file renaming)
  - `"case-management"` → CaseManagement (legal case management)

### Component Organization
- `/components/ui/` - shadcn/ui reusable components (50+ files)
- `/components/` - Feature components (sidebar.tsx, image-to-pdf-converter.tsx, etc.)
- `/hooks/` - Custom hooks (use-mobile.ts for 768px breakpoint, use-toast.ts)
- `/lib/utils.ts` - `cn()` helper combining clsx + tailwind-merge

### Styling
- CSS variables defined in `styles/globals.css` using OKLch color space
- Dark mode via `next-themes` with `.dark` class variant
- Use `cn()` helper for conditional class merging

## Conventions

- **Language**: All UI text is in Traditional Chinese (zh-TW)
- **File naming**: kebab-case (e.g., `image-to-pdf-converter.tsx`)
- **Component naming**: PascalCase (e.g., `ImageToPdfConverter`)
- **Client components**: Use `"use client"` directive for interactive components
- **State management**: Local component state with `useState`, localStorage for persistence (no Redux/Zustand)

## Build Notes

- TypeScript errors are ignored during build (`next.config.mjs`: `ignoreBuildErrors: true`)
- Image optimization is disabled (`unoptimized: true`)

## Critical Rules

### ✅ DO
- 使用 TypeScript，不要使用 `any` 類型
- 為每個函數定義參數和返回類型
- Always start by creating a detailed todo list for the current task.
- Check the todo list before starting each step, and update it after each step.
- 確認TODO.md 的內容 必要時可以修改 例如做完或是你認為需要加上或補充的

### ❌ NEVER
- **不要修改 package.json 的依賴版本**
- **不要創建超過 300 行的組件文件**
- 不要換成Gemini api, 一率使用openrouter

### ⚠️ IMPORTANT
如果 Claude 建議違反上述規則，請要求我（用戶）確認。
