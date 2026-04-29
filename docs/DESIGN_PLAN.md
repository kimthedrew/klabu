# The Green Stall — Design Plan
## Klabu UoN Food Delivery Platform

---

## 1. Overview

Redesign the existing Klabu web frontend using The Green Stall design identity: organic, texture-rich, warm earthy tones, paper surfaces, and rounded corners. The platform targets UoN students on mobile — all layouts are mobile-first (375px base width).

**Stack:** Next.js (existing) + Tailwind CSS v3 + existing component structure. Alpine.js interactions are replaced by React state since the project already uses React.

---

## 2. Design System Setup

### 2.1 Update `tailwind.config.js`

Replace the current green palette and Inter font with The Green Stall tokens:

```js
theme: {
  extend: {
    colors: {
      primary:    '#2E5C3E',
      background: '#F9F6F0',
      surface:    '#FFFFFA',
      text:       '#2D2823',
      muted:      '#A89F91',
      accent:     '#D96C4E',
    },
    fontFamily: {
      heading: ['Fraunces', 'serif'],
      body:    ['Outfit', 'sans-serif'],
    },
    borderRadius: {
      card:   '24px',
      button: '32px',
      pill:   '99px',
    },
    boxShadow: {
      soft: '0 8px 24px rgba(45, 40, 35, 0.08)',
    },
  },
},
```

### 2.2 Global CSS (`styles/globals.css`)

Add:
- Google Fonts import: Fraunces (600) + Outfit (400, 500)
- `body` background: `#F9F6F0`
- Noise texture overlay using `noise.svg` at 0.03 opacity
- Default `color: #2D2823` and `font-family: Outfit`

### 2.3 Shared Assets

| Asset | Description | Location |
|-------|-------------|----------|
| `noise.svg` | Subtle grain texture | `public/noise.svg` |
| `wavy-border.svg` | Organic header bottom border | `public/wavy-border.svg` |
| Stall placeholder image | Warm-toned fallback | `public/stall-placeholder.jpg` |

---

## 3. Component Library

Build these shared components before screens. Each maps directly to Stitch specs.

### 3.1 `StallCard`
- **File:** `components/StallCard.tsx`
- Surface `#FFFFFA`, `border-radius: 24px`, `box-shadow: soft`
- Top 160px: stall cover image with warm sepia overlay (`mix-blend-mode: multiply`, `#D96C4E` at 10% opacity)
- Bottom: stall name in Fraunces 600 18px, rating badge (terracotta star `#D96C4E`), estimated time
- Touch: scale down to `0.98` on `active`, spring back on release (CSS `transition: transform 0.15s`)
- Loading skeleton: shimmer blocks in `#A89F91` at 30% opacity, `border-radius: 24px`

### 3.2 `CategoryPill`
- **File:** `components/CategoryPill.tsx`
- Height 32px, horizontal padding 16px, `border-radius: 99px`
- Active: `bg-primary text-surface`
- Inactive: `bg-background text-text border border-muted`
- Font: Outfit 14px

### 3.3 `MenuItemRow`
- **File:** `components/MenuItemRow.tsx`
- `bg-surface`, bottom border `1px solid #A89F91`
- Name: Outfit 500 16px / Description: Outfit 400 14px `text-muted` / Price: Fraunces 600 16px `text-primary`
- Tapping opens `CustomizationSheet`

### 3.4 `CustomizationSheet`
- **File:** `components/CustomizationSheet.tsx`
- Bottom sheet, slides up from off-screen (CSS transform + transition)
- Backdrop blur overlay
- "Add to Basket — KES X" CTA button: `bg-primary text-surface border-radius: 32px`
- On confirm: dismiss sheet, increment basket counter

### 3.5 `QuantityStepper`
- **File:** `components/QuantityStepper.tsx`
- Height 32px, `bg-background border-radius: 99px`
- `−` and `+` flanking a centered number
- Font: Outfit 500 16px

### 3.6 `FloatingBasketButton`
- **File:** `components/FloatingBasketButton.tsx`
- Fixed bottom-center, `bg-primary`, `border-radius: 32px`
- Shows item count + total price
- Hides when cart is empty

### 3.7 `StatusTimeline`
- **File:** `components/StatusTimeline.tsx`
- Vertical line with dots
- Active dot: `#D96C4E` / Past: `#2E5C3E` / Future: `#A89F91`
- Labels: Outfit 14px

### 3.8 `SwipeToAccept`
- **File:** `components/SwipeToAccept.tsx`
- Full-width slider, draggable thumb (`#D96C4E`)
- Triggers at 90% travel
- Success: haptic feedback via `navigator.vibrate(200)`

### 3.9 `WavyHeader`
- **File:** `components/WavyHeader.tsx`
- `bg-primary`, wavy SVG border at bottom
- Shrinks and flattens wavy border on scroll (IntersectionObserver or scroll listener)
- Contains location dropdown + greeting text

---

## 4. Screen Plans

Build in this order — each screen builds on components from the previous.

---

### Screen 1: Student Home
**File:** `pages/index.tsx` (replace existing)

**Layout (mobile, 375px):**
```
┌─────────────────────────────┐
│  WavyHeader                 │  bg-primary, wavy bottom border
│  "Deliver to: Hall 9 ▾"    │  Outfit 14px muted-on-dark
│  "What are you hungry for?" │  Fraunces 600 24px white
├─────────────────────────────┤
│  CategoryPills (scrollX)    │  All / Chapati / Rice / Snacks ...
├─────────────────────────────┤
│  "Popular Today" section    │  Fraunces 600 20px
│  StallCard                  │
│  StallCard                  │
│  StallCard                  │
│  ...                        │
└─────────────────────────────┘
```

**Data:** Fetch from `GET /api/stalls` (existing endpoint)  
**Empty state:** Sleeping cat illustration + "No stalls open right now"  
**Loading state:** 3 shimmer StallCards

---

### Screen 2: Stall Menu
**File:** `pages/stall/[id].tsx` (replace existing)

**Layout:**
```
┌─────────────────────────────┐
│  Cover image (250px)        │  Warm overlay, back button top-left
│  parallax at 0.5x scroll    │
├─────────────────────────────┤
│  Stall name + info bar      │  Fraunces 600 22px + rating
├─────────────────────────────┤
│  CategoryTabs (sticky)      │  Chips: Mains / Sides / Drinks
├─────────────────────────────┤
│  MenuItemRow                │
│  MenuItemRow                │
│  MenuItemRow                │
│  (80px bottom padding)      │
└─────────────────────────────┘
│  FloatingBasketButton       │  Fixed bottom
```

**Data:** Fetch from `GET /api/stalls/:id`  
**Interaction:** Tap item → CustomizationSheet slides up

---

### Screen 3: Cart & Checkout
**File:** `pages/checkout.tsx` (new)

**Layout:**
```
┌─────────────────────────────┐
│  "Your Order" header        │  Fraunces 600 24px
├─────────────────────────────┤
│  Cart Summary Card          │  bg-surface, radius-card, shadow-soft
│  Item + QuantityStepper     │
│  Item + QuantityStepper     │
│  Subtotal line              │
├─────────────────────────────┤
│  Delivery Details Card      │
│  Campus dropdown            │  Main / Chiromo / Upper Kabete
│  Hostel / Building input    │
├─────────────────────────────┤
│  Order total                │  Fraunces 600 20px
│  (80px bottom padding)      │
└─────────────────────────────┘
│  "Pay KES X via M-Pesa"     │  Fixed bottom, bg-primary, radius-button
```

**Interaction:** Pay button → spinner → M-Pesa STK push overlay → success → redirect to Order Tracking  
**State managed in:** React context or local state passed from cart

---

### Screen 4: Order Tracking
**File:** `pages/orders/[id].tsx` (replace existing)

**Layout:**
```
┌─────────────────────────────┐
│  Map (50% screen height)    │  Mapbox, sepia style, green route line
│  Stall pin + Runner pin     │
├─────────────────────────────┤
│  Bottom Sheet (50% → 80%)   │  Swipe up to expand
│  StatusTimeline             │
│  Runner: photo + name + 📞  │
│  "Arriving in ~12 min"      │
└─────────────────────────────┘
```

**Data:** Poll `GET /api/orders/:id` every 10s (or Socket.io if available)  
**Map:** Mapbox GL JS with custom sepia style JSON

---

### Screen 5: Stall Dashboard
**File:** `pages/dashboard/index.tsx` (replace existing)

**Layout:**
```
┌─────────────────────────────┐
│  Header + Open/Closed toggle │  bg-primary header, large toggle
├─────────────────────────────┤
│  Tabs: New | Prep | Ready   │  Outfit 500 14px pill tabs
├─────────────────────────────┤
│  Order Card                 │  bg-surface, shadow-soft, radius-card
│  Order # + items + time     │
│  [Accept Order] button      │  Full width, bg-primary, radius-card
├─────────────────────────────┤
│  Order Card                 │
│  ...                        │
└─────────────────────────────┘
```

**Interaction:** Accept → card swipes right off screen (CSS translate + opacity), re-appears in Prep tab  
**Data:** Socket.io for real-time new orders (existing backend supports this)

---

### Screen 6: Runner Active Dash
**File:** `pages/runner/index.tsx` (new)

**Layout:**
```
┌─────────────────────────────┐
│  Header + earnings summary  │  bg-primary
├─────────────────────────────┤
│  Ping Card (available order)│  bg-surface, shadow-soft
│  Pickup: Club 36 Mamas      │
│  Dropoff: Hall 9, Chiromo   │
│  KES 50 · ~8 min            │
│  [SwipeToAccept]            │  #D96C4E thumb
├─────────────────────────────┤
│  Earnings today             │  Outfit 400 14px muted
│  KES 350 · 7 deliveries     │
└─────────────────────────────┘
```

**Active route mode:** Replaces list with turn-by-turn text + "Mark Delivered" CTA  
**Data:** Socket.io ping for new delivery requests

---

## 5. Build Order & Milestones

| Step | Task | Depends On |
|------|------|------------|
| 1 | Update `tailwind.config.js` + `globals.css` + fonts | — |
| 2 | Add `noise.svg` + `wavy-border.svg` to `public/` | Step 1 |
| 3 | Build `WavyHeader`, `StallCard`, `CategoryPill` | Step 1 |
| 4 | Build Student Home screen | Step 3 |
| 5 | Build `MenuItemRow`, `CustomizationSheet`, `FloatingBasketButton` | Step 3 |
| 6 | Build Stall Menu screen | Step 5 |
| 7 | Build `QuantityStepper` + Cart & Checkout screen | Step 6 |
| 8 | Build `StatusTimeline` + Order Tracking screen | Step 7 |
| 9 | Build Stall Dashboard screen | Step 4 |
| 10 | Build `SwipeToAccept` + Runner Active Dash screen | Step 9 |

---

## 6. Key Technical Notes

- **Fonts:** Load Fraunces + Outfit via `<link>` in `_document.tsx` from Google Fonts
- **Noise texture:** CSS pseudo-element on `body::after`, `pointer-events: none`, `z-index: 0`; all content uses `position: relative; z-index: 1`
- **Sepia image overlay:** Tailwind custom utility — `after:bg-accent/10 after:mix-blend-multiply` on image wrapper
- **Parallax:** Use `onScroll` listener updating a CSS `translateY` variable on the cover image
- **Bottom sheet:** CSS `transform: translateY` + `transition`, toggled by React state; backdrop is `fixed inset-0 bg-text/20 backdrop-blur-sm`
- **Map:** Mapbox GL JS — add `NEXT_PUBLIC_MAPBOX_TOKEN` env var. Custom style JSON to be created matching sepia palette
- **M-Pesa overlay:** Modal component, shows STK push sent message + polling for payment status via existing backend endpoint

---

## 7. Files to Create / Modify

```
klabu/web/
├── tailwind.config.js          MODIFY — new tokens
├── styles/globals.css          MODIFY — fonts, body bg, noise overlay
├── pages/
│   ├── index.tsx               REPLACE — Student Home
│   ├── checkout.tsx            NEW — Cart & Checkout
│   ├── stall/[id].tsx          REPLACE — Stall Menu
│   ├── orders/[id].tsx         REPLACE — Order Tracking
│   ├── dashboard/index.tsx     REPLACE — Stall Dashboard
│   └── runner/index.tsx        NEW — Runner Active Dash
├── components/
│   ├── WavyHeader.tsx          NEW
│   ├── StallCard.tsx           NEW
│   ├── CategoryPill.tsx        NEW
│   ├── MenuItemRow.tsx         NEW
│   ├── CustomizationSheet.tsx  NEW
│   ├── QuantityStepper.tsx     NEW
│   ├── FloatingBasketButton.tsx NEW
│   ├── StatusTimeline.tsx      NEW
│   └── SwipeToAccept.tsx       NEW
└── public/
    ├── noise.svg               NEW
    └── wavy-border.svg         NEW
```
