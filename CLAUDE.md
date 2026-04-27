# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check + production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test suite is configured.

## Environment Variables

Create a `.env` file with:

```
VITE_GITHUB_TOKEN=...
VITE_GITHUB_OWNER=...
VITE_GITHUB_REPO=...
```

## Architecture

This app is a bookmark/reading-list viewer for Pokemon biology content. Data flows from GitHub Issues → parsed JSON → enriched with PokeAPI images → rendered as cards.

**Data pipeline** (`src/api/`):
- `github.ts` — fetches open issues from a GitHub repo; `parseBody` extracts a JSON block from each issue body (fenced in ` ```json ``` `)
- `pokemon.ts` — fetches official artwork from PokeAPI; includes a hardcoded Korean→English name mapping
- `biology.ts` — orchestrates the above: maps each issue into a `PokemonBiology` object, resolving images for the main pokemon and all related pokemon in parallel

**`PokemonBiology` shape** (the central type):
```ts
{ id, pokemon, pokemonImage, videoTitle, videoLink, primaryQuestion, relatedPokemon: { name, image }[] }
```

**UI** (`src/components/`):
- `ListCard` — clickable grid card showing pokemon image + video title
- `BiologyModal` — full-screen overlay with question, video link, and related pokemon chips; clicking the backdrop closes it

`App.tsx` owns all state (`docs`, `selected`, `loading`) and passes callbacks down.

**Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed).
