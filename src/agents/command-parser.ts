/**
 * Command Parser — detects slash commands from user input.
 *
 * Supported commands:
 *   /build-anything "prompt"     → generative pipeline
 *   /clone-website <url>         → clone pipeline
 *   /refine "change description" → iterative refinement
 *   /deploy <target>             → deployment
 *   /help                        → show available commands
 *
 * Usage:
 *   const result = parseCommand("/build-anything \"Build me a restaurant website\"");
 *   if (result.command === 'build-anything') { ... }
 */

// ─── Command Types ───────────────────────────────────────────────────────────

export type CommandName = 'build-anything' | 'clone-website' | 'refine' | 'deploy' | 'help' | 'unknown';

export interface ParsedCommand {
  command: CommandName;
  /** Raw input string */
  rawInput: string;
  /** Extracted argument (prompt text, URL, etc.) */
  argument: string;
  /** Parsed options from flags (--option value) */
  options: Record<string, string>;
  /** Whether the command is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

export interface CommandDefinition {
  name: CommandName;
  aliases: string[];
  description: string;
  /** Whether the command requires an argument */
  requiresArgument: boolean;
  /** Expected argument type for validation */
  argumentType: 'prompt' | 'url' | 'text' | 'none';
  /** Examples for help text */
  examples: string[];
}

// ─── Command Definitions ─────────────────────────────────────────────────────

const COMMANDS: CommandDefinition[] = [
  {
    name: 'build-anything',
    aliases: ['build', 'create', 'generate'],
    description: 'Build a complete application from a natural language prompt',
    requiresArgument: true,
    argumentType: 'prompt',
    examples: [
      '/build-anything "Build me a restaurant website with online ordering"',
      '/build-anything Create a SaaS analytics dashboard with user authentication',
      '/build A fitness gym membership platform',
    ],
  },
  {
    name: 'clone-website',
    aliases: ['clone', 'copy', 'replicate'],
    description: 'Clone an existing website and recreate it as a new application',
    requiresArgument: true,
    argumentType: 'url',
    examples: [
      '/clone-website https://example.com',
      '/clone https://stripe.com',
      '/copy https://linear.app',
    ],
  },
  {
    name: 'refine',
    aliases: ['modify', 'update', 'edit', 'change'],
    description: 'Modify the current build without rebuilding from scratch',
    requiresArgument: true,
    argumentType: 'text',
    examples: [
      '/refine Change the hero headline to "Welcome to Our Store"',
      '/modify Add a pricing page with 3 tiers',
      '/update Make the footer dark mode',
    ],
  },
  {
    name: 'deploy',
    aliases: ['ship', 'publish', 'go-live'],
    description: 'Deploy the built application to a hosting platform',
    requiresArgument: false,
    argumentType: 'none',
    examples: [
      '/deploy',
      '/deploy vercel',
      '/ship cloudflare',
      '/publish docker',
    ],
  },
  {
    name: 'help',
    aliases: ['commands', '?'],
    description: 'Show available commands and usage information',
    requiresArgument: false,
    argumentType: 'none',
    examples: ['/help', '/commands', '/?'],
  },
];

// ─── URL Pattern ─────────────────────────────────────────────────────────────

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Parse a user input string into a structured command.
 *
 * Handles:
 *   - Quoted strings: /build-anything "my prompt here"
 *   - Unquoted text: /build-anything my prompt here
 *   - URLs: /clone-website https://example.com
 *   - Flags: /deploy --target vercel --env KEY=VALUE
 *   - Aliases: /build, /create, /ship, etc.
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  // Not a command (no leading /)
  if (!trimmed.startsWith('/')) {
    return {
      command: 'unknown',
      rawInput: input,
      argument: '',
      options: {},
      valid: false,
      error: 'Commands must start with / (e.g., /build-anything "prompt")',
    };
  }

  // Extract command name and rest
  const spaceIndex = trimmed.indexOf(' ');
  const commandPart = (spaceIndex === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIndex)).toLowerCase();
  const rest = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim();

  // Find matching command (exact name or alias)
  const command = findCommand(commandPart);

  if (!command) {
    return {
      command: 'unknown',
      rawInput: input,
      argument: rest,
      options: {},
      valid: false,
      error: `Unknown command: /${commandPart}. Type /help to see available commands.`,
    };
  }

  // Parse options (--key value flags)
  const { text, options } = parseOptions(rest);

  // Extract argument
  const argument = extractArgument(text);

  // Validate
  if (command.requiresArgument && !argument) {
    return {
      command: command.name,
      rawInput: input,
      argument: '',
      options,
      valid: false,
      error: `/${command.name} requires an argument. Example: ${command.examples[0]}`,
    };
  }

  // Validate URL for clone command
  if (command.name === 'clone-website' && argument && !URL_PATTERN.test(argument)) {
    return {
      command: command.name,
      rawInput: input,
      argument,
      options,
      valid: false,
      error: `/${command.name} requires a valid URL. Example: ${command.examples[0]}`,
    };
  }

  return {
    command: command.name,
    rawInput: input,
    argument,
    options,
    valid: true,
  };
}

/**
 * Find a command by name or alias.
 */
function findCommand(name: string): CommandDefinition | undefined {
  return COMMANDS.find(
    c => c.name === name || c.aliases.includes(name),
  );
}

/**
 * Extract the argument from the remaining text.
 * Handles quoted strings and unquoted text.
 */
function extractArgument(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Quoted string: "..." or '...'
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const quote = trimmed[0];
    const endQuote = trimmed.indexOf(quote!, 1);
    if (endQuote !== -1) {
      return trimmed.slice(1, endQuote).trim();
    }
    // No closing quote — take everything after opening quote
    return trimmed.slice(1).trim();
  }

  // URL (take the whole thing)
  if (URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // Unquoted text (take everything until -- flag or end)
  const flagIndex = trimmed.indexOf(' --');
  if (flagIndex !== -1) {
    return trimmed.slice(0, flagIndex).trim();
  }

  return trimmed;
}

/**
 * Parse --key value options from text.
 * Returns the remaining text and extracted options.
 */
function parseOptions(text: string): { text: string; options: Record<string, string> } {
  const options: Record<string, string> = {};
  let remaining = text;

  // Match --key value or --key=value patterns
  const flagRegex = / --([a-zA-Z-]+)(?:[= ]([^\s-][^\s-]*))?/g;
  let match;

  while ((match = flagRegex.exec(text)) !== null) {
    const key = match[1]?.replace(/-/g, '') ?? '';
    const value = match[2] ?? 'true';
    if (key) {
      options[key] = value;
    }
  }

  // Remove flags from remaining text
  remaining = remaining.replace(/ --[^\s]+(?:[= ][^\s-]+)?/g, '').trim();

  return { text: remaining, options };
}

// ─── Public Helpers ──────────────────────────────────────────────────────────

/**
 * Check if input is a command (starts with /).
 */
export function isCommand(input: string): boolean {
  return input.trim().startsWith('/');
}

/**
 * Get all available commands for help display.
 */
export function getAvailableCommands(): CommandDefinition[] {
  return COMMANDS;
}

/**
 * Generate help text for all commands.
 */
export function getHelpText(): string {
  const lines = ['Available commands:', ''];

  for (const cmd of COMMANDS) {
    const aliases = cmd.aliases.length > 0 ? ` (aliases: ${cmd.aliases.join(', ')})` : '';
    lines.push(`  /${cmd.name}${aliases}`);
    lines.push(`    ${cmd.description}`);
    for (const example of cmd.examples) {
      lines.push(`    Example: ${example}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Convert a parsed command to a GenerationIntent.
 */
export function commandToIntent(command: ParsedCommand): {
  type: string;
  prompt?: string;
  targetUrl?: string;
  refinementPrompt?: string;
  deployTarget?: string;
} {
  switch (command.command) {
    case 'build-anything':
      return { type: 'build-website', prompt: command.argument };
    case 'clone-website':
      return { type: 'clone-website', targetUrl: command.argument };
    case 'refine':
      return { type: 'refine', refinementPrompt: command.argument };
    case 'deploy':
      return { type: 'deploy', deployTarget: command.argument || 'vercel' };
    default:
      return { type: 'unknown' };
  }
}
