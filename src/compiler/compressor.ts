import { CompilationError, CompressedError } from '../types/index.js';

export class ErrorCompressor {
  public static compress(errors: CompilationError[]): CompressedError[] {
    return errors.map((err) => {
      const cleanedMessage = err.message
        .replace(/["']/g, '')
        // @ts-ignore — regex s flag works at runtime
        .replace(/is not assignable to type.*/gs, 'type mismatch')
        // @ts-ignore — regex s flag works at runtime
        .replace(/Property.*does not exist on type.*/gs, 'property missing')
        .replace(/Type\s+\S+\s+is not assignable to type\s+\S+/g, 'assignment type mismatch')
        .trim();

      return {
        file: err.file,
        line: err.line,
        code: err.code,
        message: cleanedMessage.length > 120 ? `${cleanedMessage.slice(0, 117)}...` : cleanedMessage
      };
    });
  }
}