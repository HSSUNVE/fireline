---
name: design-md
description: >
  Apply a brand-inspired DESIGN.md when the user asks for UI that looks like a
  known product (Stripe, Linear, Vercel, Notion, Apple, Nike, Spotify, Claude,
  Cursor, and the other brands in this skill's catalog), or when they mention
  DESIGN.md, awesome-design-md, or getdesign.md. Read
  references/<slug>/DESIGN.md and follow its colors, type, components, layout,
  and guardrails. Do not use this skill for ordinary UI work that does not name
  a catalog brand or this skill.
---

# DESIGN.md

This skill is a local snapshot of [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (`design-md/`, commit `fcc70284932276d085f01ef9f83edde90b1258cb`). Each reference is an inspired reading of a public website, written in the [Google Stitch DESIGN.md](https://stitch.withgoogle.com/docs/design-md/overview/) format. It is not an official brand kit. Do not copy logos, wordmarks, or proprietary font files. Use the fallbacks named in the file.

The MIT license is in `LICENSE` next to this file.

## When to use

Use this skill only when the user:

- names a brand in the catalog and wants UI in that visual language
- invokes `/design-md`
- asks to follow a `DESIGN.md` from awesome-design-md or getdesign.md

Leave the project's existing look alone when they did not ask for a catalog brand. A `DESIGN.md` in the project root, if one exists, is that product's own system and wins over this catalog unless they explicitly ask to restyle toward a catalog brand.

## How to apply

1. Pick a slug from the catalog. Normalize obvious names (`Linear` → `linear.app`, `BMW M` → `bmw-m`, `Cal.com` → `cal`, `The Verge` → `theverge`, `xAI` → `x.ai`). If two slugs fit (BMW and BMW M), ask which one.
2. Read the whole file at `references/<slug>/DESIGN.md` (relative to this skill) before writing UI.
3. Follow every section it contains: atmosphere, color roles, type hierarchy, components and states, layout, depth, do's and don'ts, responsive behavior, and any agent prompt guide.
4. Map those tokens into the project's styling (CSS variables, a theme object, or Tailwind theme). Do not invent a second palette beside the file.
5. Keep the product's content and behavior. Change the visual language unless the user also asked for new copy or flows.
6. Before finishing, re-read the do's and don'ts and fix anything that breaks them.
7. Tell the user which slug you followed.

Some files start with YAML frontmatter (`colors`, `typography`). Others are markdown with numbered sections. Treat both as the source of truth.

If the user wants that brand to be the project's standing design system, copy `references/<slug>/DESIGN.md` to `DESIGN.md` at the project root and then follow that copy.

If they name a brand that is not in the catalog, say so and offer the closest slug. Do not fetch a replacement design system from the web unless they ask.

## Catalog

Slugs are the folder names under `references/`.

**AI and LLM:** `claude`, `cohere`, `elevenlabs`, `jobright`, `minimax`, `mistral.ai`, `ollama`, `opencode.ai`, `replicate`, `runwayml`, `together.ai`, `voltagent`, `x.ai`

**Developer tools:** `cursor`, `expo`, `lovable`, `raycast`, `superhuman`, `vercel`, `warp`

**Backend and devops:** `clickhouse`, `composio`, `hashicorp`, `mongodb`, `oracle`, `posthog`, `sanity`, `sentry`, `supabase`

**Productivity and SaaS:** `cal`, `intercom`, `linear.app`, `mintlify`, `notion`, `resend`, `sap`, `slack`, `zapier`

**Design and creative:** `airtable`, `clay`, `figma`, `framer`, `miro`, `webflow`

**Fintech and crypto:** `binance`, `coinbase`, `kraken`, `mastercard`, `mercury`, `nerdwallet`, `revolut`, `stripe`, `wise`

**Commerce:** `airbnb`, `meta`, `mydealz`, `nike`, `shopify`, `starbucks`

**Media and consumer:** `1win`, `aljazeera`, `apple`, `dji`, `hp`, `ibm`, `nvidia`, `oura`, `pinterest`, `playstation`, `spacex`, `spotify`, `theverge`, `uber`, `vodafone`, `wired`

**Automotive:** `bmw`, `bmw-m`, `bugatti`, `ferrari`, `lamborghini`, `renault`, `tesla`

**Retro web:** `dell-1996`, `nintendo-2001`
