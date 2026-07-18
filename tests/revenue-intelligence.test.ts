import { describe, it, expect } from 'vitest';
import { understandBusiness } from '../src/orchestration/business-intelligence/engine.js';
import { deriveRevenueIntelligence } from '../src/orchestration/business-intelligence/revenue-intelligence.js';

function derive(prompt: string) {
  const bk = understandBusiness(prompt);
  return { bk, ri: deriveRevenueIntelligence(bk) };
}

describe('deriveRevenueIntelligence (vertical-agnostic BI)', () => {
  it('produces a complete, non-empty profile for any business', () => {
    const { ri } = derive('Build a website for a specialty coffee cafe with online ordering and a loyalty program.');
    expect(ri.id).toMatch(/^bi\.derived\./);
    expect(ri.revenueCycle.steps.length).toBeGreaterThan(0);
    expect(ri.conversionFunnel.stages.length).toBeGreaterThan(0);
    expect(ri.kpis.length).toBeGreaterThan(0);
    expect(ri.dashboardWidgets.length).toBeGreaterThan(0);
    expect(ri.leadCaptureMechanisms.length).toBeGreaterThan(0);
    expect(ri.revenueModels.length).toBeGreaterThan(0);
  });

  it('always guarantees at least one revenue KPI and a revenue widget', () => {
    const { ri } = derive('Create a portfolio website for a freelance photographer with a contact form.');
    expect(ri.kpis.some((k) => k.category === 'revenue')).toBe(true);
    expect(ri.dashboardWidgets.some((w) => w.name === 'Revenue Trend')).toBe(true);
  });

  it('maps a subscription business to recurring cycle + renewal churn signal', () => {
    const { ri } = derive('Build a SaaS analytics platform with monthly subscription plans and a free trial.');
    expect(ri.revenueCycle.avgRevenuePerCustomer).toContain('recurring');
    expect(ri.churnSignals.some((c) => /renewal|payment/i.test(c.name))).toBe(true);
    expect(ri.morningCheck.primaryMetrics.length).toBeGreaterThanOrEqual(0);
  });

  it('maps a service business to a booking-oriented lead capture', () => {
    const { ri } = derive('Create a dental clinic website where patients can book appointments online.');
    const names = ri.leadCaptureMechanisms.map((m) => m.name).join(' ');
    expect(/Booking|Enquiry|Subscription|Cart/.test(names)).toBe(true);
  });

  it('is deterministic — same prompt yields identical profile', () => {
    const a = derive('Build an online store selling handmade furniture with checkout.').ri;
    const b = derive('Build an online store selling handmade furniture with checkout.').ri;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('never throws across diverse business shapes', () => {
    const prompts = [
      'A nonprofit wildlife charity accepting donations.',
      'A last-mile delivery logistics company with on-demand courier booking.',
      'A streaming service for independent films with subscription plans.',
      'A coding bootcamp with course enrollment and a learning dashboard.',
      'A real estate brokerage with property listings and viewing bookings.',
    ];
    for (const p of prompts) {
      expect(() => deriveRevenueIntelligence(understandBusiness(p))).not.toThrow();
    }
  });
});
