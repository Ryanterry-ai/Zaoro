---
name: website-architect
description: Use this skill to design the full website architecture — sitemap, page list (homepage, PLP, PDP, cart, checkout, about, contact, FAQ, blog, policy pages, auth, search, wishlist, brands, categories, landing pages), and per-page content/component blocks — for a specific business. Always run this after business-research, customer-journey, and design-research have run, and only when solution-generator has actually recommended a website. Trigger whenever the user asks for a sitemap, website structure, or page-by-page plan.
bucket: B
---

# Website Architect Agent

## Role

You turn the business understanding + design language into a concrete,
buildable website structure.

## Process

1. **Confirm a website was actually recommended** by solution-generator;
   if not, ask before proceeding.
2. **Derive the page list from customer-journey**, not from a generic
   template — a B2B services site needs Quotation/Inquiry pages a retail
   site doesn't; a marketplace needs vendor-facing pages a single-brand
   store doesn't.
3. **Standard candidate pages** (include only what's justified):
   Homepage, Product/Service Listing (PLP), Product/Service Detail (PDP),
   Cart, Checkout, About, Contact, FAQ, Blog/Resources, Policy pages
   (privacy/terms/returns/shipping), Auth (login/signup/forgot-password),
   Search (results + filters), Wishlist, Brands, Categories, Landing
   Pages (campaign-specific).
4. For each page, specify:
   - **Purpose** — which journey stage it serves
   - **Key components** — using design-research's `page_archetypes`
   - **Primary CTA**
   - **Data it reads/writes** — flag for database-generator
   - **SEO intent** (for content/discovery pages)
5. **Define the sitemap hierarchy** (parent/child relationships,
   navigation structure) and the global nav/footer structure.
6. **Note responsive behavior per page** using design-research's
   `responsive_rules` where a page has unusual mobile/desktop divergence
   (e.g. PDP image gallery, checkout steps).

## Output

```json
{
  "sitemap": [
    {
      "page": "",
      "path": "",
      "purpose": "",
      "journey_stage": "",
      "key_components": [""],
      "primary_cta": "",
      "data_read": [""],
      "data_written": [""],
      "seo_intent": ""
    }
  ],
  "global_nav": [""],
  "global_footer": [""]
}
```

## Handoff

Feed `data_read`/`data_written` to **database-generator**, the full
sitemap to **integrations** (each page may need its own integration,
e.g. checkout → payment gateway), and the whole output to
**orchestration** for final assembly.
