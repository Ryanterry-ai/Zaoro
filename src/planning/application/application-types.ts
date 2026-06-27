/**
 * =============================================================================
 * Build.same V3
 * Application Planning Layer - Types
 * =============================================================================
 * Application contracts that translate business capabilities into software.
 * Zero UI concerns, zero generation concerns.
 */

import type {
  BusinessBlueprint,
  BusinessCapabilityId,
  BusinessEntityId,
  BusinessProcessId,
  BusinessRoleId,
} from '../business/business-types.js';

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

export type ApplicationBlueprintId = Brand<string, "ApplicationBlueprintId">;
export type ApplicationPageId = Brand<string, "ApplicationPageId">;
export type ApplicationRouteId = Brand<string, "ApplicationRouteId">;
export type ApplicationComponentId = Brand<string, "ApplicationComponentId">;
export type ApplicationServiceId = Brand<string, "ApplicationServiceId">;
export type ApplicationApiId = Brand<string, "ApplicationApiId">;
export type ApplicationStateId = Brand<string, "ApplicationStateId">;
export type ApplicationEventId = Brand<string, "ApplicationEventId">;
export type ApplicationModuleId = Brand<string, "ApplicationModuleId">;

/* -------------------------------------------------------------------------- */
/*                                   ENUMS                                    */
/* -------------------------------------------------------------------------- */

export enum ApplicationPageType {
  Landing = "landing",
  Detail = "detail",
  Listing = "listing",
  Form = "form",
  Dashboard = "dashboard",
  Auth = "auth",
  Error = "error",
  Static = "static",
}

export enum ApplicationComponentType {
  Page = "page",
  Section = "section",
  Component = "component",
  Widget = "widget",
  Layout = "layout",
  Modal = "modal",
}

export enum ApplicationServiceType {
  DataFetching = "data-fetching",
  StateManagement = "state-management",
  Authentication = "authentication",
  Notification = "notification",
  Analytics = "analytics",
  Payment = "payment",
  Email = "email",
  Storage = "storage",
}

export enum ApplicationApiType {
  REST = "rest",
  GraphQL = "graphql",
  WebSocket = "websocket",
  Internal = "internal",
}

export enum ApplicationStateType {
  Global = "global",
  Local = "local",
  Server = "server",
  URL = "url",
  Form = "form",
}

export enum ApplicationLayoutType {
  FullWidth = "full-width",
  Contained = "contained",
  Sidebar = "sidebar",
  Grid = "grid",
}

export enum ApplicationAnimationType {
  FramerMotion = "framer-motion",
  GSAP = "gsap",
  CSS = "css",
  Lottie = "lottie",
}

/* -------------------------------------------------------------------------- */
/*                           CORE METADATA                                    */
/* -------------------------------------------------------------------------- */

export interface ApplicationMetadata {
  readonly name: string;
  readonly description: string;
  readonly tags: ReadonlyArray<string>;
}

export interface ApplicationVersion {
  readonly version: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*                           PAGE DEFINITIONS                                 */
/* -------------------------------------------------------------------------- */

export interface ApplicationPage {
  readonly id: ApplicationPageId;
  readonly name: string;
  readonly description: string;
  readonly pageType: ApplicationPageType;
  readonly route: string;
  readonly layout: ApplicationLayoutType;
  readonly components: ReadonlyArray<ApplicationComponentId>;
  readonly businessCapabilities: ReadonlyArray<BusinessCapabilityId>;
  readonly businessEntities: ReadonlyArray<BusinessEntityId>;
  readonly requiresAuth: boolean;
  readonly metadata: ApplicationMetadata;
}

export interface ApplicationComponent {
  readonly id: ApplicationComponentId;
  readonly name: string;
  readonly description: string;
  readonly componentType: ApplicationComponentType;
  readonly props: ReadonlyArray<ApplicationComponentProp>;
  readonly children: ReadonlyArray<ApplicationComponentId>;
  readonly animation?: ApplicationAnimation;
  readonly businessCapabilities: ReadonlyArray<BusinessCapabilityId>;
  readonly metadata: ApplicationMetadata;
}

export interface ApplicationComponentProp {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly defaultValue?: string;
  readonly description: string;
}

/* -------------------------------------------------------------------------- */
/*                           ROUTE DEFINITIONS                                */
/* -------------------------------------------------------------------------- */

export interface ApplicationRoute {
  readonly id: ApplicationRouteId;
  readonly path: string;
  readonly pageId: ApplicationPageId;
  readonly parentRouteId?: ApplicationRouteId;
  readonly requiresAuth: boolean;
  readonly roles: ReadonlyArray<BusinessRoleId>;
}

/* -------------------------------------------------------------------------- */
/*                           SERVICE DEFINITIONS                               */
/* -------------------------------------------------------------------------- */

export interface ApplicationService {
  readonly id: ApplicationServiceId;
  readonly name: string;
  readonly description: string;
  readonly serviceType: ApplicationServiceType;
  readonly endpoints: ReadonlyArray<ApplicationEndpoint>;
  readonly businessProcesses: ReadonlyArray<BusinessProcessId>;
  readonly metadata: ApplicationMetadata;
}

export interface ApplicationEndpoint {
  readonly path: string;
  readonly method: string;
  readonly description: string;
  readonly requestSchema?: string;
  readonly responseSchema?: string;
}

/* -------------------------------------------------------------------------- */
/*                           API DEFINITIONS                                   */
/* -------------------------------------------------------------------------- */

export interface ApplicationApi {
  readonly id: ApplicationApiId;
  readonly name: string;
  readonly description: string;
  readonly apiType: ApplicationApiType;
  readonly baseUrl: string;
  readonly endpoints: ReadonlyArray<ApplicationEndpoint>;
  readonly authentication: string;
  readonly metadata: ApplicationMetadata;
}

/* -------------------------------------------------------------------------- */
/*                           STATE DEFINITIONS                                 */
/* -------------------------------------------------------------------------- */

export interface ApplicationState {
  readonly id: ApplicationStateId;
  readonly name: string;
  readonly description: string;
  readonly stateType: ApplicationStateType;
  readonly initialState: Record<string, unknown>;
  readonly actions: ReadonlyArray<ApplicationStateAction>;
  readonly metadata: ApplicationMetadata;
}

export interface ApplicationStateAction {
  readonly name: string;
  readonly description: string;
  readonly payload: Record<string, string>;
}

/* -------------------------------------------------------------------------- */
/*                           EVENT DEFINITIONS                                 */
/* -------------------------------------------------------------------------- */

export interface ApplicationEvent {
  readonly id: ApplicationEventId;
  readonly name: string;
  readonly description: string;
  readonly payload: Record<string, string>;
  readonly handlers: ReadonlyArray<string>;
  readonly metadata: ApplicationMetadata;
}

/* -------------------------------------------------------------------------- */
/*                           MODULE DEFINITIONS                                */
/* -------------------------------------------------------------------------- */

export interface ApplicationModule {
  readonly id: ApplicationModuleId;
  readonly name: string;
  readonly description: string;
  readonly pages: ReadonlyArray<ApplicationPageId>;
  readonly components: ReadonlyArray<ApplicationComponentId>;
  readonly services: ReadonlyArray<ApplicationServiceId>;
  readonly state: ReadonlyArray<ApplicationStateId>;
  readonly metadata: ApplicationMetadata;
}

/* -------------------------------------------------------------------------- */
/*                           ANIMATION DEFINITIONS                             */
/* -------------------------------------------------------------------------- */

export interface ApplicationAnimation {
  readonly type: ApplicationAnimationType;
  readonly trigger: 'mount' | 'hover' | 'click' | 'scroll' | 'stagger' | 'loop';
  readonly code: string;
  readonly description: string;
}

/* -------------------------------------------------------------------------- */
/*                        ROOT APPLICATION BLUEPRINT                          */
/* -------------------------------------------------------------------------- */

export interface ApplicationBlueprintMetadata {
  readonly id: ApplicationBlueprintId;
  readonly name: string;
  readonly description: string;
  readonly version: ApplicationVersion;
  readonly businessBlueprintId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApplicationBlueprint {
  readonly metadata: ApplicationBlueprintMetadata;
  readonly pages: ReadonlyArray<ApplicationPage>;
  readonly components: ReadonlyArray<ApplicationComponent>;
  readonly routes: ReadonlyArray<ApplicationRoute>;
  readonly services: ReadonlyArray<ApplicationService>;
  readonly apis: ReadonlyArray<ApplicationApi>;
  readonly state: ReadonlyArray<ApplicationState>;
  readonly events: ReadonlyArray<ApplicationEvent>;
  readonly modules: ReadonlyArray<ApplicationModule>;
}

export type ImmutableApplicationBlueprint = Readonly<ApplicationBlueprint>;
