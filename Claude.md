# Project Structure

## Overview
Arabic-first smart financial manager that helps users enter monthly income, choose a distribution plan, track expenses/savings/investments, manage goals, and view market indicators.

## Tech Stack
- Framework: Next.js 15 App Router
- Language: TypeScript
- UI: React, Tailwind CSS, shadcn/ui-style components
- Charts: Recharts
- Icons: lucide-react
- Font/Layout: Cairo font with RTL support

## Directory Structure
```text
src/
├── app/
│   ├── api/
│   │   ├── health/            # Health check route
│   │   └── market-ticker/     # Market ticker data route
│   ├── globals.css            # Global styles and ticker animation
│   ├── layout.tsx             # Root layout, Arabic RTL setup
│   └── page.tsx               # Main financial manager UI
├── components/                # Shared UI and app components
└── lib/                       # Utility helpers
```

## Core Systems

### Financial Manager
- Status: Implemented
- Location: `src/app/page.tsx`
- Description: Calculates monthly income distribution with preset and manual allocation modes, charity percentage, dynamic financial items, goals, charts, and advice.

### Market Ticker
- Status: Implemented
- Location: `src/app/page.tsx`, `src/app/api/market-ticker/route.ts`
- Description: Displays a moving market ticker with categories for global, Gulf, Asian, European, crypto, and metals markets. Data is requested through an internal API route from external providers, with local fallback data when providers are unavailable.

### Internationalization
- Status: Implemented
- Location: `src/app/page.tsx`, `src/app/layout.tsx`
- Description: Arabic and English interface toggle with RTL/LTR switching.

### Currency Selection
- Status: Implemented
- Location: `src/app/page.tsx`
- Description: Supports a broad currency list with Kuwaiti Dinar as the default.

## Current State
- [x] Arabic smart financial manager UI
- [x] Currency selector with KWD default
- [x] Income split presets and manual allocation analysis
- [x] Dynamic rows for expenses, savings, and investment
- [x] Financial goals section
- [x] Arabic/English language selector
- [x] Moving market ticker with external data route
- [x] Boursa Kuwait-inspired visual background

## Maintenance Log
- 2026-05-12: Added project knowledge base and documented financial manager, market ticker API, language support, and current implementation state.
