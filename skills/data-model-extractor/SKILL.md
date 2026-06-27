---
name: data-model-extractor
description: Extracts typed data models from scraped content — one LLM call per data type
bucket: B
reason: Requires LLM to infer schema from unstructured content; isolated per data type
---

# Data Model Extractor

## Role
Take raw scraped content from the clone pipeline and produce typed, validated JSON files in `content/`. Each data type (products, categories, testimonials, pricing, etc.) gets its own extraction call and output file.

## Process
1. Read the scraped content from `scraped/`.
2. For each data type present in the content, make **one** LLM call to extract structured data.
3. Validate the output against the data type schema.
4. Write to `content/{datatype}.json`.

## Data Types and Schemas

### Products
```json
{
  "products": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "price": "number",
      "currency": "string",
      "images": ["string"],
      "category": "string",
      "tags": ["string"],
      "inStock": "boolean"
    }
  ]
}
```

### Categories
```json
{
  "categories": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "parentId": "string|null",
      "productCount": "number"
    }
  ]
}
```

### Testimonials
```json
{
  "testimonials": [
    {
      "id": "string",
      "author": "string",
      "role": "string",
      "company": "string",
      "content": "string",
      "rating": "number",
      "avatar": "string"
    }
  ]
}
```

### Pricing
```json
{
  "plans": [
    {
      "id": "string",
      "name": "string",
      "price": "number",
      "currency": "string",
      "interval": "string",
      "features": ["string"],
      "highlighted": "boolean"
    }
  ]
}
```

### Navigation
```json
{
  "navItems": [
    {
      "label": "string",
      "href": "string",
      "children": ["self"]
    }
  ]
}
```

## Input
- `scraped/` — raw HTML/text content from the clone source.
- `visual-dna.json` — for register context (optional).

## Output
- `content/products.json` (if products found)
- `content/categories.json` (if categories found)
- `content/testimonials.json` (if testimonials found)
- `content/pricing.json` (if pricing found)
- `content/navigation.json` (always)
- `content/hero.json` (always — hero section copy)
- `content/pages.json` (page-level metadata)

## Rules
1. One LLM call per data type. Never combine extractions.
2. Never invent data. If the source has no products, do not create `products.json`.
3. All strings must be UTF-8 normalized. Strip tracking params from URLs.
4. Prices must be numbers, not strings. Currency is a separate field.
5. Every record must have an `id` field (slugified from name).
6. If extraction fails schema validation, retry once. If it fails again, skip that data type and log a warning.
