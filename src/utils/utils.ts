import ts from 'typescript';

export function importSpecifierHandler(
  node: ts.Declaration | undefined,
  program: ts.Program
): ts.Declaration | undefined {
  if (node && ts.isImportSpecifier(node)) {
    const checker = program.getTypeChecker();
    const symbol = checker.getSymbolAtLocation(node.name);
    if (symbol) {
      const type = checker.getDeclaredTypeOfSymbol(symbol);
      return type.symbol.declarations[0];
    }
  }
  return node;
}

export function getDeclarationsFromTypeReferenceNode(
  node: ts.TypeReferenceNode,
  program: ts.Program
): ts.Declaration | undefined {
  const typeReferenceIdentifier = node.typeName;
  const typeChecker = program.getTypeChecker();
  const symbol = typeChecker.getSymbolAtLocation(typeReferenceIdentifier);
  const declarations = symbol?.declarations;
  if (declarations && declarations.length > 0) {
    return declarations[0];
  }
  return;
}
