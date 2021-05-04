import ts from "typescript";
import { ChainManager } from "./utils/loopFinder/ChainManager";
import {
  typeOf,
  equal,
  and,
  or,
  isArray,
  every,
  isTypeOfObject,
  isNull,
} from "./utils/operators/boolOperators";
import {
  constVar,
  _if,
  not,
  consoleWarn,
  arrowFunc,
  call,
  propAccess,
  func,
  assignValue,
  identifier,
  str,
  letVar,
} from "./utils/operators/operators";

const interfaceList: Map<string, ts.ArrowFunction | undefined> = new Map();
const dataObjName = "data";
const argName = "arg";
let intersectNodes: ts.InterfaceDeclaration[];
let isIntersects = false;
let browserEnv = false;
let equateUndefinedAndNull = false;

export default function transformer(
  program: ts.Program,
  opt?: { browserEnv?: boolean; equateUndefinedAndNull?: boolean },
): ts.TransformerFactory<ts.SourceFile> {
  if (opt) {
    browserEnv = opt.browserEnv ? opt.browserEnv : false;
    equateUndefinedAndNull = opt.equateUndefinedAndNull ? opt.equateUndefinedAndNull : false;
  }

  return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
    return visitNode(file, program, context);
  };
}

function visitNode(
  node: ts.SourceFile,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.SourceFile;
function visitNode(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.Node | undefined;
function visitNode(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.Node | undefined {
  if (
    ts.isFunctionDeclaration(node) && node.modifiers
      ? node.modifiers.some((mod) => mod.getText() === "declare")
      : false
  ) {
    return visiterForFunction(node, program);
  }

  return ts.visitEachChild(node, (childNode) => visitNode(childNode, program, context), context);
}

function visiterForFunction(node: ts.Node, program: ts.Program): ts.Node | undefined {
  if (ts.isFunctionDeclaration(node)) {
    const exportModifier = node.modifiers
      ? node.modifiers.some((mod) => mod.getText() === "export")
      : false;
    const typePredicate = node.type;

    if (typePredicate !== undefined && ts.isTypePredicateNode(typePredicate)) {
      const typeParamName = typePredicate.parameterName.getText();
      const name = node.name ? node.name.getText() : "is" + typeParamName;
      const type = typePredicate.type;

      if (type !== undefined && type.kind !== 125) {
        let expression;
        let propsName;
        const cm = new ChainManager(program);

        if (ts.isTypeReferenceNode(type)) {
          let declaration = getDeclarationsFromTypeReferenceNode(type, program);
          declaration = importSpecifierHandler(declaration, program);

          if (declaration) {
            if (ts.isInterfaceDeclaration(declaration)) {
              cm.init(declaration);
              isIntersects = cm.intersectChains.length > 0;
              intersectNodes = cm.intersectNodes;
              expression = interfaceDeclarationHandler(declaration, program, true);
              propsName = type.getText();
            }
          }
        }
        if (ts.isTypeLiteralNode(type)) {
          cm.init(type);
          isIntersects = cm.intersectChains.length > 0;
          intersectNodes = cm.intersectNodes;

          expression = interfaceDeclarationHandler(type, program, ts.createIdentifier(argName));
          propsName = "object";
        }

        if (expression && propsName) {
          const arrOfPropsAssignment = [
            ts.createPropertyAssignment(ts.createIdentifier(propsName), expression),
          ];

          interfaceList.forEach((data, name) => {
            if (data) {
              arrOfPropsAssignment.push(
                ts.createPropertyAssignment(ts.createIdentifier(name), data),
              );
            }
          });

          const block: ts.Statement[] = [];

          if (cm.intersectChains.length > 0) {
            block.push(
              generateMapForIntersectNodes(intersectNodes.map((node) => node.name.getText())),
              getFunctionForIsIntersectObject(),
            );
          }

          block.push(
            constVar(dataObjName, ts.createObjectLiteral(arrOfPropsAssignment, true)),
            ts.createReturn(
              call(propAccess(dataObjName, propsName), [ts.createIdentifier(typeParamName)]),
            ),
          );

          return func(name, block, typeParamName, exportModifier);
        }
      }
    }
  }
  return;
}

export function importSpecifierHandler(
  node: ts.Declaration | undefined,
  program: ts.Program,
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

function generateMapForIntersectNodes(intersectNodeNames: string[]) {
  return ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList(
      [
        ts.createVariableDeclaration(
          ts.createIdentifier("objectStore"),
          undefined,
          ts.createNew(ts.createIdentifier("Map"), undefined, [
            ts.createArrayLiteral(
              intersectNodeNames.map((name) =>
                ts.createArrayLiteral(
                  [
                    ts.createStringLiteral(name),
                    ts.createNew(ts.createIdentifier("Set"), undefined, []),
                  ],
                  false,
                ),
              ),
              true,
            ),
          ]),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );
}

function getFunctionForIsIntersectObject() {
  return constVar(
    "isIntersectObject",
    arrowFunc(
      [
        _if(call(propAccess("objectStore", "has"), ts.createIdentifier("interfaceName")), [
          constVar(
            "objects",
            call(propAccess("objectStore", "get"), ts.createIdentifier("interfaceName")),
          ),
          _if(
            call(propAccess("objects", "has"), ts.createIdentifier("obj")),
            [ts.createReturn(ts.createTrue())],
            [
              ts.createExpressionStatement(
                call(propAccess("objects", "add"), ts.createIdentifier("obj")),
              ),
              ts.createReturn(ts.createFalse()),
            ],
          ),
        ]),
      ],
      ["interfaceName", "obj"],
    ),
  );
}

export function getDeclarationsFromTypeReferenceNode(
  node: ts.TypeReferenceNode,
  program: ts.Program,
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

function typeReferenceHandler(
  node: ts.TypeReferenceNode,
  program: ts.Program,
  objIdentifier: ts.PropertyAccessExpression | ts.Identifier,
): ts.Expression {
  let declaration = getDeclarationsFromTypeReferenceNode(node, program);

  declaration = importSpecifierHandler(declaration, program);

  if (declaration) {
    if (ts.isInterfaceDeclaration(declaration)) {
      return interfaceDeclarationHandler(declaration, program, objIdentifier);
    } else if (ts.isClassDeclaration(declaration)) {
      return classDeclarationHandler(declaration);
    } else if (ts.isTypeAliasDeclaration(declaration)) {
      return typeAliasDeclarationHandler(declaration, program, objIdentifier);
    }
  }
  return ts.createLiteral("undefined");
}

function classDeclarationHandler(node: ts.ClassDeclaration): ts.BinaryExpression {
  const name = node.name as ts.Identifier;
  return ts.createBinary(
    ts.createIdentifier("obj"),
    ts.createToken(ts.SyntaxKind.InstanceOfKeyword),
    ts.createIdentifier(name.getText()),
  );
}

function interfaceDeclarationHandler(
  node: ts.InterfaceDeclaration,
  program: ts.Program,
  withProps: true | ts.PropertyAccessExpression | ts.Identifier,
): ts.Expression;
function interfaceDeclarationHandler(
  node: ts.TypeLiteralNode,
  program: ts.Program,
  withProps: ts.Identifier | ts.PropertyAccessExpression,
): ts.Expression;
function interfaceDeclarationHandler(
  node: ts.InterfaceDeclaration | ts.TypeLiteralNode,
  program: ts.Program,
  withProps: true | ts.Identifier | ts.PropertyAccessExpression,
): ts.Expression {
  const getProps = (objPropsAccess: ts.Identifier | ts.PropertyAccessExpression) => {
    const props: Array<ts.ArrowFunction> = [];
    node.members.forEach((propertySignature) => {
      if (ts.isPropertySignature(propertySignature)) {
        const expression = propertySignatureHandler(propertySignature, program, objPropsAccess);
        if (expression) {
          props.push(expression);
        }
      }
    });

    return props;
  };

  const callFunction = (objPropsAccess: ts.Identifier | ts.PropertyAccessExpression) =>
    every(ts.createArrayLiteral(getProps(objPropsAccess)), call("item"));

  const body = (objPropsAccess: ts.Identifier | ts.PropertyAccessExpression) => {
    if (isIntersects && ts.isInterfaceDeclaration(node)) {
      if (intersectNodes.some((item) => item === node)) {
        return [
          ts.createExpressionStatement(
            call("isIntersectObject", [node.name.getText(), ts.createIdentifier(argName)]),
          ),
          ts.createReturn(callFunction(objPropsAccess)),
        ];
      }
    }

    return [ts.createReturn(callFunction(objPropsAccess))];
  };

  const arrowFunction = (objPropsAccess: ts.Identifier | ts.PropertyAccessExpression) =>
    arrowFunc(body(objPropsAccess), "arg");

  if (ts.isTypeLiteralNode(node)) {
    return callFunction(withProps as ts.Identifier | ts.PropertyAccessExpression);
  }

  if (typeof withProps === "boolean" && withProps) {
    interfaceList.set(node.name.getText(), undefined);
    return arrowFunction(ts.createIdentifier(argName));
  } else {
    if (!interfaceList.has(node.name.getText())) {
      interfaceList.set(node.name.getText(), undefined);
      interfaceList.set(node.name.getText(), arrowFunction(ts.createIdentifier(argName)));
    }

    const condition = and(
      isTypeOfObject(withProps),
      call(propAccess(dataObjName, node.name.getText()), withProps),
    );

    if (isIntersects && intersectNodes.some((item) => item === node)) {
      return ts.createParen(
        or(call("isIntersectObject", [node.name.getText(), withProps]), condition),
      );
    } else {
      return condition;
    }
  }
}

function propertySignatureHandler(
  node: ts.PropertySignature | ts.ParameterDeclaration,
  program: ts.Program,
  objIdentifier: ts.Identifier | ts.PropertyAccessExpression,
): ts.ArrowFunction | undefined {
  const nodeType = node.type;
  if (nodeType) {
    const access = ts.createPropertyAccess(objIdentifier, ts.createIdentifier(node.name.getText()));

    const expression = typeHandler(nodeType, program, access);

    const getFullAccessName = (access: ts.PropertyAccessExpression, result = ""): string => {
      if (result.length > 0) {
        result = `${access.name.text}.${result}`;
      } else {
        result = access.name.text;
      }
      if (ts.isPropertyAccessExpression(access.expression)) {
        return getFullAccessName(access.expression, result);
      }
      return result;
    };

    const resultVariable = () => {
      if (node.questionToken) {
        if (equateUndefinedAndNull) {
          return constVar(
            "result",
            or(typeOf(access, "undefined"), or(isNull(access), expression)),
          );
        }
        return constVar("result", or(typeOf(access, "undefined"), expression));
      } else {
        return constVar("result", expression);
      }
    };

    const indexIdentifier = ts.createTemplateExpression(ts.createTemplateHead("[", "["), [
      ts.createTemplateSpan(ts.createIdentifier("arrayIndex"), ts.createTemplateTail("]", "]")),
    ]);

    const block = [
      resultVariable(),
      _if(
        not("result"),
        consoleWarn(
          browserEnv
            ? [
                str(getFullAccessName(access)),
                isArrayReferenceNode(nodeType) ? indexIdentifier : str(""),
                str(`MUST be type of: ${nodeType.getText()}`),
              ]
            : [
                str("\x1b[33m" + getFullAccessName(access)),
                isArrayReferenceNode(nodeType) ? indexIdentifier : str(""),
                str("\x1b[36m MUST be type of: "),
                str("\x1b[33m" + nodeType.getText() + "\x1b[39m"),
              ],
        ),
      ),
      ts.createReturn(ts.createIdentifier("result")),
    ];

    if (isArrayReferenceNode(nodeType)) {
      block.unshift(letVar("arrayIndex"));
    }

    return arrowFunc(block);
  } else {
    return;
  }
}

function arrayReferenceNodeHandler(
  node: ts.TypeReferenceNode,
  program: ts.Program,
  objIdentifier: ts.PropertyAccessExpression | ts.Identifier,
) {
  const args = node.typeArguments as ts.NodeArray<ts.TypeNode>;
  const resultCondition = constVar(
    "condition",
    typeHandler(args[0], program, ts.createIdentifier("item")),
  );
  const condition = _if(
    not(identifier("condition")),
    ts.createExpressionStatement(assignValue("arrayIndex", "index")),
  );
  const returnState = ts.createReturn(identifier("condition"));
  const func = arrowFunc([resultCondition, condition, returnState], ["item", "index"]);
  return and(isArray(objIdentifier), every(objIdentifier, func, { index: true }));
}

function typeHandler(
  node: ts.TypeNode,
  program: ts.Program,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier,
): ts.Expression {
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
  } else if (ts.SyntaxKind[node.kind] === "NullKeyword") {
    return nullKeywordHandler(objPropsAccess);
  } else if (ts.SyntaxKind[node.kind] === "UndefinedKeyword") {
    return undefinedKeywordHandler(objPropsAccess);
  } else {
    return otherTypeHandler(node, objPropsAccess);
  }
}

function isArrayReferenceNode(node: ts.TypeNode) {
  return ts.isTypeReferenceNode(node) && node.typeName.getText() === "Array" && node.typeArguments;
}

function undefinedKeywordHandler(objPropsAccess: ts.PropertyAccessExpression | ts.Identifier) {
  if (equateUndefinedAndNull) {
    return or(typeOf(objPropsAccess, "undefined"), isNull(objPropsAccess));
  }
  return typeOf(objPropsAccess, "undefined");
}

function nullKeywordHandler(objPropsAccess: ts.PropertyAccessExpression | ts.Identifier) {
  return isNull(objPropsAccess);
}

function otherTypeHandler(
  node: ts.TypeNode,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier,
) {
  return typeOf(objPropsAccess, node.getText());
}

function functionTypeHandler(
  node: ts.FunctionTypeNode,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier,
) {
  return typeOf(objPropsAccess, "function");
}

function literalTypeHandler(
  node: ts.LiteralTypeNode,
  program: ts.Program,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier,
) {
  if (ts.isLiteralExpression(node.literal)) {
    return equal(
      objPropsAccess,
      ts.isNumericLiteral(node.literal)
        ? ts.createNumericLiteral(node.literal.text)
        : ts.createStringLiteral(node.literal.text),
    );
  } else {
    return equal(objPropsAccess, node.literal);
  }
}

function unionTypeHandler(
  node: ts.UnionTypeNode,
  program: ts.Program,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier,
): ts.Expression {
  const binaryBuilder = (array: Array<ts.TypeNode>): ts.BinaryExpression => {
    const lastType = array.pop() as ts.TypeNode;
    return or(
      array.length > 1 ? binaryBuilder(array) : typeHandler(array[0], program, objPropsAccess),
      typeHandler(lastType, program, objPropsAccess),
    );
  };
  return binaryBuilder(node.types.concat());
}

function intersectionTypeHandler(
  node: ts.IntersectionTypeNode,
  program: ts.Program,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier,
): ts.Expression {
  const binaryBuilder = (array: Array<ts.TypeNode>): ts.BinaryExpression => {
    const lastType = array.pop() as ts.TypeNode;
    return and(
      array.length > 1 ? binaryBuilder(array) : typeHandler(array[0], program, objPropsAccess),
      typeHandler(lastType, program, objPropsAccess),
    );
  };
  return binaryBuilder(node.types.concat());
}

function typeAliasDeclarationHandler(
  node: ts.TypeAliasDeclaration,
  program: ts.Program,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier,
) {
  return typeHandler(node.type, program, objPropsAccess);
}
