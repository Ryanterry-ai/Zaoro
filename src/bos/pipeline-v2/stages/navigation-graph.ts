import type { StageInput, WorkflowGraph, EntityGraph, NavigationGraph, PageDef, NavItemDef, LayoutDef } from '../stages.js';

export function runNavigationGraphStage(input: StageInput, workflowGraph: WorkflowGraph, entityGraph: EntityGraph): NavigationGraph {
  const pages = new Map<string, PageDef>();
  const navItems: NavItemDef[] = [];

  for (const decision of input.decisions) {
    if (decision.action.type === 'add_page') {
      const path = decision.action.path;
      if (!pages.has(path)) {
        const pageType = inferPageType(path);
        pages.set(path, {
          path,
          name: decision.action.name,
          type: pageType,
          sections: [...decision.action.sections],
          entities: [],
          workflows: [],
        });
      } else {
        const existing = pages.get(path)!;
        for (const s of decision.action.sections) {
          if (!existing.sections.includes(s)) existing.sections.push(s);
        }
      }
    }
  }

  // Map entity workflows to listing/detail pages
  for (const entity of entityGraph.entities) {
    if (entity.name === 'User') continue;
    const listPath = `/${entity.slug}s`;
    if (!pages.has(listPath)) {
      pages.set(listPath, {
        path: listPath,
        name: `${entity.name}s`,
        type: 'listing',
        sections: inferListSections(entity.name),
        entities: [entity.name],
        workflows: entity.workflows,
      });
    }
    const detailPath = `/${entity.slug}s/:id`;
    if (!pages.has(detailPath)) {
      pages.set(detailPath, {
        path: detailPath,
        name: `${entity.name} Detail`,
        type: 'detail',
        sections: inferDetailSections(entity.name),
        entities: [entity.name],
        workflows: entity.workflows,
      });
    }
  }

  // Ensure homepage exists
  if (!pages.has('/')) {
    pages.set('/', {
      path: '/',
      name: 'Home',
      type: 'home',
      sections: ['hero', 'features', 'about', 'cta'],
      entities: [],
      workflows: [],
    });
  }

  // Ensure auth pages exist if auth capability present
  const hasAuth = input.decisions.some(d => d.action.type === 'add_capability' && d.action.name === 'Authentication');
  if (hasAuth) {
    if (!pages.has('/login')) {
      pages.set('/login', { path: '/login', name: 'Login', type: 'auth', sections: ['auth-form'], entities: ['User'], workflows: [] });
    }
    if (!pages.has('/register')) {
      pages.set('/register', { path: '/register', name: 'Register', type: 'auth', sections: ['auth-form'], entities: ['User'], workflows: [] });
    }
  }

  // Build navigation from pages
  const sortedPages = Array.from(pages.values()).sort((a, b) => {
    const order = { home: 0, static: 1, listing: 2, detail: 3, auth: 4, dashboard: 5, page: 6 };
    return (order[a.type] ?? 99) - (order[b.type] ?? 99);
  });

  for (const page of sortedPages) {
    if (page.type === 'home' || page.type === 'auth') continue;
    if (page.type === 'detail') continue;
    const icon = iconForType(page.type);
    navItems.push({
      label: page.name,
      href: page.path,
      ...(icon ? { icon } : {}),
    });
  }

  const layouts: LayoutDef[] = [
    { id: 'default', areas: ['header', 'main', 'footer'], components: ['Header', 'Footer'] },
  ];

  if (Array.from(pages.values()).some(p => p.type === 'dashboard')) {
    layouts.push({
      id: 'dashboard',
      areas: ['sidebar', 'header', 'main'],
      components: ['Sidebar', 'Header'],
    });
  }

  return {
    pages: sortedPages,
    navItems,
    layouts,
  };
}

function inferPageType(path: string): PageDef['type'] {
  if (path === '/') return 'home';
  if (path.includes('login') || path.includes('register') || path.includes('auth')) return 'auth';
  if (path.includes('dashboard') || path.includes('admin')) return 'dashboard';
  if (path.includes(':id') || path.includes(':slug')) return 'detail';
  return 'page';
}

function inferListSections(entity: string): string[] {
  return ['page-header', `data-table`, `filter-sidebar`];
}

function inferDetailSections(entity: string): string[] {
  return ['page-header', 'profile-section', 'activity-feed'];
}

function iconForType(type: PageDef['type']): string | undefined {
  switch (type) {
    case 'dashboard': return 'LayoutDashboard';
    case 'listing': return 'List';
    case 'static': return 'FileText';
    default: return undefined;
  }
}
