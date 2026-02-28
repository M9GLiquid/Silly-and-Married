# Wedding Website: Design System

Quick reference for colors and fonts used across the site.

---

## Colors

| Name | Hex | Use |
|------|-----|-----|
| **Background** | `#b5c1b5` | Page background |
| **Primary** | `#813d6e` | Headings, buttons, links, accents |
| **Secondary** | `#d7adcd` | Hover states, tape, decorative borders |
| **Paper** | `#c2cbec` | Cards, address blocks, story text |
| **Muted** | `#b5c1b5` | Same as background; subtle borders |
| **Olive** | `#a6a261` | Small accents (use sparingly) |
| **Deep olive** | `#7d7648` | Button hover, footer accents |
| **Ink** | `#2b2b2b` | Body text |

### Quick rules
- **Primary** = main accent. Use for CTAs and links.
- **Background** = calm base. Keep large areas soft.
- **Paper** = card backgrounds.
- **Olives** = seasoning only (~5–10% of UI).

---

## Fonts

| Role | Font stack | Use |
|------|------------|-----|
| **Header** | Noto Serif Display (Extra Condensed) | Logo, section titles, headings |
| **Body** | Gowun Batang, Atteron, Georgia | Body text, labels, nav |
| **Script** | Pinyon Script | Decorative headings (optional) |
| **Handwriting** | La Belle Aurore | Captions, quotes |
| **Mono** | Courier Prime | Addresses, code-like text |

### Google Fonts URL
```
https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wdth,wght@70,100..900&family=Gowun+Batang:wght@400;700&family=Pinyon+Script&family=La+Belle+Aurore&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap
```

### CSS variables (from site.css)
```css
--font-header: "Noto Serif Display", serif;
--font-body: "Gowun Batang", "Atteron", Georgia, serif;
```

### Header font (Extra Condensed)
```css
font-family: "Noto Serif Display", serif;
font-variation-settings: "wdth" 70;
```

> **Note:** Atteron is not on Google Fonts. It’s in the stack as a fallback for users who have it installed.

---

## Tailwind classes

| Class | Maps to |
|-------|---------|
| `text-primary` | #813d6e |
| `text-sepia` | #7d7648 (deep olive) |
| `bg-paper` | #c2cbec |
| `font-header` | Noto Serif Display Extra Condensed |
| `font-body` | Gowun Batang, Atteron, Georgia |
| `font-handwriting` | La Belle Aurore |
| `font-script` | Pinyon Script |

---

## Buttons & links

| Element | Colors |
|---------|--------|
| Primary button | bg `#813d6e`, text `#fde4ea`, hover `#7d7648` |
| Links | color `#813d6e`, hover `#7d7648` |
