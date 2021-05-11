import ts from 'typescript';
import transformer, { TransformerOptions } from './transformer';
export { transformer };

const defaultCompilerOptions = {
  strict: false,
  noEmitOnError: true,
  suppressImplicitAnyIndexErrors: true,
  esModuleInterop: true,
  target: ts.ScriptTarget.ES5,
};

export default function compile(
  filePaths: string[],
  compilerOptions?: ts.CompilerOptions | string,
  transformerOptions?: TransformerOptions,
  writeFileCallback?: ts.WriteFileCallback
): void {
  let options: ts.CompilerOptions;

  if (typeof compilerOptions !== 'string' && typeof compilerOptions !== 'undefined') {
    options = compilerOptions;
  } else {
    let configFileName: string | undefined = typeof compilerOptions === 'string' ? compilerOptions : 'tsconfig.json';

    configFileName = ts.findConfigFile('./', ts.sys.fileExists, configFileName);

    if (configFileName) {
      const configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
      options = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './').options;
    } else {
      options = defaultCompilerOptions;
    }
  }

  options.noEmit = false;

  const program = ts.createProgram(filePaths, options);

  const transformers: ts.CustomTransformers = {
    before: [transformer(program, transformerOptions)],
    after: [],
  };
  const { emitSkipped, diagnostics } = program.emit(undefined, writeFileCallback, undefined, false, transformers);
  if (emitSkipped) {
    throw new Error(diagnostics.map(diagnostic => diagnostic.messageText).join('\n'));
  }
}
