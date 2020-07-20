import ts from 'typescript';

const interfaceList: Map<string, ts.ArrowFunction> = new Map();

const dataObjName = "data";
const argName = "arg";

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
    return visitNode(file, program, context);
  };
}

function visitNode(node: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile;
function visitNode(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined;
function visitNode(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined {

  if (ts.isFunctionDeclaration(node) && node.modifiers ? node.modifiers.some((mod) => mod.getText() === "declare") : false) {
    return visiterForFunction(node, program)
  }

  return ts.visitEachChild(node, childNode => visitNode(childNode, program, context), context);
}

function visiterForFunction(node: ts.Node, program: ts.Program): ts.Node | undefined {
  if (ts.isFunctionDeclaration(node)) {

    const exportModifier = node.modifiers ? node.modifiers.some((mod) => mod.getText() === "export") : false;
    const typePredicate = node.type;

    if (typePredicate !== undefined && ts.isTypePredicateNode(typePredicate)) {
      const typeParamName = typePredicate.parameterName.getText();
      const name = node.name ? node.name.getText() : "is" + typeParamName;
      const type = typePredicate.type;

      if (type !== undefined && type.kind !== 125) {
        let expression;
        let propsName;
        if (ts.isTypeReferenceNode(type)) {
          const declaration = getDeclarationsFromTypeReferenceNode(type, program);
          if (declaration && ts.isInterfaceDeclaration(declaration)) {
            expression = interfaceDeclarationHandler(declaration, program, true);
            propsName = type.getText();
          }
        }
        if (ts.isTypeLiteralNode(type)) {
          expression = interfaceDeclarationHandler(type, program, ts.createIdentifier(argName));
          propsName = "object";
        }

        if (expression && propsName) {

          const arr = [
            ts.createPropertyAssignment(
              ts.createIdentifier(propsName),
              expression
            )
          ]

          interfaceList.forEach((data, name) => {
            arr.push(
              ts.createPropertyAssignment(
                ts.createIdentifier(name),
                data
              )
            )
          })

          return ts.createFunctionDeclaration(
            undefined,
            exportModifier ? [ts.createModifier(ts.SyntaxKind.ExportKeyword)]: undefined,
            undefined,
            ts.createIdentifier(name),
            undefined,
            [ts.createParameter(
              undefined,
              undefined,
              undefined,
              ts.createIdentifier(typeParamName),
              undefined,
              ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword),
              undefined
            )],
            undefined,
            ts.createBlock(

              [ts.createVariableStatement(
                undefined,
                ts.createVariableDeclarationList(
                  [ts.createVariableDeclaration(
                    ts.createIdentifier(dataObjName),
                    undefined,
                    ts.createObjectLiteral(
                      arr,
                      true
                    )

                  )],
                  ts.NodeFlags.Const
                )
              ),
              ts.createReturn(ts.createCall(
                ts.createPropertyAccess(
                  ts.createIdentifier(dataObjName),
                  ts.createIdentifier(propsName)
                ),
                undefined,
                [ts.createIdentifier(typeParamName)]
              ))
              ],
              true

            )
          )
        }
      }
    }
  }
  return;
}

function getDeclarationsFromTypeReferenceNode(node: ts.TypeReferenceNode, program: ts.Program) {
  const typeReferenceIdentifier = node.typeName;
  const typeChecker = program.getTypeChecker();
  const symbol = typeChecker.getSymbolAtLocation(typeReferenceIdentifier);
  const declarations = symbol?.declarations;
  if (declarations && declarations.length > 0) {
    return declarations[0];
  }
  return;
}

function typeReferenceHandler(node: ts.TypeReferenceNode, program: ts.Program, objIdentifier: ts.PropertyAccessExpression | ts.Identifier): ts.Expression {
  const declaration = getDeclarationsFromTypeReferenceNode(node, program);

  if (declaration) {
    if (ts.isInterfaceDeclaration(declaration)) {
      return interfaceDeclarationHandler(declaration, program, objIdentifier);
    } else if (ts.isClassDeclaration(declaration)) {
      return classDeclarationHandler(declaration, program)
    } else if (ts.isTypeAliasDeclaration(declaration)) {
      return typeAliasDeclarationHandler(declaration, program, objIdentifier)
    }
  }
  console.log(declaration)
  return ts.createLiteral("undefined")
}

function classDeclarationHandler(node: ts.ClassDeclaration, program: ts.Program) {
  const name = node.name as ts.Identifier
  return ts.createBinary(
    ts.createIdentifier("obj"),
    ts.createToken(ts.SyntaxKind.InstanceOfKeyword),
    ts.createIdentifier(name.getText())
  )
}

function interfaceDeclarationHandler(node: ts.InterfaceDeclaration, program: ts.Program, withProps: true | ts.PropertyAccessExpression | ts.Identifier): ts.Expression;
function interfaceDeclarationHandler(node: ts.TypeLiteralNode, program: ts.Program, withProps: ts.Identifier | ts.PropertyAccessExpression): ts.Expression;
function interfaceDeclarationHandler(node: ts.InterfaceDeclaration | ts.TypeLiteralNode, program: ts.Program, withProps: true | ts.Identifier | ts.PropertyAccessExpression ): ts.Expression {

  let objPropsAccess = typeof withProps === "boolean" ? ts.createIdentifier(argName) : withProps

  const getProps = (objPropsAccess: ts.Identifier | ts.PropertyAccessExpression) => {

    const props: Array<ts.ArrowFunction> = [];
    (node.members).forEach((propertySignature) => {
      if (ts.isPropertySignature(propertySignature)) {
        const expression = propertySignatureHandler(propertySignature, program, objPropsAccess);
        if (expression) {
          props.push(expression)
        }
      }
    });

    return props
  }

  const call =(objPropsAccess: ts.Identifier | ts.PropertyAccessExpression)=> ts.createCall(
    ts.createPropertyAccess(
      ts.createArrayLiteral(getProps(objPropsAccess), true),
      ts.createIdentifier("every")
    ),
    undefined,
    [ts.createArrowFunction(
      undefined,
      undefined,
      [ts.createParameter(
        undefined,
        undefined,
        undefined,
        ts.createIdentifier("item"),
        undefined,
        undefined,
        undefined
      )],
      undefined,
      ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      ts.createCall(
        ts.createIdentifier("item"),
        undefined,
        []
      )
    )]
  )

  const func = (objPropsAccess: ts.Identifier | ts.PropertyAccessExpression)=>ts.createArrowFunction(
    undefined,
    undefined,
    [ts.createParameter(
      undefined,
      undefined,
      undefined,
      ts.createIdentifier(argName),
      undefined,
      undefined,
      undefined
    )
  ],
    undefined,
    ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    call(objPropsAccess)
  )

  if (ts.isTypeLiteralNode(node)) {
    return call(withProps as ts.Identifier | ts.PropertyAccessExpression)
  }
  if (typeof withProps === "boolean" && withProps) {
    return func(ts.createIdentifier(argName))
  } else {
    interfaceList.set(node.name.getText(), func(ts.createIdentifier(argName)))
    return ts.createCall(
      ts.createPropertyAccess(
        ts.createIdentifier(dataObjName),
        ts.createIdentifier(node.name.getText())
      ),
      undefined,
      [withProps]
    )
  }

}

function propertySignatureHandler(node: ts.PropertySignature | ts.ParameterDeclaration, program: ts.Program, objIdentifier: ts.Identifier | ts.PropertyAccessExpression): ts.ArrowFunction | undefined {
  if (node.type) {

    const access = ts.createPropertyAccess(
      objIdentifier,
      ts.createIdentifier(node.name.getText())
    )
    const expression = typeHandler(node.type, program, access);


    const getFullAccessName = (access: ts.PropertyAccessExpression, result: string = ""): string => {
      if (result.length > 0) {
        result = `${access.name.text}.${result}`;
      } else {
        result = access.name.text;
      }
      if (ts.isPropertyAccessExpression(access.expression)) {
        return getFullAccessName(access.expression, result);
      }
      return result
    }

    return ts.createArrowFunction(
      undefined,
      undefined,
      [],
      undefined,
      ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      ts.createBlock(

        [
          ts.createVariableStatement(
            undefined,
            ts.createVariableDeclarationList(
              [ts.createVariableDeclaration(
                ts.createIdentifier("result"),
                undefined,
                ts.createBinary(
                  ts.createBinary(
                    ts.createStringLiteral(access.name.text),
                    ts.createToken(ts.SyntaxKind.InKeyword),
                    access.expression
                  ),
                  ts.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
                  expression
                )
              )],
              ts.NodeFlags.Const
            )
          ),

          ts.createIf(
            ts.createPrefix(
              ts.SyntaxKind.ExclamationToken,
              ts.createIdentifier("result")
            ),
            ts.createBlock(
              [ts.createExpressionStatement(ts.createCall(
                ts.createPropertyAccess(
                  ts.createIdentifier("console"),
                  ts.createIdentifier("warn")
                ),
                undefined,
                [ts.createStringLiteral(getFullAccessName(access) + " MUST be : " + node.type.getText())]
              ))],
              true
            ),
            undefined
          ),
          ts.createReturn(ts.createIdentifier("result"))
        ]
        ,
        true
      )
    );
  } else {
    return
  }
}

function arrayReferenceNodeHandler(node: ts.TypeReferenceNode, program: ts.Program, objIdentifier: ts.PropertyAccessExpression | ts.Identifier) {
  const args = node.typeArguments as ts.NodeArray<ts.TypeNode>


  return ts.createBinary(
    ts.createCall(
      ts.createPropertyAccess(
        ts.createIdentifier("Array"),
        ts.createIdentifier("isArray")
      ),
      undefined,
      [objIdentifier]
    ),
    ts.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
    ts.createCall(
      ts.createPropertyAccess(
        objIdentifier,
        ts.createIdentifier("every")
      ),
      undefined,
      [
        ts.createArrowFunction(
          undefined,
          undefined,
          [ts.createParameter(
            undefined,
            undefined,
            undefined,
            ts.createIdentifier("item"),
            undefined,
            undefined,
            undefined
          )],
          undefined,
          ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          typeHandler(args[0], program, ts.createIdentifier("item"))

        )
      ]
    ))

}

function typeHandler(node: ts.TypeNode, program: ts.Program, objPropsAccess: ts.PropertyAccessExpression | ts.Identifier): ts.Expression {
  if (ts.isTypeReferenceNode(node)) {
    if (node.typeName.getText() === "Array" && node.typeArguments) {
      return arrayReferenceNodeHandler(node, program, objPropsAccess);
    }
    return typeReferenceHandler(node, program, objPropsAccess);
  } else if (ts.isTypeLiteralNode(node)) {
    return interfaceDeclarationHandler(node, program, objPropsAccess);
  } else if (ts.isUnionTypeNode(node)) {
    return unionTypeHandler(node, program, objPropsAccess);
  } else if (ts.isIntersectionTypeNode(node)) {
    return intersectionTypeHandler(node, program, objPropsAccess);
  } else if (ts.isLiteralTypeNode(node)) {
    return literalTypeHandler(node, program, objPropsAccess);
  } else if (ts.isFunctionTypeNode(node)) {
    return functionTypeHandler(node, objPropsAccess);
  } else {
    return simpleTypeHandler(node, objPropsAccess);
  }
}

function simpleTypeHandler(node: ts.TypeNode, objPropsAccess: ts.PropertyAccessExpression | ts.Identifier) {
  return ts.createBinary(
    ts.createTypeOf(objPropsAccess),
    ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
    ts.createStringLiteral(node.getText())
  )
}

function functionTypeHandler(node: ts.FunctionTypeNode, objPropsAccess: ts.PropertyAccessExpression | ts.Identifier) {
  return ts.createBinary(
    ts.createTypeOf(objPropsAccess),
    ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
    ts.createStringLiteral("function")
  )
}

function literalTypeHandler(node: ts.LiteralTypeNode, program: ts.Program, objPropsAccess: ts.PropertyAccessExpression | ts.Identifier) {
  if (ts.isLiteralExpression(node.literal)) {
    ts.isNumericLiteral(node.literal)
    return ts.createBinary(
      objPropsAccess,
      ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
      ts.isNumericLiteral(node.literal) ? ts.createNumericLiteral(node.literal.text) : ts.createStringLiteral(node.literal.text)
    )
  } else {
    return ts.createBinary(
      objPropsAccess,
      ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
      ts.createIdentifier(node.literal.getText())
    )
  }
}

function unionTypeHandler(node: ts.UnionTypeNode | ts.IntersectionTypeNode | Array<ts.TypeNode>, program: ts.Program, objPropsAccess: ts.PropertyAccessExpression | ts.Identifier): ts.Expression {

  let types;
  let lastType;


  if (Array.isArray(node)) {
    types = node;
    lastType = node.pop() as ts.TypeNode
  } else {
    types = node.types.concat();
    lastType = types.pop() as ts.TypeNode
  }
  return ts.createBinary(
    types.length > 1 ? unionTypeHandler(types, program, objPropsAccess) :
      typeHandler(types[0], program, objPropsAccess),
    ts.createToken(ts.SyntaxKind.BarBarToken),
    typeHandler(lastType, program, objPropsAccess)
  )
}

function intersectionTypeHandler(node: ts.UnionTypeNode | ts.IntersectionTypeNode | Array<ts.TypeNode>, program: ts.Program, objPropsAccess: ts.PropertyAccessExpression | ts.Identifier): ts.Expression {

  let types;
  let lastType;


  if (Array.isArray(node)) {
    types = node;
    lastType = node.pop() as ts.TypeNode
  } else {
    types = node.types.concat();
    lastType = types.pop() as ts.TypeNode
  }
  return ts.createBinary(
    types.length > 1 ? intersectionTypeHandler(types, program, objPropsAccess) :
      typeHandler(types[0], program, objPropsAccess),
    ts.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
    typeHandler(lastType, program, objPropsAccess)
  )
}

function typeAliasDeclarationHandler(node: ts.TypeAliasDeclaration, program: ts.Program, objPropsAccess: ts.PropertyAccessExpression | ts.Identifier) {
  return typeHandler(node.type, program, objPropsAccess);
}
