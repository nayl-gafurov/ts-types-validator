import ts from 'typescript';

export const num = (val: number | string): ts.NumericLiteral => ts.createNumericLiteral(val.toString());

export const str = (val: number | string): ts.StringLiteral => ts.createStringLiteral(val.toString());

export const constVar = (name: string, expression?: ts.Expression, exportModifier = false): ts.VariableStatement =>
  ts.createVariableStatement(
    exportModifier ? [ts.createModifier(ts.SyntaxKind.ExportKeyword)] : undefined,
    ts.createVariableDeclarationList(
      [ts.createVariableDeclaration(ts.createIdentifier(name), undefined, expression)],
      ts.NodeFlags.Const
    )
  );

export const letVar = (name: string, expression?: ts.Expression, exportModifier = false): ts.VariableStatement =>
  ts.createVariableStatement(
    exportModifier ? [ts.createModifier(ts.SyntaxKind.ExportKeyword)] : undefined,
    ts.createVariableDeclarationList(
      [ts.createVariableDeclaration(ts.createIdentifier(name), undefined, expression)],
      ts.NodeFlags.Let
    )
  );

export const _if = (
  expression: ts.Expression,
  thenStatement: ts.Statement | ts.Statement[],
  elseStatement?: ts.Statement | ts.Statement[]
): ts.IfStatement =>
  ts.createIf(
    expression,
    Array.isArray(thenStatement) ? ts.createBlock(thenStatement, true) : ts.createBlock([thenStatement], true),
    elseStatement
      ? Array.isArray(elseStatement)
        ? ts.createBlock(elseStatement, true)
        : ts.createBlock([elseStatement], true)
      : undefined
  );

export const not = (expression: ts.Expression | string): ts.PrefixUnaryExpression =>
  ts.createPrefix(
    ts.SyntaxKind.ExclamationToken,
    typeof expression === 'string' ? ts.createIdentifier(expression) : expression
  );

export const consoleWarn = (msg: ts.Expression[] | ts.Expression): ts.ExpressionStatement =>
  ts.createExpressionStatement(
    ts.createCall(
      ts.createPropertyAccess(ts.createIdentifier('console'), ts.createIdentifier('warn')),
      undefined,
      Array.isArray(msg) ? msg : [msg]
    )
  );

export const arrowFunc = (body: ts.Statement[], args?: string[] | string): ts.ArrowFunction => {
  const nArgs = args ? (Array.isArray(args) ? args : [args]) : [];

  return ts.createArrowFunction(
    undefined,
    undefined,
    nArgs.map(arg =>
      ts.createParameter(undefined, undefined, undefined, ts.createIdentifier(arg), undefined, undefined, undefined)
    ),
    undefined,
    ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    ts.createBlock(body, true)
  );
};

export const func = (
  name: string,
  body: ts.Statement[],
  args?: string[] | string,
  exportModifier = false
): ts.FunctionDeclaration => {
  const nArgs = args ? (Array.isArray(args) ? args : [args]) : [];

  return ts.createFunctionDeclaration(
    undefined,
    exportModifier ? [ts.createModifier(ts.SyntaxKind.ExportKeyword)] : undefined,
    undefined,
    ts.createIdentifier(name),
    undefined,
    nArgs.map(arg =>
      ts.createParameter(undefined, undefined, undefined, ts.createIdentifier(arg), undefined, undefined, undefined)
    ),
    undefined,
    ts.createBlock(body, true)
  );
};

export const call = (
  expression: ts.Expression | string,
  args?: Array<ts.Expression | string> | ts.Expression | string
): ts.CallExpression => {
  return ts.createCall(
    typeof expression === 'string' ? ts.createIdentifier(expression) : expression,
    undefined,
    args
      ? Array.isArray(args)
        ? args.map(arg => (typeof arg === 'string' ? ts.createStringLiteral(arg) : arg))
        : [typeof args === 'string' ? ts.createStringLiteral(args) : args]
      : []
  );
};

export const propAccess = (
  expression: ts.Expression | string,
  name: string | ts.Identifier
): ts.PropertyAccessExpression => ts.createPropertyAccess(wrapToIdentifier(expression), name);

export const chainAccess = (chain: Array<string | ts.Identifier>): ts.PropertyAccessExpression => {
  const lastPoint = chain.pop() as string | ts.Identifier;
  return propAccess(chainAccess(chain), lastPoint);
};

export const assignValue = (
  firstBinary: string | ts.Expression,
  secondBinary: string | ts.Expression
): ts.BinaryExpression =>
  ts.createBinary(
    wrapToIdentifier(firstBinary),
    ts.createToken(ts.SyntaxKind.EqualsToken),
    wrapToIdentifier(secondBinary)
  );

export const identifier = (name: string): ts.Identifier => ts.createIdentifier(name);

export const wrapToIdentifier = (expression: string | ts.Expression): ts.Expression =>
  typeof expression === 'string' ? identifier(expression) : expression;
