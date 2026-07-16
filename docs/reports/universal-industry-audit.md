# Universal Industry Audit Report

**Date:** 2026-07-14
**Scope:** Entire build-same-engine repository
**Purpose:** Identify ALL hardcoded industry knowledge to enable migration to a universal, data-driven architecture

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total hardcoded mapping structures** | 66+ |
| **Total unique industry slugs referenced** | ~40 |
| **Total files with industry-specific logic** | 30+ |
| **Estimated lines of industry-specific code** | ~5,000+ |
| **Industry duplication index** | Same industries repeated 5-12x across files |

### Core Problem

Every new industry requires touching 10-15 files to add detection keywords, copy templates, design profiles, experience profiles, domain data, layout maps, color palettes, vocabulary maps, compliance rules, and more. This is unsustainable.

---

## Phase 1: Hardcoded Industry Detection

### 1.1 INDUSTRY_MAPPINGS (intake-parser.ts:34-417)

**23 industries with keyword-based detection:**

| Industry | Keywords | Sub-Industries | Business Models |
|----------|----------|----------------|-----------------|
| restaurant | food, dining, menu, chef, cuisine | coffee, cafe, bakery, fine-dining, fast-food | direct-sales |
| healthcare | health, medical, clinic, hospital | dental, therapy, pharmacy, veterinary, cosmetic | service-booking |
| saas | software, platform, dashboard | dev-tools, analytics, crm, erp, project-mgmt | subscription |
| perfume | perfume, fragrance, scent | niche-perfume, luxury-fragrance, oud | direct-sales |
| ecommerce | shop, store, product, cart | fashion, electronics, beauty, food, supplement, footwear | direct-sales, marketplace |
| fitness | gym, workout, exercise | crossfit, yoga, personal-training | membership |
| education | school, course, learn, tutor | coaching, university, k-12, upsc | direct-sales |
| realestate | property, house, apartment | commercial, rental, luxury-realty | service-booking |
| legal | lawyer, attorney, law-firm | corporate, litigation, family | service-booking |
| agency | marketing, creative, design | digital-agency, branding | direct-sales |
| nonprofit | charity, donation, NGO | foundation, community | donation |
| media | blog, news, magazine, podcast | youtube, newsletter | advertising |
| travel | hotel, booking, trip, tourism | luxury-travel, business-travel | booking |
| luxury | luxury, premium, exclusive | jewelry, watches | direct-sales |
| beauty | salon, skincare, makeup | spa, cosmetics | service-booking |
| event | wedding, conference, party | corporate-events | service-booking |
| portfolio | portfolio, personal, showcase | creative-portfolio | direct-sales |
| automotive | car, vehicle, auto-dealer | ev, motorcycle | direct-sales |
| enterprise-software | erp, crm, enterprise | internal-tools | subscription |
| logistics | shipping, delivery, fleet | 3pl, warehousing | direct-sales |
| manufacturing | factory, production, assembly | textile, automotive | direct-sales |
| fintech | banking, payments, insurance | crypto, neobank | subscription |
| proptech | property-tech, real-estate-tech |  | subscription |

**Total: ~300+ keywords, 60+ sub-industries**

### 1.2 Additional Detection Structures (intake-parser.ts)

| Structure | Lines | Entries | Purpose |
|-----------|-------|---------|---------|
| BUSINESS_MODEL_KEYWORDS | 421-432 | 7 models | Detect subscription/marketplace/etc from prompt |
| CAPABILITY_KEYWORDS | 436-453 | 16 capabilities | Detect commerce/booking/analytics needs |
| PERSONA_KEYWORDS | 803-814 | 10 industries | Detect customer personas |
| REVENUE_FLOW_KEYWORDS | 816-824 | 7 flows | Detect revenue model |
| PAYMENT_METHOD_KEYWORDS | 826-836 | 9 methods | Detect payment preferences |
| WORKFLOW_KEYWORDS | 838-847 | 8 workflows | Detect business operations |
| KPI_KEYWORDS | 849-858 | 8 KPIs | Detect business metrics |
| VOCABULARY_MAPS | 860-872 | 11 industries | Industry-specific term replacements |
| Niche brand words | 710-753 | 10 niches | Brand name generation |
| Industry names fallback | (same) | 23 industries | Fallback brand name generation |

### 1.3 Detection in Other Files

| File | Lines | Industries | Purpose |
|------|-------|------------|---------|
| domain-detector.ts | 49-72 | 22 | INDUSTRY_DOMAIN_MAP: sections, color, mood per industry |
| website-adapter.ts | 8-22 | 12 | URL-based industry detection |
| website-adapter.ts | 103-157 | 12 each | Per-industry pages, entities, integrations |
| prd-adapter.ts | 19-32 | 12 | PRD text industry detection |
| agent-generators.ts | 108-129 | 9 | Keyword-based industry detection |
| reference-scraper.ts | 811-817 | 5 | URL content to industry |
| architect.ts | 478-483 | ~15 | Industry word exclusion set |

---

## Phase 2: Hardcoded Design Profiles

### 2.1 Design DNA (design-dna.ts)

| Function | Lines | Industries | Purpose |
|----------|-------|------------|---------|
| inferPersonality | 262-277 | ~40 | Industry → BrandPersonality |
| buildColors | 289-353 | ~40 | Industry → HSL color palette |
| buildRadius | 453-471 | ~10 | Industry → border-radius scale |
| buildPhotography | 584-621 | ~11 | Industry → image queries, hero strategy |
| buildTables | 656-668 | ~7 | Industry → table density |
| buildForms | 670-681 | ~7 | Industry → form layout |
| buildNav | 725-734 | 4 | Industry → nav type (top/sidebar) |
| buildLayout | 736-762 | ~13 | Industry → hero layout, density |

### 2.2 Design Intelligence Engines (5 engines, 12 industries each)

| Engine | File | Industries | Data |
|--------|------|------------|------|
| Visual Engine | visual-engine.ts:15-28 | 12 | INDUSTRY_COLORS: full color token palettes |
| Visual Engine | visual-engine.ts:32-44 | 12 | TYPOGRAPHY_PRESETS: font pairings |
| Polish Engine | polish-engine.ts:16-36 | 12 | INDUSTRY_POLISH: spacing, shadows, hover |
| Motion Engine | motion-engine.ts:16-120 | 12 | INDUSTRY_MOTION: animation presets |
| Component Engine | component-engine.ts:14-93 | 12 | INDUSTRY_COMPONENTS: recommended components |
| Design System Engine | design-system-engine.ts:25-31 | 5 | INDUSTRY_LAYOUT_OVERRIDES |

### 2.3 Skill Integrator (skill-integrator.ts)

| Structure | Lines | Industries | Purpose |
|-----------|-------|------------|---------|
| Color palettes (UI/UX Pro Max) | 160-243 | 30 | Named color palette library |
| Font pairings | 244-260 | 15 | Named font pairing library |
| Product templates | 367-416 | 6 | Per-product-type section templates |
| INDUSTRY_LAYOUT_MAP | 564-744 | 24 | Industry → component layout variants |
| getPaletteKey | 986-1031 | ~30 | Industry → palette key mapping |
| getFontKey | 1034-1051 | ~14 | Industry → font key mapping |
| getStyleKey | 1053-1067 | ~10 | Industry → style key mapping |

---

## Phase 3: Hardcoded Content & Copy

### 3.1 Industry Copy Schema (industry-copy-schema.ts)

**18 industries with full copy schemas:**

| Industry | Fields per entry |
|----------|-----------------|
| restaurant, coffee, gym, ecommerce-supplement, salon, wholesale, legal, saas, realestate, education, travel, event, luxury, media, spa, healthcare, perfume, fragrance | heroHeading, heroSubheading, heroPrimaryButton, heroSecondaryButton, heroTrustBadges, heroImageKeywords, featuresHeading, featuresSubheading, 6 feature items, testimonialsHeading, testimonialsSubheading, 3 testimonial templates, ctaHeading, ctaPrimaryButton, ctaTrustLine, pricingHeading, pricingSubheading, 4 stats, footerTagline, forbiddenPhrases |

**Fuzzy match bug:** `getIndustryCopy('ecommerce')` matches `ecommerce-supplement` due to substring check.

### 3.2 Domain Data (domain-data.ts)

**21 industry entries with complete mock data:**

| Industry | Products | Testimonials | Features | Services | Team |
|----------|----------|-------------|----------|----------|------|
| real-estate | 6 | 3 | 6 | 4 | 3 |
| restaurant | 6 | 3 | 6 | 4 | 3 |
| fitness | 6 | 3 | 6 | 4 | 3 |
| saas | 6 | 3 | 6 | 4 | 3 |
| healthcare | 6 | 3 | 6 | 4 | 3 |
| law-firm | 6 | 3 | 6 | 4 | 3 |
| ecommerce | 6 | 3 | 6 | 4 | 3 |
| ecommerce-supplement | 6 | 3 | 6 | 4 | 3 |
| education | 6 | 3 | 6 | 4 | 3 |
| portfolio | 6 | 3 | 6 | 4 | 3 |
| agency | 6 | 3 | 6 | 4 | 3 |
| coffee-shop | 6 | 3 | 6 | 4 | 3 |
| dental | 6 | 3 | 6 | 4 | 3 |
| beauty-salon | 6 | 3 | 6 | 4 | 3 |
| auto-dealership | 6 | 3 | 6 | 4 | 3 |
| pet-services | 6 | 3 | 6 | 4 | 3 |
| luxury | 6 | 3 | 6 | 4 | 3 |
| perfume | 6 | 3 | 6 | 4 | 3 |
| fragrance | 6 | 3 | 6 | 4 | 3 |
| footwear | 6 | 3 | 6 | 4 | 3 |
| ecommerce-footwear | 6 | 3 | 6 | 4 | 3 |

**Total: ~120 products, ~63 testimonials, ~126 features, ~84 services, ~63 team members**

### 3.3 Domain Data Provider (domain-data-provider.ts)

| Structure | Lines | Industries | Purpose |
|-----------|-------|------------|---------|
| INDUSTRY_STATS | 18-55 | 6 | Per-industry seed stats |
| INDUSTRY_TESTIMONIALS | 57-88 | 6 | Per-industry seed testimonials |

### 3.4 BOS Entries (7 files)

| Entry | File | Industries |
|-------|------|------------|
| saas | entries/saas.ts | SaaS |
| ecommerce | entries/ecommerce.ts | Retail/E-Commerce |
| restaurant | entries/restaurant.ts | Hospitality/Restaurant |
| real-estate | entries/real-estate.ts | Real Estate/Agency |
| luxury-retail | entries/luxury-retail.ts | Luxury/Retail |
| healthcare-dental | entries/healthcare-dental.ts | Healthcare/Dental |
| supplement-marketplace | entries/supplement-marketplace.ts | Retail/Supplement |

Each entry contains: vocabulary overrides, workflows, entities, compliance rules, reference URLs.

### 3.5 Agent Provider (agent-provider.ts)

| Structure | Lines | Purpose |
|-----------|-------|---------|
| Hardcoded testimonial names | 209-223 | 5 fixed author names |
| Testimonial quote templates | 216-220 | 3 template patterns |
| Revenue flow CTA actions | 152-186 | CTA per revenue model |
| Mission fallback items | 87-91 | 3 generic mission items |

### 3.6 Content Intelligence Engine (engine.ts)

| Structure | Lines | Industries | Purpose |
|-----------|-------|------------|---------|
| INDUSTRY_CONTENT_PROFILES | 67-84 | 16 | Personality, formality, tone, CTA style per industry |

### 3.7 Content Resolver (content-resolver.ts)

| Structure | Lines | Industries | Purpose |
|-----------|-------|------------|---------|
| Sub-category detection | 61-89 | 6 | Keyword-based sub-category detection |
| generateAboutDescription | 498-550 | ~9 | Industry-specific about text |
| safeHeroSubtitle prompt words | 433-454 | all | Raw prompt detection |

---

## Phase 4: Hardcoded Experience Profiles

### 4.1 Experience Profiles (experience-profiles.ts)

**15 industry profiles with full experience configs:**

| Industry | Fields |
|----------|--------|
| ecommerce, saas, fintech, healthcare, education, restaurant, fitness, real-estate, media, portfolio, marketplace, nonprofit, luxury, perfume/fragrance, beauty | defaultStyle, emotionalQualities[], narrativeStructures[], hoverDefaults[], interactionDensity, motionIntensity, conversionFocus, performanceSensitivity, sceneTemplate[], scrollPacing |

### 4.2 Experience Engine (experience-engine.ts)

| Structure | Lines | Purpose |
|-----------|-------|---------|
| Personality → ExperienceStyle | 67-110 | 22 personalities → 9 styles |
| Sensory scroll-accumulation | 558-573 | if perfume/fragrance/spa/wellness |

### 4.3 Motion Language (motion-language.ts)

| Structure | Lines | Purpose |
|-----------|-------|---------|
| ExperienceStyle → timing | 36-69 | 9 styles → duration/easing |
| ExperienceStyle → stagger | 94-132 | 9 styles → stagger delays |
| ExperienceStyle → reveal | 265-285 | 9 styles → reveal strategy |

### 4.4 Hover Intelligence (hover-intelligence.ts)

| Structure | Lines | Purpose |
|-----------|-------|---------|
| 13 canonical strategies | 26-159 | Strategy definitions |
| Component → strategy | 169-185 | 15 component types → strategies |
| ExperienceStyle → default | 198-209 | 9 styles → default strategy |

### 4.5 Scroll Narrative (scroll-narrative.ts)

| Structure | Lines | Purpose |
|-----------|-------|---------|
| 8 narrative templates | 29-152 | Narrative structures |
| Style/pageType → narrative | 156-184 | Selection logic |

### 4.6 Scene Planner (scene-planner.ts)

| Structure | Lines | Purpose |
|-----------|-------|---------|
| Style → entry motion | 120-143 | 9 styles → motion types |
| Style → camera effect | 178-204 | 9 styles → camera configs |
| Section → choreography | 208-239 | 11 sections → reveal/rhythm |
| Role → timing | 243-288 | 18 roles → duration |

---

## Phase 5: Hardcoded Templates (Renderers)

### 5.1 Industry Template Files

| File | Lines | Industry | Components |
|------|-------|----------|------------|
| templates/ecommerce.ts | 493 | ecommerce | ProductCard, CartDrawer, CheckoutModal, ProductFilter, ProductDetailModal, CartStore |
| templates/restaurant.ts | 212 | restaurant | MenuItem, TableReservation, MenuCategory, OrderStatus |
| templates/healthcare.ts | 481 | healthcare | PatientIntakeForm, DoctorCard, AppointmentScheduler, ServiceCard |
| templates/legal.ts | 459 | legal | CaseManagement, AttorneyCard, ConsultationForm |
| templates/realestate.ts | 415 | realestate | PropertyGrid, PropertySearchFilters, AgentCard |
| templates/fitness.ts | 505 | fitness | ClassBooking, TrainerCard, MembershipPlans, WorkoutTracker |
| templates/saas.ts | 189 | saas | PricingCard, FeatureGrid, DashboardLayout, StatsCard |
| templates/content.ts | 278 | content | Hero, BlogCard, Testimonial, CTASection, FAQ, Newsletter |

### 5.2 Template Selection (react-renderer.ts:395-432)

```typescript
if (industry === 'healthcare' || subIndustry.includes('health')) → HEALTHCARE_TEMPLATES
if (industry === 'legal' || subIndustry.includes('legal')) → LEGAL_TEMPLATES
if (industry === 'realestate' || subIndustry.includes('real')) → REALESTATE_TEMPLATES
if (industry === 'fitness' || subIndustry.includes('fitness')) → FITNESS_TEMPLATES
if (industry === 'restaurant' || subIndustry.includes('restaurant')) → RESTAURANT_TEMPLATES
switch (projectCategory) → ECOMMERCE_TEMPLATES | SAAS_TEMPLATES | CONTENT_TEMPLATES
```

---

## Phase 6: Hardcoded Switch/If-Else Chains

### 6.1 Agent Generators (agent-generators.ts)

| Function | Lines | Pattern | Industries |
|----------|-------|---------|------------|
| generateFromPrompt | 647-665 | switch | real-estate, fitness, default(saas) |
| generateDatabaseSchema | 752-866 | switch | real-estate, fitness, default(saas) |
| generateApiDesign | 868-912 | switch | real-estate, fitness, default(saas) |
| generateDesignTokens | 914-1027 | switch | real-estate, fitness, perfume/fragrance/luxury/beauty, footwear/shoes/sneakers, default |

### 6.2 Orchestrator (orchestrator.ts)

| Function | Lines | Pattern | Industries |
|----------|-------|---------|------------|
| getPages | 1295-1346 | switch | restaurant, ecommerce, fitness, healthcare, realestate, education, travel, event, luxury, wholesale |
| getFeatures | 1321-1346 | switch | same 10 industries |

### 6.3 Domain Synthesizer (domain-synthesizer.ts)

| Function | Lines | Pattern |
|----------|-------|---------|
| inferMoodFromPattern | 11-31 | if/else on pattern name keywords |
| inferColorHintFromPattern | (same) | if/else on pattern name keywords |
| SaaS dashboard mockup | 131-136 | `domain.industry === 'saas'` |

### 6.4 Application Family Classifier (application-family-classifier.ts)

| Structure | Lines | Industries |
|-----------|-------|------------|
| INDUSTRY_OVERRIDE_PATTERNS | 100-108 | 12 regex patterns |
| INDUSTRY_CONTEXT_SIGNALS | 110-114 | 16 known industry strings |

### 6.5 Business Intelligence

| File | Structure | Industries |
|------|-----------|------------|
| archetypes.ts | SHAPES | 13 archetypes |
| archetypes.ts | BASE_BY_PRODUCT_NATURE | 7 product natures |
| archetypes.ts | industryFromSignals | 5 signal → industry |
| dimensions.ts | LEXICONS | ~200 surface words across 8 dimensions |
| dimensions.ts | extractDomainNouns | ~25 hardcoded nouns |

---

## Phase 7: Renderer Independence Audit

### Files with ZERO industry checks (safe):
- assembly-gate.ts
- pass3-code-generator.ts (dead `industry` parameter in generateColumnValue)
- build-pipeline.ts (only `?? 'general'` fallbacks)

### Files with industry checks that SHOULD be data-driven:
- react-renderer.ts: template selection (if/switch on industry)
- agent-generators.ts: 4 switch blocks (legacy standalone generator)
- orchestrator.ts: 2 switch blocks (pages, features)
- domain-synthesizer.ts: mood/color inference + SaaS check
- content-scraper.ts: 1 ternary (restaurant → 'Chef')
- design-dna.ts: 8+ industry-keyed registries
- skill-integrator.ts: 7+ industry-keyed registries

### Files where industry checks are LEGITIMATE (design style, not industry):
- architect.ts: color override from prompt keywords (green/organic/emerald)
- architect.ts: industry word exclusion set
- image-resolver.ts: keyword-to-photo-pool mapping

---

## Migration Strategy

### Tier 1: Critical (blocks new industries)
1. **intake-parser.ts** INDUSTRY_MAPPINGS → Knowledge Pack loader
2. **industry-copy-schema.ts** INDUSTRY_COPY → Knowledge Pack copy
3. **domain-data.ts** DOMAIN_DATA → Knowledge Pack domain data
4. **content-resolver.ts** detectSubCategory → Knowledge Pack sub-category

### Tier 2: High (affects quality for new industries)
5. **design-dna.ts** all industry registries → Knowledge Pack design profile
6. **design-intelligence engines** (5 files) → Knowledge Pack design presets
7. **experience-profiles.ts** → Knowledge Pack experience profile
8. **skill-integrator.ts** INDUSTRY_LAYOUT_MAP → Knowledge Pack layout

### Tier 3: Medium (affects rendering for new industries)
9. **react-renderer.ts** template selection → Template registry
10. **agent-generators.ts** switch blocks → Knowledge Pack generators
11. **orchestrator.ts** switch blocks → Knowledge Pack pages/features
12. **templates/** (8 files) → Knowledge Pack component templates

### Tier 4: Low (quality of life, minor improvements)
13. **domain-detector.ts** INDUSTRY_DOMAIN_MAP → Knowledge Pack domain context
14. **content-intelligence/engine.ts** INDUSTRY_CONTENT_PROFILES → Knowledge Pack
15. **self-evaluator.ts** CTA maps → Knowledge Pack evaluation rules
16. **BOS entries** (7 files) → Knowledge Pack BOS data
17. **archetypes.ts** SHAPES → Knowledge Pack archetypes

### Backward Compatibility
- Keep existing `INDUSTRY_MAPPINGS` as a "legacy-bridge" knowledge pack
- New industries ONLY need a knowledge pack (no code changes)
- Existing industries continue working via their knowledge packs
- `getIndustryCopy()` fuzzy match bug must be fixed (separate issue)
