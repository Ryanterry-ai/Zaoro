import * as ts from 'typescript';
import * as path from 'path';
import { CompilationError } from '../types/index.js';

export class TypeScriptAuditor {
  public audit(workspacePath: string): CompilationError[] {
    const configPath = ts.findConfigFile(workspacePath, ts.sys.fileExists, 'tsconfig.json');
    
    if (!configPath) {
      throw new Error(`Compiler configuration not detected at workspace root: ${workspacePath}`);
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
      return [{
        file: 'tsconfig.json',
        line: 0,
        code: 'TS_CONFIG_ERR',
        message: ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')
      }];
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath)
    );

    const compilerHost = ts.createCompilerHost(parsedConfig.options);
    const program = ts.createProgram({
      rootNames: parsedConfig.fileNames,
      options: parsedConfig.options,
      host: compilerHost
    });

    const diagnostics = ts.getPreEmitDiagnostics(program);

    return diagnostics.map((diagnostic) => {
      let relativeFilePath = 'workspace-system';
      let lineNumber = 0;

      if (diagnostic.file) {
        relativeFilePath = path.relative(workspacePath, diagnostic.file.fileName);
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        lineNumber = position.line + 1; 
      }

      return {
        file: relativeFilePath,
        line: lineNumber,
        code: `TS${diagnostic.code}`,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      };
    });
  }
}