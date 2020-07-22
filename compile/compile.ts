import ts from 'typescript';
import transformer from '../transformer';

export default function compile(filePaths: string[], target = ts.ScriptTarget.ES5, writeFileCallback?: ts.WriteFileCallback) {
  const program = ts.createProgram(filePaths, {
    strict: false,
    noEmitOnError: true,
    suppressImplicitAnyIndexErrors: true,
    esModuleInterop: true,
    target
  });
  const transformers: ts.CustomTransformers = {
    before: [transformer(program)],
    after: []
  };
  const { emitSkipped, diagnostics } = program.emit(undefined, writeFileCallback, undefined, false, transformers);

  if (emitSkipped) {
    throw new Error(diagnostics.map(diagnostic => diagnostic.messageText).join('\n'));
  }
}
