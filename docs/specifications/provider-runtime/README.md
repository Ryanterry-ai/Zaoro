# Provider/Runtime Specification

**Version**: 1.0.0-draft  
**Status**: Draft  
**Last Updated**: 2026-07-04

---

## Overview

The Provider/Runtime Specification defines the runtime interfaces for external services. These should be completely independent of the compiler.

The Provider Specification answers: **"How do we integrate with external services?"**

---

## Core Principles

### 1. Independence
Providers are independent of the compiler. The compiler generates code that uses providers, but providers are not part of the compilation process.

### 2. Pluggability
Providers are pluggable. You can swap one provider implementation for another without changing the compiler.

### 3. Fallback
Every provider must have a fallback. If a provider is unavailable, the system must degrade gracefully.

### 4. Configuration
Providers are configured via environment variables or configuration files.

---

## Provider Types

### 1. StorageProvider
**Purpose**: Persist data.

```typescript
interface StorageProvider {
  name: string;
  
  // CRUD operations
  create(collection: string, data: unknown): Promise<string>;
  read(collection: string, id: string): Promise<unknown>;
  update(collection: string, id: string, data: unknown): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  
  // Query operations
  query(collection: string, filter: unknown): Promise<unknown[]>;
  
  // Transaction support
  transaction<T>(fn: (tx: StorageTransaction) => Promise<T>): Promise<T>;
}
```

**Implementations**:
- SupabaseProvider
- PostgreSQLProvider
- SQLiteProvider
- FileSystemProvider
- InMemoryProvider

### 2. AnalyticsProvider
**Purpose**: Track user behavior and events.

```typescript
interface AnalyticsProvider {
  name: string;
  
  // Event tracking
  track(event: string, properties?: Record<string, unknown>): void;
  
  // User identification
  identify(userId: string, traits?: Record<string, unknown>): void;
  
  // Page views
  page(name: string, properties?: Record<string, unknown>): void;
  
  // Groups
  group(groupId: string, traits?: Record<string, unknown>): void;
}
```

**Implementations**:
- PostHogProvider
- MixpanelProvider
- AmplitudeProvider
- GoogleAnalyticsProvider
- NullAnalyticsProvider

### 3. MonitoringProvider
**Purpose**: Monitor errors and performance.

```typescript
interface MonitoringProvider {
  name: string;
  
  // Error tracking
  captureException(error: Error, context?: Record<string, unknown>): void;
  
  // Message tracking
  captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
  
  // Performance tracking
  startTransaction(name: string): Transaction;
  
  // Breadcrumbs
  addBreadcrumb(breadcrumb: Breadcrumb): void;
}
```

**Implementations**:
- SentryProvider
- DatadogProvider
- NewRelicProvider
- NullMonitoringProvider

### 4. DeploymentProvider
**Purpose**: Deploy applications.

```typescript
interface DeploymentProvider {
  name: string;
  
  // Deploy
  deploy(config: DeploymentConfig): Promise<DeploymentResult>;
  
  // Status
  status(deploymentId: string): Promise<DeploymentStatus>;
  
  // Rollback
  rollback(deploymentId: string): Promise<void>;
  
  // Logs
  logs(deploymentId: string): Promise<string[]>;
}
```

**Implementations**:
- VercelProvider
- NetlifyProvider
- AWSProvider
- DockerProvider
- LocalProvider

### 5. AuthenticationProvider
**Purpose**: Handle user authentication.

```typescript
interface AuthenticationProvider {
  name: string;
  
  // Login
  login(credentials: Credentials): Promise<AuthResult>;
  
  // Register
  register(data: RegistrationData): Promise<AuthResult>;
  
  // Logout
  logout(token: string): Promise<void>;
  
  // Verify
  verify(token: string): Promise<AuthResult>;
  
  // Refresh
  refreshToken(token: string): Promise<string>;
}
```

**Implementations**:
- Auth0Provider
- FirebaseProvider
- SupabaseAuthProvider
- JWTProvider
- LocalAuthProvider

### 6. EmailProvider
**Purpose**: Send emails.

```typescript
interface EmailProvider {
  name: string;
  
  // Send email
  send(options: EmailOptions): Promise<EmailResult>;
  
  // Send template
  sendTemplate(templateId: string, to: string, data: Record<string, unknown>): Promise<EmailResult>;
  
  // Verify
  verify(): Promise<boolean>;
}
```

**Implementations**:
- SendGridProvider
- MailgunProvider
- SESProvider
- SMTPProvider
- ConsoleEmailProvider

### 7. CacheProvider
**Purpose**: Cache data.

```typescript
interface CacheProvider {
  name: string;
  
  // Get
  get<T>(key: string): Promise<T | null>;
  
  // Set
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  
  // Delete
  delete(key: string): Promise<void>;
  
  // Clear
  clear(): Promise<void>;
  
  // Has
  has(key: string): Promise<boolean>;
}
```

**Implementations**:
- RedisProvider
- MemcachedProvider
- InMemoryCacheProvider
- FileSystemCacheProvider

### 8. QueueProvider
**Purpose**: Process background jobs.

```typescript
interface QueueProvider {
  name: string;
  
  // Add job
  add<T>(queue: string, data: T, options?: JobOptions): Promise<string>;
  
  // Process jobs
  process<T>(queue: string, handler: (data: T) => Promise<void>): void;
  
  // Get job status
  status(jobId: string): Promise<JobStatus>;
  
  // Cancel job
  cancel(jobId: string): Promise<void>;
}
```

**Implementations**:
- BullProvider
- SQSProvider
- RabbitMQProvider
- InMemoryQueueProvider

---

## Provider Registry

### Registration

```typescript
const registry = new ProviderRegistry();

// Register providers
registry.register('storage', 'supabase', new SupabaseProvider());
registry.register('storage', 'sqlite', new SQLiteProvider());
registry.register('analytics', 'posthog', new PostHogProvider());
registry.register('monitoring', 'sentry', new SentryProvider());
```

### Resolution

```typescript
// Get provider
const storage = registry.resolve<StorageProvider>('storage', 'supabase');

// Get with fallback
const analytics = registry.resolve<AnalyticsProvider>('analytics', 'posthog', new NullAnalyticsProvider());
```

### Configuration

```typescript
// Configure provider
registry.configure('storage', 'supabase', {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_KEY,
});
```

---

## Null Providers

### Purpose
Null providers are used when a real provider is unavailable. They provide graceful degradation.

### NullAnalyticsProvider

```typescript
class NullAnalyticsProvider implements AnalyticsProvider {
  name = 'null-analytics';
  
  track(): void { /* no-op */ }
  identify(): void { /* no-op */ }
  page(): void { /* no-op */ }
  group(): void { /* no-op */ }
}
```

### NullMonitoringProvider

```typescript
class NullMonitoringProvider implements MonitoringProvider {
  name = 'null-monitoring';
  
  captureException(): void { /* no-op */ }
  captureMessage(): void { /* no-op */ }
  startTransaction(): Transaction {
    return { finish(): void { /* no-op */ } };
  }
  addBreadcrumb(): void { /* no-op */ }
}
```

### NullStorageProvider

```typescript
class NullStorageProvider implements StorageProvider {
  name = 'null-storage';
  
  async create(): Promise<string> { return 'null-id'; }
  async read(): Promise<null> { return null; }
  async update(): Promise<void> { /* no-op */ }
  async delete(): Promise<void> { /* no-op */ }
  async query(): Promise<[]> { return []; }
  async transaction<T>(fn: (tx: StorageTransaction) => Promise<T>): Promise<T> {
    return fn({} as StorageTransaction);
  }
}
```

---

## Provider Usage in Build.same

### 1. Planning Phase
The planner uses:
- StorageProvider: Store business profiles
- AnalyticsProvider: Track planning metrics

### 2. Compilation Phase
The compiler uses:
- StorageProvider: Store generated code
- MonitoringProvider: Track compilation errors

### 3. Deployment Phase
The deployment uses:
- DeploymentProvider: Deploy application
- StorageProvider: Store deployment status
- MonitoringProvider: Track deployment errors

### 4. Runtime Phase
The generated application uses:
- StorageProvider: Persist data
- AnalyticsProvider: Track user behavior
- MonitoringProvider: Track errors
- AuthenticationProvider: Handle auth
- EmailProvider: Send emails
- CacheProvider: Cache data
- QueueProvider: Process background jobs

---

## Provider Configuration

### Environment Variables

```bash
# Storage
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
DATABASE_URL=postgresql://xxx

# Analytics
POSTHOG_KEY=xxx
MIXPANEL_KEY=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
DATADOG_API_KEY=xxx

# Deployment
VERCEL_TOKEN=xxx
NETLIFY_TOKEN=xxx

# Authentication
AUTH0_DOMAIN=xxx
AUTH0_CLIENT_ID=xxx
AUTH0_CLIENT_SECRET=xxx

# Email
SENDGRID_API_KEY=xxx
MAILGUN_API_KEY=xxx

# Cache
REDIS_URL=redis://xxx

# Queue
BULL_REDIS_URL=redis://xxx
```

### Configuration Files

```json
{
  "providers": {
    "storage": {
      "default": "supabase",
      "supabase": {
        "url": "${SUPABASE_URL}",
        "key": "${SUPABASE_KEY}"
      }
    },
    "analytics": {
      "default": "posthog",
      "posthog": {
        "key": "${POSTHOG_KEY}"
      }
    }
  }
}
```

---

## Provider Testing

### Unit Tests
Each provider must have unit tests that verify:
1. Correct behavior
2. Error handling
3. Fallback behavior

### Integration Tests
Providers must have integration tests that verify:
1. Real service integration
2. Configuration
3. Performance

### Mock Providers
For testing, use mock providers:

```typescript
class MockStorageProvider implements StorageProvider {
  name = 'mock-storage';
  private data = new Map<string, unknown>();
  
  async create(collection: string, data: unknown): Promise<string> {
    const id = `${collection}-${Date.now()}`;
    this.data.set(id, data);
    return id;
  }
  
  async read(collection: string, id: string): Promise<unknown> {
    return this.data.get(id) || null;
  }
  
  // ... other methods
}
```

---

**End of Provider/Runtime Specification**
