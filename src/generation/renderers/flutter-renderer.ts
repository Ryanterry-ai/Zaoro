/**
 * FlutterRenderer — translates ComponentSpecs into Flutter/Dart code.
 *
 * Generates Material Design 3 compatible Flutter widgets.
 * Same ApplicationSpec → Flutter mobile app.
 *
 * Usage:
 *   import { FlutterRenderer } from './flutter-renderer.js';
 *   registerRenderer(new FlutterRenderer());
 */

import type {
  ComponentSpec,
  PageSpec,
  ApplicationSpec,
} from '../../bos/schemas/blueprint/execution-blueprint.schema.js';
import type {
  Renderer,
  RenderContext,
  RenderedFile,
  RenderResult,
} from './renderer.js';
import { stageLogger } from '../../core/debug-logger.js';

const log = stageLogger('render');

export class FlutterRenderer implements Renderer {
  readonly platform = 'flutter';
  readonly componentExtension = '.dart';
  readonly pageExtension = '.dart';

  renderComponent(spec: ComponentSpec, _context: RenderContext): RenderedFile {
    log.debug('Rendering Flutter component', { type: spec.type });
    const componentName = spec.type;
    const code = this.generateComponentCode(spec);
    return {
      path: `lib/widgets/${componentName}.dart`,
      content: code,
      type: 'component',
    };
  }

  renderPage(spec: PageSpec, _context: RenderContext): RenderedFile[] {
    const files: RenderedFile[] = [];
    const pageName = spec.path === '/' ? 'Home' : this.toPascalCase(spec.path);

    // Unique widget imports
    const uniqueComponents = Array.from(new Map(spec.components.map(c => [c.type, c])).values());
    const widgetImports = uniqueComponents
      .map(c => `import '../widgets/${c.type}.dart';`)
      .join('\n');

    const widgetCreations = spec.components
      .map(c => `          ${c.type}(),`)
      .join('\n');

    const pageCode = `import 'package:flutter/material.dart';
${widgetImports}

class ${pageName}Page extends StatelessWidget {
  const ${pageName}Page({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${spec.name}'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
${widgetCreations}
          ],
        ),
      ),
    );
  }
}
`;

    files.push({
      path: `lib/pages/${this.toSnakeCase(pageName)}_page.dart`,
      content: pageCode,
      type: 'page',
    });

    return files;
  }

  renderApplication(spec: ApplicationSpec, _context: RenderContext): RenderResult {
    log.info('Rendering Flutter application', {
      pages: spec.pages.length,
      appName: spec.appName,
    });

    const t = Date.now();
    const files: RenderedFile[] = [];
    const warnings: string[] = [];

    // Generate components
    const generatedComponents = new Set<string>();
    for (const page of spec.pages) {
      for (const component of page.components) {
        if (!generatedComponents.has(component.type)) {
          generatedComponents.add(component.type);
          files.push(this.renderComponent(component, _context));
        }
      }
    }

    // Generate pages
    for (const page of spec.pages) {
      files.push(...this.renderPage(page, _context));
    }

    // Generate layout (main.dart, router, theme)
    files.push(...this.renderLayout(spec, _context));

    log.info('Flutter application rendered', {
      files: files.length,
      components: generatedComponents.size,
      duration: Date.now() - t,
    });

    return { files, warnings };
  }

  renderLayout(spec: ApplicationSpec, _context: RenderContext): RenderedFile[] {
    const files: RenderedFile[] = [];

    // Page routes for named navigation
    const pageRoutes = spec.pages
      .filter(p => p.type !== 'auth')
      .map(p => {
        const routeName = p.path === '/' ? '/' : p.path;
        const pageClass = (p.path === '/' ? 'Home' : this.toPascalCase(p.path)) + 'Page';
        return `    '${routeName}': (context) => const ${pageClass}(),`;
      })
      .join('\n');

    // Nav items for drawer/bottom nav
    const navItems = spec.pages
      .filter(p => p.type !== 'auth' && p.type !== 'detail')
      .map(p => {
        const pageName = p.path === '/' ? 'Home' : this.toPascalCase(p.path);
        return `    NavigationDestination(
      icon: Icon(Icons.${this.getNavIcon(p.path)}),
      label: '${p.name}',
    ),`;
      })
      .join('\n');

    // Page list for indexed navigation
    const navPages = spec.pages
      .filter(p => p.type !== 'auth' && p.type !== 'detail')
      .map(p => {
        const pageClass = (p.path === '/' ? 'Home' : this.toPascalCase(p.path)) + 'Page';
        return `      const ${pageClass}`;
      })
      .join('\n');

    // Main app file
    const mainCode = `import 'package:flutter/material.dart';
${spec.pages.map(p => {
      const pageClass = (p.path === '/' ? 'Home' : this.toPascalCase(p.path)) + 'Page';
      return `import 'pages/${this.toSnakeCase(pageClass.replace('Page', ''))}_page.dart';`;
    }).join('\n')}

void main() {
  runApp(const ${this.toPascalCase(spec.appName)}App());
}

class ${this.toPascalCase(spec.appName)}App extends StatelessWidget {
  const ${this.toPascalCase(spec.appName)}App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${spec.appName}',
      theme: ThemeData(
        colorSchemeSeed: Colors.blue,
        useMaterial3: true,
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData(
        colorSchemeSeed: Colors.blue,
        useMaterial3: true,
        brightness: Brightness.dark,
      ),
      themeMode: ThemeMode.system,
      home: const NavigationScreen(),
    );
  }
}

class NavigationScreen extends StatefulWidget {
  const NavigationScreen({super.key});

  @override
  State<NavigationScreen> createState() => _NavigationScreenState();
}

class _NavigationScreenState extends State<NavigationScreen> {
  int _selectedIndex = 0;

  final List<Widget> _pages = [
${navPages}
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        destinations: [
${navItems}
        ],
      ),
    );
  }
}
`;

    files.push({
      path: 'lib/main.dart',
      content: mainCode,
      type: 'layout',
    });

    // Theme constants
    const themeCode = `import 'package:flutter/material.dart';

class AppColors {
  static const background = Color(0xFF09090B);
  static const surface = Color(0xFF18181B);
  static const border = Color(0xFF27272A);
  static const text = Color(0xFAFAFAFA);
  static const textMuted = Color(0xFFA1A1AA);
  static const primary = Color(0xFF22C55E);
  static const primaryHover = Color(0xFF16A34A);
  static const danger = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
}

class AppSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
}

class AppRadius {
  static const double sm = 6.0;
  static const double md = 8.0;
  static const double lg = 12.0;
  static const double full = 9999.0;
}
`;

    files.push({
      path: 'lib/theme/app_theme.dart',
      content: themeCode,
      type: 'style',
    });

    // pubspec.yaml
    const pubspec = `name: ${this.toSnakeCase(spec.appName)}
description: Generated Flutter application
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.6

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1

flutter:
  uses-material-design: true
`;

    files.push({
      path: 'pubspec.yaml',
      content: pubspec,
      type: 'config',
    });

    return files;
  }

  // ─── Code Generation Helpers ───────────────────────────────────────────────

  private generateComponentCode(spec: ComponentSpec): string {
    const componentName = spec.type;

    // Build constructor parameters
    const constructorParams = this.generateConstructorParams(spec);

    // Build widget body
    const body = this.generateWidgetBody(spec);

    return `import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ${componentName} extends StatelessWidget {
${constructorParams}

  const ${componentName}({super.key${this.hasProps(spec) ? ', ' + this.getConstructorNamedParams(spec) : ''}});

  @override
  Widget build(BuildContext context) {
${body}
  }
}
`;
  }

  private generateConstructorParams(spec: ComponentSpec): string {
    if (!this.hasProps(spec)) return '';

    const lines: string[] = [];
    for (const [key, _value] of Object.entries(spec.content ?? {})) {
      lines.push(`  final String ${key};`);
    }

    if ((spec.items?.length ?? 0) > 0) {
      lines.push(`  final List<Map<String, String>> items;`);
    }

    if ((spec.tiers?.length ?? 0) > 0) {
      lines.push(`  final List<Map<String, dynamic>> tiers;`);
    }

    return lines.join('\n');
  }

  private getConstructorNamedParams(spec: ComponentSpec): string {
    if (!this.hasProps(spec)) return '';

    const params: string[] = [];
    for (const key of Object.keys(spec.content ?? {})) {
      params.push(`this.${key} = ''`);
    }

    if ((spec.items?.length ?? 0) > 0) {
      params.push('this.items = const []');
    }

    if ((spec.tiers?.length ?? 0) > 0) {
      params.push('this.tiers = const []');
    }

    return params.join(', ');
  }

  private generateWidgetBody(spec: ComponentSpec): string {
    const typeName = spec.type;

    if (typeName === 'HeroBanner') {
      return `    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: const BoxDecoration(
        color: AppColors.background,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            \${props.title ?? 'Welcome'},
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
              color: AppColors.text,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            \${props.subtitle ?? ''},
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: AppColors.textMuted,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.lg),
          FilledButton(
            onPressed: () {},
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xl,
                vertical: AppSpacing.md,
              ),
            ),
            child: Text(props.ctaText ?? 'Get Started'),
          ),
        ],
      ),
    );`;
    }

    if (typeName === 'ProductGrid' || typeName === 'CategoryGrid') {
      return `    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      color: AppColors.background,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${spec.content?.title ?? typeName}',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: AppColors.text,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: AppSpacing.sm,
              mainAxisSpacing: AppSpacing.sm,
              childAspectRatio: 0.75,
            ),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              return Card(
                color: AppColors.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(AppRadius.md),
                          ),
                        ),
                        child: const Center(
                          child: Icon(Icons.image, color: AppColors.textMuted, size: 48),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item['title'] ?? '',
                            style: const TextStyle(
                              color: AppColors.text,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item['description'] ?? '',
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 12,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );`;
    }

    if (typeName === 'CTASection') {
      return `    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: const BoxDecoration(
        color: AppColors.surface,
      ),
      child: Column(
        children: [
          Text(
            \${props.title ?? 'Ready to get started?'},
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: AppColors.text,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            \${props.subtitle ?? ''},
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textMuted,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.lg),
          FilledButton(
            onPressed: () {},
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xl,
                vertical: AppSpacing.md,
              ),
            ),
            child: Text(props.ctaText ?? 'Contact Us'),
          ),
        ],
      ),
    );`;
    }

    if (typeName === 'Testimonials') {
      return `    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      color: AppColors.background,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            \${props.title ?? 'Testimonials'},
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: AppColors.text,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            height: 200,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.md),
              itemBuilder: (context, index) {
                final item = items[index];
                return SizedBox(
                  width: 300,
                  child: Card(
                    color: AppColors.surface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      side: const BorderSide(color: AppColors.border),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item['title'] ?? '',
                            style: const TextStyle(
                              color: AppColors.text,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Expanded(
                            child: Text(
                              item['description'] ?? '',
                              style: const TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );`;
    }

    // Default fallback component
    return `    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      color: AppColors.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${spec.content?.title ?? typeName}',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: AppColors.text,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (${JSON.stringify(spec.content?.description ?? '')}.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              '${spec.content?.description ?? ''}',
              style: const TextStyle(color: AppColors.textMuted),
            ),
          ],
        ],
      ),
    );`;
  }

  private hasProps(spec: ComponentSpec): boolean {
    return (
      Object.keys(spec.content ?? {}).length > 0 ||
      (spec.items?.length ?? 0) > 0 ||
      (spec.tiers?.length ?? 0) > 0
    );
  }

  private getNavIcon(path: string): String {
    const iconMap: Record<string, string> = {
      '/': 'home',
      '/shop': 'store',
      '/cart': 'shopping_cart',
      '/about': 'info',
      '/contact': 'mail',
      '/admin': 'admin_panel_settings',
    };
    return iconMap[path] ?? 'circle';
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_');
  }
}
