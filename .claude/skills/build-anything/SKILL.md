---
name: build-anything
description: Build.Anything v2 - Universal software generation orchestrator. Analyze, plan, design, generate, validate and deliver complete software systems through the Build.Anything orchestration platform.
---

# Build.Anything

## Purpose

Build.Anything should think like an experienced product architect before it thinks like a software engineer. Every request should first understand the business problem, users, workflows, constraints, and success criteria. Only then should it design and generate software.

This skill is the single operational entry point into the Build.Anything platform.

When invoked, this skill **must never** solve the user's request directly using ad-hoc reasoning.

Instead, it coordinates the existing Build.Anything platform and delegates every responsibility to the appropriate orchestration layer.

This skill contains **no business logic**.

All implementation lives inside the Build.Anything codebase.

The responsibility of this skill is to ensure the existing platform executes correctly.

---

# Supported Requests

Examples include but are not limited to:

- Landing Pages
- Websites
- SaaS Applications
- Dashboards
- CRM
- ERP
- POS
- Marketplace
- Ecommerce
- Hospital Systems
- Restaurant Systems
- Fitness Platforms
- Education Platforms
- Mobile Apps
- Desktop Apps
- Internal Business Tools
- Admin Panels
- AI Applications
- Existing Website Recreation
- Existing Product Modernization

---

# Operating Principles

Always follow these principles.

## 1.

Build.Anything is the source of truth.

Never replace the platform with your own reasoning.

---

## 2.

Never skip orchestration.

Every request follows the orchestration pipeline.

---

## 3.

Never generate architecture directly.

Architecture is produced by the existing Architecture Stage.

---

## 4.

Never invent database schemas.

Database Design owns schema generation.

---

## 5.

Never invent frontend layouts.

Frontend Design and Design DNA own UI generation.

---

## 6.

Never bypass BOS.

Business knowledge always comes from BOS packs and Knowledge Graph.

---

## 7.

Never bypass Validation.

Every artifact must pass validation before completion.

---

## 8.

Never duplicate logic already implemented inside Build.Anything.

The TypeScript implementation remains the single source of truth.

---

# Execution Overview

Every execution follows the Build.Anything platform.

```
User Request
        │
        ▼
Intent Discovery
        │
        ▼
Application Classification
        │
        ▼
Workflow Discovery
        │
        ▼
Entity Discovery
        │
        ▼
Business Model Detection
        │
        ▼
Industry Detection
        │
        ▼
Pattern Selection
        │
        ▼
Project Intake
        │
        ▼
Decision Engine
        │
        ▼
Planner
        │
        ▼
Research
        │
        ▼
Business Analysis
        │
        ▼
Architecture
        │
        ▼
Database Design
        │
        ▼
API Design
        │
        ▼
Design DNA
        │
        ▼
Design Intelligence
        │
        ▼
Frontend Design
        │
        ▼
Validation Pipeline
        │
        ▼
Review Board
        │
        ▼
Self Healing
        │
        ▼
Runtime
        │
        ▼
Execution Report
```

Every stage delegates to the existing implementation.

No orchestration logic belongs inside this skill.

---

# Stage Responsibilities

## Intent Discovery

Determine what the user is actually requesting.

Examples:

- Landing Page
- CRM
- ERP
- Marketplace
- Dashboard
- SaaS
- Mobile App
- Existing Website Clone
- Existing Codebase Upgrade

Intent Discovery determines the software category before any technical planning.

---

## Application Classification

Determine the application family.

Examples:

- Productivity
- Ecommerce
- CRM
- ERP
- Healthcare
- Education
- Finance
- Marketplace
- Portfolio
- Restaurant
- Hospitality
- Social
- CMS
- Knowledge Base
- Analytics
- Booking
- Inventory
- Logistics
- Manufacturing

Application Family is the primary reasoning signal.

Industry is a secondary refinement.

---

## Workflow Discovery

Determine the primary business workflows.

Examples:

Customer Journey

Administrator Journey

Staff Journey

Approval Workflow

Booking Workflow

Purchase Workflow

Inventory Workflow

Checkout Workflow

Support Workflow

Learning Workflow

Healthcare Workflow

---

## Entity Discovery

Determine the core business entities.

Examples:

Customer

Order

Appointment

Invoice

Task

Project

Patient

Doctor

Property

Booking

Course

Lesson

Member

Trainer

Vendor

Product

The generated database, API and UI must all be derived from these entities.

---

## Business Model Detection

Determine how the software operates.

Examples:

Subscription

Marketplace

One Time Purchase

Membership

Advertising

Commission

Enterprise License

Internal Tool

Freemium

Open Source

This influences architecture, permissions and integrations.

---

## Industry Detection

Refine the solution using industry knowledge.

Industry never overrides Application Classification.

Industry enriches the solution with:

- terminology
- workflows
- compliance
- integrations
- KPIs
- reporting
- best practices

---

## Pattern Selection

Select the best implementation strategy.

Pattern selection should use:

Application Family

↓

Business Model

↓

Industry

↓

Workflow

↓

Entities

Never choose a pattern solely because it has the highest score.

If confidence is low:

Generate a hybrid blueprint.

If confidence is extremely low:

Generate a minimal blueprint rather than forcing an unrelated enterprise template.

---

# Build.Anything Services

The following platform services are available.

- Intent Router
- Decision Engine
- Planner
- BOS Loader
- Knowledge Graph
- Experience Engine
- Execution Intelligence
- Event Bus
- Design DNA
- Design Intelligence
- Runtime
- Validation Pipeline
- Review Board
- Self Healing
- Execution Report Generator

These services already exist inside the platform.

This skill coordinates them.

It does not replace them.

---

# Design Principles

Visual quality is never optional.

Every generated interface must use Design DNA.

Design DNA determines:

- Visual Personality
- Color System
- Typography
- Layout
- Component Language
- Motion
- Interaction
- Polish

Generic Tailwind layouts are unacceptable.

Generated interfaces should feel intentionally designed.

---

# Runtime Behaviour

Immediately after execution begins display:

```
══════════════════════════════════════

Build.Anything v2

Execution ID: <generated>

Status: Starting

══════════════════════════════════════
```

Then display stage progress throughout execution.

The Runtime is responsible for:

- project generation
- build
- validation
- execution
- screenshots
- runtime verification

This skill reports progress but does not implement runtime behaviour.

---

# Progress Reporting

During execution, report progress in a consistent, human-readable format.

Example:

```
[01/18] Intent Discovery          ✓
[02/18] Application Classification ✓
[03/18] Workflow Discovery         ✓
[04/18] Entity Discovery           ✓
[05/18] Business Model             ✓
[06/18] Industry Detection         ✓
[07/18] Pattern Selection          ✓
[08/18] Project Intake             ✓
...
```

Progress reporting should reflect the actual orchestration state whenever available.

Never fabricate stage completion.

---

# Artifact Requirements

Every generated artifact must remain traceable.

Artifacts should contain Build.Anything metadata whenever possible.

Required metadata:

- Generator
- Version
- Execution ID
- Stage
- Timestamp

Artifacts may include:

- Architecture
- Database Schema
- API Specification
- UI Specification
- Design Tokens
- Components
- Generated Code
- Runtime Results
- Validation Reports
- Execution Reports

---

# Validation Philosophy

Validation is mandatory.

Never return software that has not been validated.

Validation includes:

## Structural Validation

Examples:

- Missing entities
- Missing relationships
- Invalid schema
- Missing pages
- Missing routes

---

## Semantic Validation

Examples:

- Wrong workflow

- Wrong terminology

- Incorrect entities

- Wrong permissions

- Incorrect business logic

---

## Cross-Stage Validation

Ensure consistency across:

Architecture

↓

Database

↓

API

↓

Frontend

↓

Runtime

↓

Documentation

Every stage must agree with previous stages.

---

## Quality Validation

Review:

- UX
- Accessibility
- Responsiveness
- Typography
- Spacing
- Color
- Motion
- Design consistency

The generated experience should feel intentional rather than assembled.

---

# Review Board

Before considering the project complete, review:

- Architecture
- Database
- APIs
- Frontend
- Runtime
- Validation
- Design Quality

Identify:

- inconsistencies

- missing functionality

- duplicated functionality

- poor UX

- incorrect workflows

Review findings should be incorporated whenever possible before final delivery.

---

# Self-Healing

If validation identifies recoverable issues:

Attempt recovery.

Examples:

- Missing page

- Missing entity

- Broken relationship

- Missing API

- Invalid route

- Inconsistent terminology

- Invalid workflow

Self-healing should improve the project rather than restart it.

If recovery fails,

record the issue transparently inside the execution report.

---

# Runtime

Runtime is responsible for transforming design artifacts into a runnable application.

Typical responsibilities include:

- project scaffolding

- dependency generation

- source generation

- build

- preview

- runtime verification

- screenshots

- visual validation

This skill coordinates runtime execution.

It does not implement runtime logic.

---

# Claude Desktop Behaviour

Inside Claude Desktop:

Claude itself is the reasoning engine.

Do not simulate additional AI providers.

Do not invent separate assistant personas.

Do not attempt external LLM API calls unless explicitly configured by the Build.Anything platform.

When orchestration requires reasoning,

reason directly using the active Claude model.

---

# Deterministic Generation

Whenever deterministic generators already exist,

prefer them over free-form generation.

Examples include:

- scaffold generation

- configuration generation

- schema generation

- routing

- project structure

- dependency management

Use LLM reasoning only where creativity or semantic understanding is required.

---

# Design DNA

Every generated experience must follow Design DNA.

Design DNA determines:

- visual personality

- design language

- typography

- spacing

- grid

- elevation

- border radius

- color harmony

- interaction

- animation

- polish

Never generate visually generic software.

---

# Business Knowledge

Business understanding must come from:

- BOS

- Knowledge Graph

- Industry Packs

- Application Families

- Workflow Templates

- Entity Definitions

- Compliance Rules

- KPI Definitions

Do not invent business processes when reusable knowledge already exists.

---

# Output Format

Every successful execution should conclude with:

## Executive Summary

Describe:

- what was built

- application family

- business model

- detected industry

- workflow summary

---

## Deliverables

List major outputs.

Examples:

- Architecture

- Database

- API

- Frontend

- Runtime

- Documentation

- Reports

---

## Execution Metrics

Include whenever available:

- Duration

- Files Generated

- Pages

- Components

- Entities

- APIs

- Validation Status

- Runtime Status

- Build Status

---

## Recommendations

Provide next steps.

Examples:

- authentication

- deployment

- branding

- integrations

- testing

- production hardening

---

# Failure Behaviour

Never hide failures.

If execution cannot complete:

Explain:

- where execution stopped

- why

- what succeeded

- what failed

- suggested recovery

Partial success is preferable to misleading success.

---

# Anti-Patterns

Never:

- bypass the orchestrator

- skip mandatory stages

- replace BOS with ad-hoc reasoning

- ignore validation failures

- generate generic templates without classification

- select enterprise patterns solely because they score highest

- duplicate existing platform logic

- hardcode business rules inside this skill

- invent implementation details already handled by the platform

- sacrifice design quality for speed

---

# Future Compatibility

This skill is intentionally orchestration-first.

Future execution environments may include:

- Claude Desktop

- Claude Code

- MCP

- CLI

- Cloud Execution

The orchestration principles remain identical regardless of execution environment.

---

# Completion Criteria

A Build.Anything execution is complete only when:

✓ Intent has been understood

✓ Application has been classified

✓ Workflow has been identified

✓ Entities have been discovered

✓ Business model has been determined

✓ Industry knowledge has been applied

✓ Pattern selection has completed

✓ Architecture is complete

✓ Database is complete

✓ APIs are complete

✓ Design DNA has been applied

✓ Frontend is complete

✓ Validation has passed

✓ Review has completed

✓ Self-healing has finished

✓ Runtime has completed

✓ Execution report has been generated

---

# Final Principle

Build.Anything is an orchestration platform, not a prompt.

This skill exists only to ensure that every software generation request consistently executes the Build.Anything platform rather than relying on ad-hoc reasoning.

The Build.Anything codebase remains the single source of truth.

This skill coordinates the platform.

It never replaces it.
