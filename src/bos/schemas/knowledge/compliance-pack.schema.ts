import { z } from 'zod';
import { VersionedObject, EvidenceRef } from '../common.js';

export const ComplianceRuleSchema = z.object({
  rule: z.string(),
  description: z.string().optional(),
  severity: z.enum(['must', 'should', 'may']).default('must'),
  implementation: z.string().optional(),
});
export type ComplianceRule = z.infer<typeof ComplianceRuleSchema>;

export const CompliancePackSchema = VersionedObject.extend({
  kind: z.literal('CompliancePack'),
  name: z.string().min(1),
  description: z.string().optional(),
  jurisdiction: z.string(),
  category: z.enum(['privacy', 'security', 'accessibility', 'financial', 'healthcare', 'industry', 'regional']),
  rules: z.array(ComplianceRuleSchema).default([]),
  applicableIndustries: z.array(z.string()).default([]),
  applicableBusinessModels: z.array(z.string()).default([]),
});
export type CompliancePack = z.infer<typeof CompliancePackSchema>;
