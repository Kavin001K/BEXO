# Bexo — Design system (mobile)

## Scene

Student or professional completing their portfolio on a phone in daylight. Calm, trustworthy, editorial — paper and ink, not neon tooling.

## Color strategy

**Restrained** — tinted warm neutrals + one accent ≤10% surface area.

| Token | Hex | Role |
|-------|-----|------|
| background | `#F7F5F0` | Bone page |
| surface | `#FFFFFF` | Cards, inputs |
| foreground | `#1C1917` | Primary text (warm ink) |
| mutedForeground | `#78716C` | Secondary text |
| border | `#E7E5E4` | Hairlines |
| primary | `#0D6B5C` | Deep emerald — CTAs, links |
| primaryForeground | `#F7F5F0` | On primary |
| accent | `#C45C4A` | Coral — highlights, warnings |
| success | `#0D6B5C` | Build ready, 90%+ |
| warning | `#B45309` | Incomplete profile |
| destructive | `#B91C1C` | Errors |
| overlay | `rgba(28,25,23,0.4)` | Sheets |

No pure `#000` / `#fff`. No purple primary. Gradients only as soft bone→sand washes on marketing screens.

## Typography

- **Display / UI:** DM Sans (400, 500, 700)
- **Mono / metrics:** JetBrains Mono (400, 700)
- Hierarchy: ≥1.25 scale between steps; body max ~65 characters per line where possible
- No serif on forms, settings, or dashboard

## Spacing

`4, 8, 12, 16, 24, 32, 48` — section gaps favor 24–32 on mobile.

## Radius

- `sm`: 10
- `md`: 14
- `lg`: 20 (primary containers, buttons)
- `xl`: 28 (hero panels)

## Elevation

Subtle tinted shadows only: `0 12px 32px -12px rgba(28,25,23,0.08)`

## Layout

- Single column on phone; asymmetric marketing only on walkthrough/login
- No nested cards; no 3-equal-column feature grids
- No `border-left` accent stripes on list rows
- Full-height sections: use flex + safe area, not broken `h-screen` on web

## Motion

- Reanimated springs: `stiffness: 100`, `damping: 20`
- Staggered `FadeInDown` on screen mount (60–80ms steps)
- Press: `scale(0.98)` on primary actions
- No fake build progress bars

## Haptics

- Light impact: taps, tab change
- Success: OTP verified, build complete
- Warning: once per session when profile &lt; 90% on home mount
- Error: form validation failure

## Components

Use shared primitives: `ScreenShell`, `ScreenHeader`, `BexoButton`, `FormField`, `OTPInput`, `ProgressRing`, `BuildStatusCard`, `ProfileActionStrip`, `EmptyState`, `ListRow`.

## Brand mark (reference)

Logo metaphor: **frame + growth path** — a handle/window shape with a single ascending line (portfolio as living artifact). Wordmark: **Bexo** in DM Sans 700, tight tracking.
