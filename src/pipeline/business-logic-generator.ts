/**
 * Stage 2: Business Logic Generator
 * Generates service classes, domain logic, validation, state management.
 * Pure TypeScript modules — no UI generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SchemaModel } from './schema-generator.js';

export interface ServiceMethod {
  name: string;
  params: Array<{ name: string; type: string; required: boolean }>;
  returnType: string;
  description: string;
  body: string;
}

export interface ServiceClass {
  name: string;
  modelName: string;
  methods: ServiceMethod[];
  description: string;
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  code: string;
}

export interface StateSlice {
  name: string;
  state: Array<{ name: string; type: string; initialValue: string }>;
  actions: Array<{ name: string; params: Array<{ name: string; type: string }>; body: string }>;
}

export interface ServerAction {
  name: string;
  modelName: string;
  operation: 'create' | 'update' | 'delete' | 'list' | 'get';
  params: Array<{ name: string; type: string; required: boolean }>;
  returnType: string;
  body: string;
}

export interface Stage2Output {
  services: ServiceClass[];
  validations: ValidationRule[];
  stateSlices: StateSlice[];
  serverActions: ServerAction[];
  generatedFiles: string[];
}

export class BusinessLogicGenerator {
  /**
   * Generate the complete business logic layer.
   */
  generate(
    appName: string,
    models: SchemaModel[],
    capabilities: string[],
    workspacePath: string,
  ): Stage2Output {
    console.log('[biz-logic] Stage 2: Generating business logic...');

    const services = this.generateServices(models);
    const validations = this.generateValidations(models);
    const stateSlices = this.generateStateSlices(models, capabilities);
    const serverActions = this.generateServerActions(models);

    const generatedFiles: string[] = [];

    // Services
    const servicesDir = path.join(workspacePath, 'src', 'lib', 'services');
    fs.mkdirSync(servicesDir, { recursive: true });
    for (const service of services) {
      const content = this.generateServiceFile(service);
      const fileName = `${service.modelName.toLowerCase()}.ts`;
      fs.writeFileSync(path.join(servicesDir, fileName), content, 'utf-8');
      generatedFiles.push(`src/lib/services/${fileName}`);
    }

    // Validations
    const validationsDir = path.join(workspacePath, 'src', 'lib', 'validations');
    fs.mkdirSync(validationsDir, { recursive: true });
    const validationsContent = this.generateValidationsFile(validations, models);
    fs.writeFileSync(path.join(validationsDir, 'index.ts'), validationsContent, 'utf-8');
    generatedFiles.push('src/lib/validations/index.ts');

    // State management
    const stateDir = path.join(workspacePath, 'src', 'lib', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    for (const slice of stateSlices) {
      const content = this.generateStateSliceFile(slice);
      const fileName = `${slice.name.toLowerCase()}.ts`;
      fs.writeFileSync(path.join(stateDir, fileName), content, 'utf-8');
      generatedFiles.push(`src/lib/state/${fileName}`);
    }

    // Server actions
    const actionsDir = path.join(workspacePath, 'src', 'app', 'actions');
    fs.mkdirSync(actionsDir, { recursive: true });
    for (const action of serverActions) {
      const content = this.generateServerActionFile(action);
      const fileName = `${action.modelName.toLowerCase()}.ts`;
      fs.writeFileSync(path.join(actionsDir, fileName), content, 'utf-8');
      generatedFiles.push(`src/app/actions/${fileName}`);
    }

    // Index barrel
    const indexContent = [
      ...services.map(s => `export { ${s.name} } from './services/${s.modelName.toLowerCase()}.js';`),
      ...stateSlices.map(s => `export { use${s.name}Store } from './state/${s.name.toLowerCase()}.js';`),
      `export * from './validations/index.js';`,
    ].join('\n');
    fs.writeFileSync(path.join(workspacePath, 'src', 'lib', 'index.ts'), indexContent, 'utf-8');
    generatedFiles.push('src/lib/index.ts');

    console.log(`[biz-logic] Generated ${services.length} services, ${stateSlices.length} state slices, ${serverActions.length} server actions`);
    console.log(`[biz-logic] Files: ${generatedFiles.join(', ')}`);

    return { services, validations, stateSlices, serverActions, generatedFiles };
  }

  private generateServices(models: SchemaModel[]): ServiceClass[] {
    return models.map(model => ({
      name: `${model.name}Service`,
      modelName: model.name,
      description: `CRUD service for ${model.name}`,
      methods: this.generateServiceMethods(model),
    }));
  }

  private generateServiceMethods(model: SchemaModel): ServiceMethod[] {
    const methods: ServiceMethod[] = [];
    const name = model.name;
    const nameLower = name.toLowerCase();

    // Find
    methods.push({
      name: 'findMany',
      params: [{ name: 'where', type: `Prisma.${name}WhereInput`, required: false }],
      returnType: `Promise<${name}[]>`,
      description: `Find multiple ${name} records`,
      body: `    return prisma.${nameLower}.findMany({ where, orderBy: { createdAt: 'desc' } });`,
    });

    methods.push({
      name: 'findUnique',
      params: [{ name: 'id', type: 'string', required: true }],
      returnType: `Promise<${name} | null>`,
      description: `Find a single ${name} by ID`,
      body: `    return prisma.${nameLower}.findUnique({ where: { id } });`,
    });

    // Create
    const createFields = model.fields
      .filter(f => !f.isId && f.name !== 'createdAt' && f.name !== 'updatedAt')
      .map(f => `${f.name}: data.${f.name}`)
      .join(',\n      ');

    methods.push({
      name: 'create',
      params: [{ name: 'data', type: `Omit<Prisma.${name}CreateInput, 'id' | 'createdAt' | 'updatedAt'>`, required: true }],
      returnType: `Promise<${name}>`,
      description: `Create a new ${name}`,
      body: `    return prisma.${nameLower}.create({
      data: {
        ${createFields}
      }
    });`,
    });

    // Update
    methods.push({
      name: 'update',
      params: [
        { name: 'id', type: 'string', required: true },
        { name: 'data', type: `Prisma.${name}UpdateInput`, required: true },
      ],
      returnType: `Promise<${name}>`,
      description: `Update a ${name} by ID`,
      body: `    return prisma.${nameLower}.update({ where: { id }, data });`,
    });

    // Delete
    methods.push({
      name: 'delete',
      params: [{ name: 'id', type: 'string', required: true }],
      returnType: `Promise<${name}>`,
      description: `Delete a ${name} by ID`,
      body: `    return prisma.${nameLower}.delete({ where: { id } });`,
    });

    // Count
    methods.push({
      name: 'count',
      params: [{ name: 'where', type: `Prisma.${name}WhereInput`, required: false }],
      returnType: 'Promise<number>',
      description: `Count ${name} records`,
      body: `    return prisma.${nameLower}.count({ where });`,
    });

    return methods;
  }

  private generateValidations(models: SchemaModel[]): ValidationRule[] {
    const rules: ValidationRule[] = [];

    for (const model of models) {
      for (const field of model.fields) {
        if (field.isId || field.name === 'createdAt' || field.name === 'updatedAt') continue;

        if (field.required && field.type === 'String') {
          rules.push({
            field: `${model.name}.${field.name}`,
            rule: 'required',
            message: `${field.name} is required`,
            code: `${model.name.toLowerCase()}_${field.name}_required`,
          });
        }

        if (field.type === 'String' && field.name.includes('email')) {
          rules.push({
            field: `${model.name}.${field.name}`,
            rule: 'email',
            message: 'Invalid email format',
            code: `${model.name.toLowerCase()}_${field.name}_email`,
          });
        }

        if (field.type === 'String' && field.name.includes('phone')) {
          rules.push({
            field: `${model.name}.${field.name}`,
            rule: 'phone',
            message: 'Invalid phone number',
            code: `${model.name.toLowerCase()}_${field.name}_phone`,
          });
        }
      }
    }

    return rules;
  }

  private generateStateSlices(models: SchemaModel[], capabilities: string[]): StateSlice[] {
    const slices: StateSlice[] = [];

    for (const model of models) {
      const slice: StateSlice = {
        name: model.name,
        state: [
          { name: `selected${model.name}`, type: `${model.name} | null`, initialValue: 'null' },
          { name: `${model.name.toLowerCase()}s`, type: `${model.name}[]`, initialValue: '[]' },
          { name: 'loading', type: 'boolean', initialValue: 'false' },
          { name: 'error', type: 'string | null', initialValue: 'null' },
        ],
        actions: [
          {
            name: `set${model.name}`,
            params: [{ name: 'item', type: `${model.name} | null` }],
            body: `      set({ selected${model.name}: item });`,
          },
          {
            name: `fetch${model.name}s`,
            params: [],
            body: `      set({ loading: true, error: null });
      try {
        const res = await fetch('/api/${model.name.toLowerCase()}s');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        set({ ${model.name.toLowerCase()}s: data, loading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false });
      }`,
          },
          {
            name: `create${model.name}`,
            params: [{ name: 'data', type: `Omit<${model.name}, 'id' | 'createdAt' | 'updatedAt'>` }],
            body: `      set({ loading: true });
      try {
        const res = await fetch('/api/${model.name.toLowerCase()}s', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create');
        const created = await res.json();
        set(state => ({ ${model.name.toLowerCase()}s: [...state.${model.name.toLowerCase()}s, created], loading: false }));
        return created;
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false });
        throw err;
      }`,
          },
          {
            name: `update${model.name}`,
            params: [
              { name: 'id', type: 'string' },
              { name: 'data', type: `Partial<Omit<${model.name}, 'id' | 'createdAt' | 'updatedAt'>>` },
            ],
            body: `      set({ loading: true });
      try {
        const res = await fetch(\`/api/${model.name.toLowerCase()}s/\${id}\`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update');
        const updated = await res.json();
        set(state => ({
          ${model.name.toLowerCase()}s: state.${model.name.toLowerCase()}s.map(item => item.id === id ? updated : item),
          loading: false,
        }));
        return updated;
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false });
        throw err;
      }`,
          },
          {
            name: `delete${model.name}`,
            params: [{ name: 'id', type: 'string' }],
            body: `      set({ loading: true });
      try {
        const res = await fetch(\`/api/${model.name.toLowerCase()}s/\${id}\`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        set(state => ({
          ${model.name.toLowerCase()}s: state.${model.name.toLowerCase()}s.filter(item => item.id !== id),
          loading: false,
        }));
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false });
        throw err;
      }`,
          },
        ],
      };

      slices.push(slice);
    }

    return slices;
  }

  private generateServerActions(models: SchemaModel[]): ServerAction[] {
    const actions: ServerAction[] = [];

    for (const model of models) {
      const nameLower = model.name.toLowerCase();

      // Create action
      actions.push({
        name: `create${model.name}`,
        modelName: model.name,
        operation: 'create',
        params: model.fields
          .filter(f => !f.isId && f.name !== 'createdAt' && f.name !== 'updatedAt')
          .map(f => ({ name: f.name, type: this.mapToTSType(f.type), required: f.required })),
        returnType: `Promise<${model.name}>`,
        body: `'use server';
import { prisma } from '@/lib/db';

export async function create${model.name}(data: { ${model.fields
          .filter(f => !f.isId && f.name !== 'createdAt' && f.name !== 'updatedAt')
          .map(f => `${f.name}${f.required ? '' : '?'}: ${this.mapToTSType(f.type)}`)
          .join('; ')} }) {
  return prisma.${nameLower}.create({ data });
}`,
      });

      // List action
      actions.push({
        name: `list${model.name}s`,
        modelName: model.name,
        operation: 'list',
        params: [],
        returnType: `Promise<${model.name}[]>`,
        body: `'use server';
import { prisma } from '@/lib/db';

export async function list${model.name}s() {
  return prisma.${nameLower}.findMany({ orderBy: { createdAt: 'desc' } });
}`,
      });

      // Delete action
      actions.push({
        name: `delete${model.name}`,
        modelName: model.name,
        operation: 'delete',
        params: [{ name: 'id', type: 'string', required: true }],
        returnType: `Promise<void>`,
        body: `'use server';
import { prisma } from '@/lib/db';

export async function delete${model.name}(id: string) {
  return prisma.${nameLower}.delete({ where: { id } });
}`,
      });
    }

    return actions;
  }

  private generateServiceFile(service: ServiceClass): string {
    const lines: string[] = [];

    lines.push(`import { prisma } from '@/lib/db';`);
    lines.push(`import type { Prisma, ${service.modelName} } from '@prisma/client';`);
    lines.push('');
    lines.push(`/** ${service.description} */`);
    lines.push(`export class ${service.name} {`);

    for (const method of service.methods) {
      const params = method.params.map(p => `${p.name}${p.required ? '' : '?'}: ${p.type}`).join(', ');
      lines.push(`  /** ${method.description} */`);
      lines.push(`  static async ${method.name}(${params}): ${method.returnType} {`);
      lines.push(method.body);
      lines.push('  }');
      lines.push('');
    }

    lines.push('}');
    return lines.join('\n');
  }

  private generateValidationsFile(rules: ValidationRule[], models: SchemaModel[]): string {
    const lines: string[] = [];

    lines.push('/** Auto-generated validation rules — Stage 2 */');
    lines.push('');

    for (const model of models) {
      const modelRules = rules.filter(r => r.field.startsWith(model.name + '.'));
      if (modelRules.length === 0) continue;

      lines.push(`export function validate${model.name}(data: Record<string, unknown>): string[] {`);
      lines.push('  const errors: string[] = [];');
      for (const rule of modelRules) {
        const field = rule.field.split('.')[1];
        if (rule.rule === 'required') {
          lines.push(`  if (!data['${field}']) errors.push('${rule.message}');`);
        } else if (rule.rule === 'email') {
          lines.push(`  if (data['${field}'] && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data['${field}'] as string)) errors.push('${rule.message}');`);
        }
      }
      lines.push('  return errors;');
      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateStateSliceFile(slice: StateSlice): string {
    const lines: string[] = [];

    lines.push(`import { create } from 'zustand';`);
    lines.push('');

    // State interface
    lines.push(`interface ${slice.name}State {`);
    for (const state of slice.state) {
      lines.push(`  ${state.name}: ${state.type};`);
    }
    for (const action of slice.actions) {
      const params = action.params.map(p => `${p.name}: ${p.type}`).join(', ');
      lines.push(`  ${action.name}: (${params}) => ${action.body.includes('return') ? 'Promise<any>' : 'void'};`);
    }
    lines.push('}');
    lines.push('');

    // Store implementation
    lines.push(`export const use${slice.name}Store = create<${slice.name}State>((set, get) => ({`);

    // Initial state
    for (const state of slice.state) {
      lines.push(`  ${state.name}: ${state.initialValue},`);
    }

    // Actions
    for (const action of slice.actions) {
      const params = action.params.map(p => `${p.name}: ${p.type}`).join(', ');
      lines.push(`  ${action.name}: async (${params}) => {`);
      lines.push(action.body);
      lines.push('  },');
    }

    lines.push('}));');
    return lines.join('\n');
  }

  private generateServerActionFile(action: ServerAction): string {
    return action.body;
  }

  private mapToTSType(type: string): string {
    switch (type.toLowerCase()) {
      case 'string': return 'string';
      case 'number':
      case 'integer':
      case 'int':
      case 'decimal':
      case 'float': return 'number';
      case 'boolean':
      case 'bool': return 'boolean';
      case 'date':
      case 'datetime': return 'Date';
      case 'json': return 'Record<string, unknown>';
      default: return 'string';
    }
  }
}
