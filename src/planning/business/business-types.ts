/**
 * =============================================================================
 * Build.same V3
 * Business Planning Layer - Canonical Types
 * =============================================================================
 * Immutable business contracts shared by the planning subsystem.
 * NodeNext ESM compatible, strict TypeScript, exactOptionalPropertyTypes.
 * Zero UI concerns, zero generation concerns.
 */

/* -------------------------------------------------------------------------- */
/*                               BRAND UTILITIES                              */
/* -------------------------------------------------------------------------- */

declare const __brand: unique symbol;

export type Brand<T, Name extends string> = T & {
  readonly [__brand]: Name;
};

/* -------------------------------------------------------------------------- */
/*                               IDENTIFIERS                                  */
/* -------------------------------------------------------------------------- */

export type BusinessTeamId = Brand<string, "BusinessTeamId">;
export type BusinessGoalId = Brand<string, "BusinessGoalId">;
export type BusinessRiskId = Brand<string, "BusinessRiskId">;
export type BusinessDomainId = Brand<string, "BusinessDomainId">;
export type BusinessGlossaryId = Brand<string, "BusinessGlossaryId">;
export type BusinessEventId = Brand<string, "BusinessEventId">;
export type BusinessWorkflowStepId = Brand<string, "BusinessWorkflowStepId">;
export type BusinessDecisionId = Brand<string, "BusinessDecisionId">;
export type BusinessAssumptionId = Brand<string, "BusinessAssumptionId">;
export type BusinessGovernanceId = Brand<string, "BusinessGovernanceId">;
export type BusinessServiceLevelAgreementId = Brand<string, "BusinessServiceLevelAgreementId">;
export type BusinessAggregateId = Brand<string, "BusinessAggregateId">;
export type BusinessValueObjectId = Brand<string, "BusinessValueObjectId">;
export type BusinessFieldId = Brand<string, "BusinessFieldId">;
export type BusinessBlueprintId = Brand<string, "BusinessBlueprintId">;
export type BusinessActorId = Brand<string, "BusinessActorId">;
export type BusinessRoleId = Brand<string, "BusinessRoleId">;
export type BusinessCapabilityId = Brand<string, "BusinessCapabilityId">;
export type BusinessEntityId = Brand<string, "BusinessEntityId">;
export type BusinessRelationshipId = Brand<string, "BusinessRelationshipId">;
export type BusinessWorkflowId = Brand<string, "BusinessWorkflowId">;
export type BusinessProcessId = Brand<string, "BusinessProcessId">;
export type BusinessRuleId = Brand<string, "BusinessRuleId">;
export type BusinessPolicyId = Brand<string, "BusinessPolicyId">;
export type BusinessIntegrationId = Brand<string, "BusinessIntegrationId">;
export type BusinessComplianceId = Brand<string, "BusinessComplianceId">;
export type BusinessKpiId = Brand<string, "BusinessKpiId">;
export type BusinessRequirementId = Brand<string, "BusinessRequirementId">;
export type BusinessConstraintId = Brand<string, "BusinessConstraintId">;
export type BusinessTaxonomyId = Brand<string, "BusinessTaxonomyId">;
export type IndustryId = Brand<string, "IndustryId">;
export type EvidenceId = Brand<string, "EvidenceId">;
export type BusinessStakeholderId = Brand<string, "BusinessStakeholderId">;
export type BusinessBoundedContextId = Brand<string, "BusinessBoundedContextId">;
export type BusinessDecisionPointId = Brand<string, "BusinessDecisionPointId">;
export type BusinessVocabularyTermId = Brand<string, "BusinessVocabularyTermId">;

/* -------------------------------------------------------------------------- */
/*                              COMMON ALIASES                                */
/* -------------------------------------------------------------------------- */

export type ISODateString = Brand<string, "ISODateString">;
export type SemVer = Brand<string, "SemVer">;
export type LocaleCode = Brand<string, "LocaleCode">;
export type CurrencyCode = Brand<string, "CurrencyCode">;
export type CountryCode = Brand<string, "CountryCode">;
export type RegionCode = Brand<string, "RegionCode">;
export type TimeZone = Brand<string, "TimeZone">;
export type UrlString = Brand<string, "UrlString">;
export type EmailAddress = Brand<string, "EmailAddress">;

/* -------------------------------------------------------------------------- */
/*                                   ENUMS                                    */
/* -------------------------------------------------------------------------- */

export enum BusinessActorType {
  Human = "human",
  Organization = "organization",
  ExternalSystem = "external-system",
  InternalSystem = "internal-system",
  AutomatedProcess = "automated-process",
}

export enum BusinessRuleSeverity {
  Required = "required",
  Recommended = "recommended",
  Optional = "optional",
}

export enum BusinessRuleCategory {
  Compliance = "compliance",
  Financial = "financial",
  Operational = "operational",
  Legal = "legal",
  Security = "security",
  Privacy = "privacy",
  Domain = "domain",
}

export enum BusinessConstraintType {
  Functional = "functional",
  Operational = "operational",
  Regulatory = "regulatory",
  Financial = "financial",
  Technical = "technical",
}

export enum BusinessImportance {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low",
}

export enum BusinessLifecycleStatus {
  Draft = "draft",
  Active = "active",
  Deprecated = "deprecated",
  Archived = "archived",
}

export enum BusinessEvidenceType {
  Documentation = "documentation",
  Research = "research",
  Regulation = "regulation",
  Interview = "interview",
  Observation = "observation",
}

export enum BusinessRelationshipType {
  OneToOne = "one-to-one",
  OneToMany = "one-to-many",
  ManyToOne = "many-to-one",
  ManyToMany = "many-to-many",
}

export enum BusinessRoleType {
  Executive = "executive",
  Management = "management",
  Operations = "operations",
  Finance = "finance",
  Sales = "sales",
  Marketing = "marketing",
  CustomerSupport = "customer-support",
  Inventory = "inventory",
  Logistics = "logistics",
  Compliance = "compliance",
  HumanResources = "human-resources",
  InformationTechnology = "information-technology",
  ExternalPartner = "external-partner",
  Customer = "customer",
  Supplier = "supplier",
  Vendor = "vendor",
  Regulator = "regulator",
  Auditor = "auditor",
  Automated = "automated",
}

export enum BusinessPermissionEffect {
  Allow = "allow",
  Deny = "deny",
}

export enum BusinessOrganizationType {
  Enterprise = "enterprise",
  BusinessUnit = "business-unit",
  Department = "department",
  Division = "division",
  Branch = "branch",
  Team = "team",
  ExternalOrganization = "external-organization",
}

export enum BusinessActorStatus {
  Active = "active",
  Inactive = "inactive",
  Suspended = "suspended",
  Archived = "archived",
}

export enum BusinessEntityType {
  Aggregate = "aggregate",
  Entity = "entity",
  ValueObject = "value-object",
  Reference = "reference",
  Lookup = "lookup",
  Event = "event",
}

export enum BusinessFieldType {
  String = "string",
  Text = "text",
  Integer = "integer",
  Decimal = "decimal",
  Boolean = "boolean",
  Date = "date",
  DateTime = "datetime",
  Time = "time",
  Currency = "currency",
  Percentage = "percentage",
  Email = "email",
  Phone = "phone",
  Url = "url",
  Identifier = "identifier",
  Enumeration = "enumeration",
  Reference = "reference",
  Collection = "collection",
  Object = "object",
}

export enum BusinessRelationshipCardinality {
  OneToOne = "1:1",
  OneToMany = "1:N",
  ManyToOne = "N:1",
  ManyToMany = "N:N",
}

export enum BusinessRelationshipOwnership {
  SourceOwnsTarget = "source-owns-target",
  TargetOwnsSource = "target-owns-source",
  Shared = "shared",
  Independent = "independent",
}

export enum BusinessCapabilityCategory {
  Core = "core",
  Supporting = "supporting",
  Management = "management",
  Compliance = "compliance",
  Analytics = "analytics",
  Integration = "integration",
}

export enum BusinessProcessType {
  Operational = "operational",
  Customer = "customer",
  Financial = "financial",
  Compliance = "compliance",
  Administrative = "administrative",
  System = "system",
}

export enum BusinessWorkflowTriggerType {
  Manual = "manual",
  Scheduled = "scheduled",
  Event = "event",
  External = "external",
  Conditional = "conditional",
}

export enum BusinessWorkflowStepType {
  Start = "start",
  Activity = "activity",
  Decision = "decision",
  Approval = "approval",
  Validation = "validation",
  Notification = "notification",
  Integration = "integration",
  End = "end",
}

export enum BusinessDecisionType {
  Automatic = "automatic",
  HumanApproval = "human-approval",
  Escalation = "escalation",
  ExternalResponse = "external-response",
}

export enum BusinessEventType {
  Domain = "domain",
  Lifecycle = "lifecycle",
  Integration = "integration",
  Compliance = "compliance",
}

export enum BusinessGoalCategory {
  Strategic = "strategic",
  Financial = "financial",
  Operational = "operational",
  Customer = "customer",
  Growth = "growth",
  Compliance = "compliance",
}

export enum BusinessKpiAggregation {
  Sum = "sum",
  Average = "average",
  Count = "count",
  Ratio = "ratio",
  Percentage = "percentage",
  Maximum = "maximum",
  Minimum = "minimum",
}

export enum BusinessTrendDirection {
  Increase = "increase",
  Decrease = "decrease",
  Maintain = "maintain",
}

export enum BusinessPolicyCategory {
  Security = "security",
  Privacy = "privacy",
  Finance = "finance",
  Operations = "operations",
  HumanResources = "human-resources",
  Compliance = "compliance",
  Data = "data",
}

export enum BusinessComplianceCategory {
  Regulatory = "regulatory",
  Financial = "financial",
  Privacy = "privacy",
  Security = "security",
  Industry = "industry",
  Internal = "internal",
}

export enum BusinessRiskSeverity {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low",
}

export enum BusinessRiskLikelihood {
  VeryHigh = "very-high",
  High = "high",
  Medium = "medium",
  Low = "low",
  VeryLow = "very-low",
}

export enum BusinessIntegrationType {
  Internal = "internal",
  External = "external",
  Government = "government",
  Partner = "partner",
  Vendor = "vendor",
}

export enum BusinessReasoningConfidence {
  Low = "low",
  Medium = "medium",
  High = "high",
  Certain = "certain",
}

export enum BusinessPlanningStatus {
  Draft = "draft",
  Validated = "validated",
  Approved = "approved",
  Archived = "archived",
}

export enum BusinessCommunicationChannel {
  Email = "email",
  Phone = "phone",
  SMS = "sms",
  Chat = "chat",
  Meeting = "meeting",
  API = "api",
  Webhook = "webhook",
  Event = "event",
  Queue = "queue",
  Document = "document",
}

/* -------------------------------------------------------------------------- */
/*                               CORE METADATA                                */
/* -------------------------------------------------------------------------- */

export interface VersionInfo {
  readonly version: SemVer;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface AuditMetadata {
  readonly createdBy: string;
  readonly updatedBy: string;
}

export interface SourceMetadata {
  readonly source: string;
  readonly confidence: number;
  readonly evidence: ReadonlyArray<EvidenceId>;
}

export interface DisplayMetadata {
  readonly name: string;
  readonly description: string;
  readonly tags: ReadonlyArray<string>;
}

export interface LocalizedText {
  readonly locale: LocaleCode;
  readonly value: string;
}

export interface LocalizedContent {
  readonly defaultValue: string;
  readonly translations: ReadonlyArray<LocalizedText>;
}

export interface BusinessReference {
  readonly id: BusinessGoalId;
  readonly label: string;
}

export interface BusinessClassification {
  readonly industry: IndustryId;
  readonly domains: ReadonlyArray<string>;
  readonly verticals: ReadonlyArray<string>;
  readonly keywords: ReadonlyArray<string>;
}

export interface BusinessOwnership {
  readonly owner: string;
  readonly stakeholders: ReadonlyArray<string>;
}

export interface BusinessAddress {
  readonly country: CountryCode;
  readonly region?: RegionCode;
  readonly city?: string;
}

export interface BusinessContext {
  readonly locale: LocaleCode;
  readonly currency: CurrencyCode;
  readonly timezone: TimeZone;
}

/* -------------------------------------------------------------------------- */
/*                          FOUNDATION BASE CONTRACTS                         */
/* -------------------------------------------------------------------------- */

export interface BusinessNode<TId = string> {
  readonly id: TId;
  readonly metadata: DisplayMetadata;
  readonly version: VersionInfo;
  readonly audit: AuditMetadata;
  readonly source: SourceMetadata;
  readonly lifecycle: BusinessLifecycleStatus;
}

export interface PrioritizedBusinessNode<TId = string> extends BusinessNode<TId> {
  readonly importance: BusinessImportance;
}

export interface TaxonomyNode {
  readonly id: BusinessTaxonomyId;
  readonly name: string;
  readonly children: ReadonlyArray<BusinessTaxonomyId>;
}

export interface BusinessEvidence {
  readonly id: EvidenceId;
  readonly type: BusinessEvidenceType;
  readonly title: string;
  readonly reference: UrlString | string;
  readonly confidence: number;
}

export interface BusinessConstraint {
  readonly id: BusinessConstraintId;
  readonly type: BusinessConstraintType;
  readonly title: string;
  readonly description: string;
  readonly severity: BusinessRuleSeverity;
}

export interface BusinessRequirement {
  readonly id: BusinessRequirementId;
  readonly title: string;
  readonly description: string;
  readonly mandatory: boolean;
}

/* -------------------------------------------------------------------------- */
/*                    BUSINESS ACTORS / ORGANIZATIONS / ROLES                 */
/* -------------------------------------------------------------------------- */

export interface BusinessPermission {
  readonly id: BusinessGoalId;
  readonly name: string;
  readonly description: string;
  readonly effect: BusinessPermissionEffect;
}

export interface BusinessResponsibility {
  readonly id: BusinessGoalId;
  readonly title: string;
  readonly description: string;
  readonly mandatory: boolean;
}

export interface BusinessDecisionAuthority {
  readonly id: BusinessGoalId;
  readonly title: string;
  readonly description: string;
  readonly scope: string;
}

export interface BusinessRole extends PrioritizedBusinessNode<BusinessRoleId> {
  readonly id: BusinessRoleId;
  readonly roleType: BusinessRoleType;
  readonly permissions: ReadonlyArray<BusinessPermission>;
  readonly responsibilities: ReadonlyArray<BusinessResponsibility>;
  readonly decisionAuthorities: ReadonlyArray<BusinessDecisionAuthority>;
  readonly reportsTo?: BusinessRoleId;
  readonly manages: ReadonlyArray<BusinessRoleId>;
}

export interface BusinessOrganization extends PrioritizedBusinessNode {
  readonly id: BusinessGoalId;
  readonly organizationType: BusinessOrganizationType;
  readonly address?: BusinessAddress;
  readonly context: BusinessContext;
  readonly parentOrganizationId?: string;
  readonly childOrganizationIds: ReadonlyArray<string>;
  readonly ownedCapabilities: ReadonlyArray<BusinessCapabilityId>;
  readonly ownedEntities: ReadonlyArray<BusinessEntityId>;
}

export interface BusinessActor extends PrioritizedBusinessNode<BusinessActorId> {
  readonly id: BusinessActorId;
  readonly actorType: BusinessActorType;
  readonly status: BusinessActorStatus;
  readonly organizationId?: string;
  readonly roleIds: ReadonlyArray<BusinessRoleId>;
  readonly capabilities: ReadonlyArray<BusinessCapabilityId>;
  readonly ownedEntities: ReadonlyArray<BusinessEntityId>;
  readonly responsibilities: ReadonlyArray<string>;
  readonly constraints: ReadonlyArray<BusinessConstraintId>;
}

/* -------------------------------------------------------------------------- */
/*                        BUSINESS COMMUNICATION MODEL                        */
/* -------------------------------------------------------------------------- */

export interface BusinessCommunicationFlow {
  readonly id: BusinessGoalId;
  readonly name: string;
  readonly sender: BusinessActorId;
  readonly receivers: ReadonlyArray<BusinessActorId>;
  readonly channel: BusinessCommunicationChannel;
  readonly description: string;
}

/* -------------------------------------------------------------------------- */
/*                           BUSINESS OWNERSHIP                              */
/* -------------------------------------------------------------------------- */

export interface BusinessOwnershipRule {
  readonly owner: BusinessActorId;
  readonly delegates: ReadonlyArray<BusinessActorId>;
  readonly reviewers: ReadonlyArray<BusinessActorId>;
  readonly approvers: ReadonlyArray<BusinessActorId>;
}

export interface BusinessEscalationPath {
  readonly id: BusinessGoalId;
  readonly title: string;
  readonly actorSequence: ReadonlyArray<BusinessActorId>;
  readonly maximumDurationHours: number;
}

/* -------------------------------------------------------------------------- */
/*                             BUSINESS TEAMS                                */
/* -------------------------------------------------------------------------- */

export interface BusinessTeam extends PrioritizedBusinessNode<BusinessTeamId> {
  readonly id: BusinessTeamId;
  readonly organizationId: string;
  readonly memberIds: ReadonlyArray<BusinessActorId>;
  readonly managerRoleId: BusinessRoleId;
  readonly ownedCapabilities: ReadonlyArray<BusinessCapabilityId>;
  readonly ownedProcesses: ReadonlyArray<BusinessProcessId>;
}

/* -------------------------------------------------------------------------- */
/*                         BUSINESS STAKEHOLDERS                             */
/* -------------------------------------------------------------------------- */

export interface BusinessStakeholder extends PrioritizedBusinessNode<BusinessStakeholderId> {
  readonly id: BusinessStakeholderId;
  readonly actorId: BusinessActorId;
  readonly influence: number;
  readonly interest: number;
  readonly ownership: BusinessOwnershipRule;
}

/* -------------------------------------------------------------------------- */
/*                BUSINESS ENTITIES / VALUE OBJECTS / RELATIONSHIPS           */
/* -------------------------------------------------------------------------- */

export interface BusinessEnumerationValue {
  readonly value: string;
  readonly label: string;
  readonly description: string;
}

export interface BusinessFieldValidation {
  readonly required: boolean;
  readonly unique: boolean;
  readonly minimumLength?: number;
  readonly maximumLength?: number;
  readonly minimumValue?: number;
  readonly maximumValue?: number;
  readonly regularExpression?: string;
}

export interface BusinessField {
  readonly id: BusinessFieldId;
  readonly name: string;
  readonly description: string;
  readonly type: BusinessFieldType;
  readonly validation: BusinessFieldValidation;
  readonly enumerationValues: ReadonlyArray<BusinessEnumerationValue>;
  readonly defaultValue?: string | number | boolean;
  readonly computed: boolean;
  readonly searchable: boolean;
  readonly filterable: boolean;
  readonly sortable: boolean;
}

export interface BusinessValueObject extends PrioritizedBusinessNode<BusinessValueObjectId> {
  readonly id: BusinessValueObjectId;
  readonly fields: ReadonlyArray<BusinessField>;
}

export interface BusinessAggregate extends PrioritizedBusinessNode<BusinessAggregateId> {
  readonly id: BusinessAggregateId;
  readonly rootEntityId: BusinessEntityId;
  readonly entityIds: ReadonlyArray<BusinessEntityId>;
}

export interface BusinessEntity extends PrioritizedBusinessNode<BusinessEntityId> {
  readonly id: BusinessEntityId;
  readonly entityType: BusinessEntityType;
  readonly aggregateId?: string;
  readonly fields: ReadonlyArray<BusinessField>;
  readonly valueObjects: ReadonlyArray<BusinessValueObject>;
  readonly ownerRoles: ReadonlyArray<BusinessRoleId>;
  readonly ownerCapabilities: ReadonlyArray<BusinessCapabilityId>;
  readonly constraints: ReadonlyArray<BusinessConstraintId>;
  readonly taxonomyIds: ReadonlyArray<BusinessTaxonomyId>;
}

export interface BusinessRelationship extends PrioritizedBusinessNode<BusinessRelationshipId> {
  readonly id: BusinessRelationshipId;
  readonly sourceEntityId: BusinessEntityId;
  readonly targetEntityId: BusinessEntityId;
  readonly cardinality: BusinessRelationshipCardinality;
  readonly ownership: BusinessRelationshipOwnership;
  readonly required: boolean;
  readonly description: string;
}

/* -------------------------------------------------------------------------- */
/*                           DOMAIN BOUNDARIES                               */
/* -------------------------------------------------------------------------- */

export interface BusinessDomain extends PrioritizedBusinessNode<BusinessDomainId> {
  readonly id: BusinessDomainId;
  readonly entities: ReadonlyArray<BusinessEntityId>;
  readonly capabilities: ReadonlyArray<BusinessCapabilityId>;
  readonly actors: ReadonlyArray<BusinessActorId>;
  readonly processes: ReadonlyArray<BusinessProcessId>;
}

export interface BusinessBoundedContext extends PrioritizedBusinessNode<BusinessBoundedContextId> {
  readonly id: BusinessBoundedContextId;
  readonly domainId: string;
  readonly ownedEntities: ReadonlyArray<BusinessEntityId>;
  readonly publishedEvents: ReadonlyArray<string>;
  readonly consumedEvents: ReadonlyArray<string>;
}

/* -------------------------------------------------------------------------- */
/*                             BUSINESS EVENTS                               */
/* -------------------------------------------------------------------------- */

export interface BusinessDomainEvent extends PrioritizedBusinessNode {
  readonly id: BusinessGoalId;
  readonly producerEntityId: BusinessEntityId;
  readonly consumerEntityIds: ReadonlyArray<BusinessEntityId>;
  readonly payloadDescription: string;
}

/* -------------------------------------------------------------------------- */
/*                            BUSINESS TAXONOMY                              */
/* -------------------------------------------------------------------------- */

export interface BusinessClassificationNode extends PrioritizedBusinessNode<BusinessTaxonomyId> {
  readonly id: BusinessTaxonomyId;
  readonly parentId?: BusinessTaxonomyId;
  readonly children: ReadonlyArray<BusinessTaxonomyId>;
}

export interface BusinessVocabularyTerm {
  readonly id: BusinessVocabularyTermId;
  readonly name: string;
  readonly definition: string;
  readonly synonyms: ReadonlyArray<string>;
}

export interface BusinessGlossary extends PrioritizedBusinessNode<BusinessGlossaryId> {
  readonly id: BusinessGlossaryId;
  readonly terms: ReadonlyArray<BusinessVocabularyTerm>;
}

/* -------------------------------------------------------------------------- */
/*                BUSINESS CAPABILITIES / PROCESSES / WORKFLOWS              */
/* -------------------------------------------------------------------------- */

export interface BusinessCapabilityDependency {
  readonly capabilityId: BusinessCapabilityId;
  readonly required: boolean;
}

export interface BusinessCapability extends PrioritizedBusinessNode<BusinessCapabilityId> {
  readonly id: BusinessCapabilityId;
  readonly category: BusinessCapabilityCategory;
  readonly parentCapabilityId?: BusinessCapabilityId;
  readonly childCapabilityIds: ReadonlyArray<BusinessCapabilityId>;
  readonly entityIds: ReadonlyArray<BusinessEntityId>;
  readonly processIds: ReadonlyArray<BusinessProcessId>;
  readonly ownerRoleIds: ReadonlyArray<BusinessRoleId>;
  readonly dependencies: ReadonlyArray<BusinessCapabilityDependency>;
  readonly kpiIds: ReadonlyArray<BusinessKpiId>;
  readonly constraintIds: ReadonlyArray<BusinessConstraintId>;
}

export interface BusinessProcessInput {
  readonly entityId: BusinessEntityId;
  readonly required: boolean;
}

export interface BusinessProcessOutput {
  readonly entityId: BusinessEntityId;
}

export interface BusinessProcess extends PrioritizedBusinessNode<BusinessProcessId> {
  readonly id: BusinessProcessId;
  readonly processType: BusinessProcessType;
  readonly capabilityId: BusinessCapabilityId;
  readonly ownerRoleIds: ReadonlyArray<BusinessRoleId>;
  readonly workflowIds: ReadonlyArray<BusinessWorkflowId>;
  readonly inputs: ReadonlyArray<BusinessProcessInput>;
  readonly outputs: ReadonlyArray<BusinessProcessOutput>;
  readonly businessRuleIds: ReadonlyArray<BusinessRuleId>;
  readonly integrationIds: ReadonlyArray<BusinessIntegrationId>;
  readonly complianceIds: ReadonlyArray<BusinessComplianceId>;
}

export interface BusinessWorkflowStep {
  readonly id: BusinessGoalId;
  readonly name: string;
  readonly stepType: BusinessWorkflowStepType;
  readonly actorId?: BusinessActorId;
  readonly roleId?: BusinessRoleId;
  readonly processId?: BusinessProcessId;
  readonly nextStepIds: ReadonlyArray<string>;
  readonly ruleIds: ReadonlyArray<BusinessRuleId>;
  readonly constraintIds: ReadonlyArray<BusinessConstraintId>;
}

export interface BusinessWorkflowTransition {
  readonly fromStepId: string;
  readonly toStepId: string;
  readonly condition?: string;
}

export interface BusinessWorkflow extends PrioritizedBusinessNode<BusinessWorkflowId> {
  readonly id: BusinessWorkflowId;
  readonly triggerType: BusinessWorkflowTriggerType;
  readonly capabilityId: BusinessCapabilityId;
  readonly processId: BusinessProcessId;
  readonly steps: ReadonlyArray<BusinessWorkflowStep>;
  readonly transitions: ReadonlyArray<BusinessWorkflowTransition>;
  readonly businessRuleIds: ReadonlyArray<BusinessRuleId>;
  readonly involvedActors: ReadonlyArray<BusinessActorId>;
  readonly involvedRoles: ReadonlyArray<BusinessRoleId>;
}

export interface BusinessDecisionPoint {
  readonly id: BusinessDecisionPointId;
  readonly title: string;
  readonly decisionType: BusinessDecisionType;
  readonly ruleIds: ReadonlyArray<BusinessRuleId>;
  readonly actorIds: ReadonlyArray<BusinessActorId>;
  readonly possibleOutcomes: ReadonlyArray<string>;
}

export interface BusinessEvent {
  readonly id: BusinessGoalId;
  readonly name: string;
  readonly eventType: BusinessEventType;
  readonly emittedBy: BusinessProcessId;
  readonly consumedBy: ReadonlyArray<BusinessProcessId>;
  readonly affectedEntities: ReadonlyArray<BusinessEntityId>;
}

export interface BusinessProcessDependency {
  readonly processId: BusinessProcessId;
  readonly dependsOn: ReadonlyArray<BusinessProcessId>;
}

/* -------------------------------------------------------------------------- */
/*               BUSINESS INTEGRATIONS / COMPLIANCE / GOVERNANCE              */
/* -------------------------------------------------------------------------- */

export interface BusinessGoal extends PrioritizedBusinessNode {
  readonly id: BusinessGoalId;
  readonly category: BusinessGoalCategory;
  readonly objective: string;
  readonly successCriteria: ReadonlyArray<string>;
  readonly kpiIds: ReadonlyArray<BusinessKpiId>;
  readonly ownerRoleIds: ReadonlyArray<BusinessRoleId>;
  readonly capabilityIds: ReadonlyArray<BusinessCapabilityId>;
}

export interface BusinessKpiTarget {
  readonly value: number;
  readonly unit: string;
  readonly direction: BusinessTrendDirection;
}

export interface BusinessKpi extends PrioritizedBusinessNode {
  readonly id: BusinessKpiId;
  readonly aggregation: BusinessKpiAggregation;
  readonly target: BusinessKpiTarget;
  readonly measuredEntityIds: ReadonlyArray<BusinessEntityId>;
  readonly measuredCapabilityIds: ReadonlyArray<BusinessCapabilityId>;
  readonly ownerRoleIds: ReadonlyArray<BusinessRoleId>;
}

export interface BusinessPolicy extends PrioritizedBusinessNode {
  readonly id: BusinessPolicyId;
  readonly category: BusinessPolicyCategory;
  readonly appliesToCapabilities: ReadonlyArray<BusinessCapabilityId>;
  readonly appliesToProcesses: ReadonlyArray<BusinessProcessId>;
  readonly appliesToRoles: ReadonlyArray<BusinessRoleId>;
  readonly ruleIds: ReadonlyArray<BusinessRuleId>;
}

export interface BusinessCompliance extends PrioritizedBusinessNode {
  readonly id: BusinessComplianceId;
  readonly category: BusinessComplianceCategory;
  readonly authority: string;
  readonly applicableCountries: ReadonlyArray<CountryCode>;
  readonly policyIds: ReadonlyArray<BusinessPolicyId>;
  readonly ruleIds: ReadonlyArray<BusinessRuleId>;
  readonly capabilityIds: ReadonlyArray<BusinessCapabilityId>;
}

export interface BusinessRisk extends PrioritizedBusinessNode {
  readonly id: BusinessGoalId;
  readonly severity: BusinessRiskSeverity;
  readonly likelihood: BusinessRiskLikelihood;
  readonly mitigation: string;
  readonly affectedCapabilityIds: ReadonlyArray<BusinessCapabilityId>;
  readonly ownerRoleIds: ReadonlyArray<BusinessRoleId>;
}

export interface BusinessServiceLevelObjective {
  readonly metric: string;
  readonly target: number;
  readonly unit: string;
}

export interface BusinessServiceLevelAgreement extends PrioritizedBusinessNode {
  readonly id: BusinessGoalId;
  readonly objectives: ReadonlyArray<BusinessServiceLevelObjective>;
  readonly ownerRoleIds: ReadonlyArray<BusinessRoleId>;
}

export interface BusinessIntegration extends PrioritizedBusinessNode {
  readonly id: BusinessIntegrationId;
  readonly integrationType: BusinessIntegrationType;
  readonly provider: string;
  readonly description: string;
  readonly capabilityIds: ReadonlyArray<BusinessCapabilityId>;
  readonly processIds: ReadonlyArray<BusinessProcessId>;
  readonly entityIds: ReadonlyArray<BusinessEntityId>;
}

export interface BusinessGovernance extends PrioritizedBusinessNode {
  readonly id: BusinessGoalId;
  readonly policies: ReadonlyArray<BusinessPolicyId>;
  readonly compliances: ReadonlyArray<BusinessComplianceId>;
  readonly risks: ReadonlyArray<string>;
  readonly goals: ReadonlyArray<string>;
  readonly kpis: ReadonlyArray<BusinessKpiId>;
}

export interface BusinessAssumption extends PrioritizedBusinessNode {
  readonly id: BusinessGoalId;
  readonly statement: string;
  readonly confidence: number;
  readonly evidence: ReadonlyArray<EvidenceId>;
}

export interface BusinessDependency {
  readonly sourceCapabilityId: BusinessCapabilityId;
  readonly targetCapabilityId: BusinessCapabilityId;
  readonly required: boolean;
}

/* -------------------------------------------------------------------------- */
/*                      ROOT BUSINESS BLUEPRINT CONTRACTS                     */
/* -------------------------------------------------------------------------- */

export interface BusinessDecision {
  readonly id: BusinessGoalId;
  readonly title: string;
  readonly rationale: string;
  readonly confidence: BusinessReasoningConfidence;
  readonly evidence: ReadonlyArray<EvidenceId>;
  readonly affectedCapabilities: ReadonlyArray<BusinessCapabilityId>;
  readonly affectedProcesses: ReadonlyArray<BusinessProcessId>;
  readonly affectedEntities: ReadonlyArray<BusinessEntityId>;
}

export interface BusinessReasoningResult {
  readonly decisions: ReadonlyArray<BusinessDecision>;
  readonly inferredCapabilities: ReadonlyArray<BusinessCapabilityId>;
  readonly inferredProcesses: ReadonlyArray<BusinessProcessId>;
  readonly inferredConstraints: ReadonlyArray<BusinessConstraintId>;
  readonly inferredPolicies: ReadonlyArray<BusinessPolicyId>;
  readonly inferredCompliance: ReadonlyArray<BusinessComplianceId>;
}

export interface BusinessBlueprintMetadata {
  readonly id: BusinessBlueprintId;
  readonly name: string;
  readonly description: string;
  readonly version: SemVer;
  readonly status: BusinessPlanningStatus;
  readonly industry: IndustryId;
  readonly classification: BusinessClassification;
  readonly ownership: BusinessOwnership;
  readonly context: BusinessContext;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface BusinessBlueprint {
  readonly metadata: BusinessBlueprintMetadata;
  readonly organizations: ReadonlyArray<BusinessOrganization>;
  readonly teams: ReadonlyArray<BusinessTeam>;
  readonly actors: ReadonlyArray<BusinessActor>;
  readonly roles: ReadonlyArray<BusinessRole>;
  readonly entities: ReadonlyArray<BusinessEntity>;
  readonly relationships: ReadonlyArray<BusinessRelationship>;
  readonly capabilities: ReadonlyArray<BusinessCapability>;
  readonly processes: ReadonlyArray<BusinessProcess>;
  readonly workflows: ReadonlyArray<BusinessWorkflow>;
  readonly policies: ReadonlyArray<BusinessPolicy>;
  readonly compliance: ReadonlyArray<BusinessCompliance>;
  readonly integrations: ReadonlyArray<BusinessIntegration>;
  readonly governance: ReadonlyArray<BusinessGovernance>;
  readonly goals: ReadonlyArray<BusinessGoal>;
  readonly kpis: ReadonlyArray<BusinessKpi>;
  readonly risks: ReadonlyArray<BusinessRisk>;
  readonly serviceLevels: ReadonlyArray<BusinessServiceLevelAgreement>;
  readonly constraints: ReadonlyArray<BusinessConstraint>;
  readonly requirements: ReadonlyArray<BusinessRequirement>;
  readonly evidence: ReadonlyArray<BusinessEvidence>;
  readonly taxonomy: ReadonlyArray<TaxonomyNode>;
}

export interface BusinessReasoningContext {
  readonly blueprint: BusinessBlueprint;
  readonly assumptions: ReadonlyArray<BusinessAssumption>;
  readonly decisions: ReadonlyArray<BusinessDecision>;
}

export interface BusinessValidationIssue {
  readonly severity: BusinessRuleSeverity;
  readonly message: string;
  readonly location: string;
}

export interface BusinessValidationResult {
  readonly valid: boolean;
  readonly issues: ReadonlyArray<BusinessValidationIssue>;
}

export type ImmutableBusinessBlueprint = Readonly<BusinessBlueprint>;
