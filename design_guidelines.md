# Design Guidelines: AI Image Prompt Library (Arabic)

## Design Approach
**Reference-Based Approach** drawing from Pinterest's card masonry, Behance's project showcases, and Unsplash's image-heavy layouts. The design emphasizes visual discovery and creative inspiration with strong Arabic typography and RTL support.

## Core Design Principles
- **Visual-First Discovery**: Images and prompts are the hero, not buried in text
- **Seamless Bilingual Flow**: Arabic as primary with elegant RTL layout
- **Creative Confidence**: Bold, artistic aesthetic befitting AI-generated content
- **Effortless Exploration**: Minimal friction between browsing and generating

## Typography System

### Arabic Fonts (Primary)
- **Headers**: Tajawal Bold/ExtraBold (via Google Fonts)
  - Hero: 3xl to 5xl
  - Section Headers: 2xl to 3xl
  - Card Titles: xl to 2xl
- **Body**: Tajawal Regular/Medium
  - Primary: base to lg
  - Descriptions: sm to base

### English Fonts (Secondary)
- **Headers**: Inter Bold/SemiBold
- **Body**: Inter Regular/Medium

**Hierarchy Rules**:
- Prompt titles: Bold, larger (2xl)
- Categories/tags: Medium, smaller (sm-base)
- Generated image metadata: Regular, subtle (xs-sm)

## Layout System

### Spacing Primitives
Use Tailwind units: **2, 4, 8, 12, 16** for consistency
- Micro spacing: p-2, m-2
- Component spacing: p-4, gap-4
- Section spacing: py-12, py-16
- Container padding: px-4, px-8

### Grid Structure
- **Prompt Gallery**: Masonry-style grid
  - Mobile: 1 column
  - Tablet: 2 columns (md:grid-cols-2)
  - Desktop: 3-4 columns (lg:grid-cols-3 xl:grid-cols-4)
  - Gap: gap-4 to gap-6

- **Container Widths**:
  - Full sections: max-w-7xl
  - Content areas: max-w-6xl
  - Forms: max-w-2xl

## Component Library

### Navigation Bar
- Fixed/sticky top bar
- Logo (right side for RTL)
- Search bar (prominent center)
- "Add Prompt" CTA button (left side)
- Category dropdown/menu
- Clean backdrop blur effect

### Prompt Cards
**Card Structure** (Pinterest-inspired):
- Generated image thumbnail (16:9 or 1:1 aspect ratio)
- Prompt title overlay on image bottom with gradient backdrop
- Hover state: Full prompt preview, category tags appear
- Generate button appears on hover with blurred background
- Subtle shadow and rounded corners (rounded-lg to rounded-xl)

### Category Filter Bar
- Horizontal scrollable tags below nav
- Pill-shaped buttons with icon + label
- Active state clearly distinguished
- Sticky on scroll

### Prompt Detail Page
**Layout**:
- Left Column (60%):
  - Large generated image showcase
  - Image gallery if multiple generations
  - Download/Share buttons with blurred backgrounds overlaid on image
  
- Right Column (40%):
  - Prompt full text (large, readable)
  - Category tags
  - Description/notes
  - "Generate Image" primary CTA
  - Metadata (date, usage count)

### Image Generation Interface
- Modal overlay with dark backdrop
- Progress indicator during generation
- Generated image display (large)
- Regenerate and Download actions
- Prompt text reminder at bottom

### Search Results
- Instant search with live filtering
- Highlighted search terms in results
- Grid layout matching main gallery
- "No results" state with suggestions

### Add Prompt Form
- Clean, spacious layout
- Text area for prompt (large, with character count)
- Category selector (dropdown or pills)
- Description field
- Image upload for reference (optional but visible)
- Preview section showing card appearance
- Submit CTA

## Images Strategy

### Hero Section
**Large Hero Image**: Yes
- Full-width hero showcasing stunning AI-generated artwork
- Height: 60vh to 80vh
- Overlay gradient for text readability
- Centered Arabic headline: "مكتبة أوامر توليد الصور بالذكاء الاصطناعي"
- Subheadline + primary CTA ("Explore Prompts", "Start Creating")
- Search bar integrated into hero with blurred background

### Gallery Images
- All prompt cards display generated image thumbnails
- Lazy loading for performance
- Placeholder gradients during load
- High-quality, optimized formats (WebP)

### Detail Page Images
- Large showcase area (minimum 600px height)
- Multiple generated variations in carousel/grid
- Lightbox view on click

### Empty States
- Illustration or gradient backgrounds for "no prompts" states
- Inspiring visuals for "start generating" prompts

## Page-Specific Layouts

### Homepage
1. **Hero Section**: Full-width inspiring image + headline + search
2. **Featured Prompts**: Curated selection (2-3 large cards)
3. **Categories Showcase**: Grid of category cards with representative images
4. **Recent/Popular Prompts**: Masonry grid
5. **How It Works**: 3-column feature cards with icons
6. **CTA Section**: Encourage prompt submission

### Prompt Library
- Filter bar (sticky)
- Masonry grid of prompt cards
- Infinite scroll or pagination
- Sidebar filters (categories, tags) on desktop

### Prompt Detail
- Split layout (image left, info right)
- Related prompts at bottom
- Comments/feedback section

## RTL Considerations
- All layouts mirror for Arabic
- Navigation: Logo right, menu left
- Text alignment: right-aligned
- Icons: Flip directional icons (arrows, chevrons)
- Grid flow: Right to left

## Responsive Behavior
- Mobile: Single column, stacked layout
- Tablet: 2-column grids, simplified filters
- Desktop: Full multi-column masonry, sidebar filters

## Accessibility
- High contrast text on image overlays
- Focus states for all interactive elements
- Keyboard navigation support
- Semantic HTML structure
- Alt text for all images

This design creates a visually stunning, easy-to-navigate Arabic platform that celebrates AI-generated imagery while making prompt discovery and generation seamless.