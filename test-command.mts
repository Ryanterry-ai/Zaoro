import { parseCommand, commandToIntent, isCommand } from './src/agents/command-parser.js';

const input = '/build-anything Build me a Multi brands e-commerce supplement store for Indian customers';
console.log('=== Command Parser Test ===');
console.log('Input:', input);
console.log('Is command:', isCommand(input));

const command = parseCommand(input);
console.log('\nParsed Command:');
console.log(JSON.stringify(command, null, 2));

const intent = commandToIntent(command);
console.log('\nGenerated Intent:');
console.log(JSON.stringify(intent, null, 2));
