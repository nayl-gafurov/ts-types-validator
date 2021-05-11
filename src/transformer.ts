import ts from 'typescript';
import { ChainManager } from './utils/loopFinder/ChainManager';
import { typeOf, equal, and, or, isArray, every, isTypeOfObject, isNull } from './utils/operators/boolOperators';
import {
  constVar,
  _if,
  not,
  consoleWarn,
  arrowFunc,
  call,
  propAccess,
  func,
  identifier,
  str,
  letVar,
} from './utils/operators/operators';
import { getDeclarationsFromTypeReferenceNode, importSpecifierHandler } from './utils/utils';

export interface TransformerOptions {
  env?: 'browser' | 'node';
  equateUndefinedAndNull?: boolean;
  colorStyle?: 0 | 1 | 2;
}

const interfaceList: Map<string, ts.ArrowFunction | undefined> = new Map();
const dataObjName = 'data';
const argName = 'arg';
const callback = 'onFalse';
let intersectNodes: ts.InterfaceDeclaration[];
let isIntersects = false;
let env: 'browser' | 'node' = 'node';
let equateUndefinedAndNull = false;
let colorStyle: 0 | 1 | 2 = 1;
let color1: string, color2: string, color3: string;
let hasCallback = false;

export default function transformer(
  program: ts.Program,
  opt?: TransformerOptions
): ts.TransformerFactory<ts.SourceFile> {
  if (opt) {
    env = opt.env ? opt.env : 'browser';
    equateUndefinedAndNull = opt.equateUndefinedAndNull ? opt.equateUndefinedAndNull : false;
    colorStyle = opt.colorStyle ? opt.colorStyle : 0;
  }

  switch (colorStyle) {
    case 0:
      if (env === 'browser') {
        color1 = color2 = color3 = 'none';
      } else {
        color1 = color2 = color3 = '';
      }
      break;
    case 1:
      if (env === 'browser') {
        color1 = 'yellow';
        color2 = 'magenta';
        color3 = 'cyan';
      } else {
        color1 = '\x1b[33m';
        color2 = '\x1b[35m';
        color3 = '\x1b[36m';
      }
      break;
    case 2:
      if (env === 'browser') {
        color1 = 'red';
        color2 = 'yellow';
        color3 = 'magenta';
      } else {
        color1 = '\x1b[33m';
        color2 = '\x1b[35m';
        color3 = '\x1b[36m';
      }
      break;
  }

  return (context: ts.TransformationContext) => (file: ts.SourceFile): ts.SourceFile => {
    return visitNode(file, program, context);
  };
}

function visitNode(node: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile;
function visitNode(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined;
function visitNode(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined {
  if (
    ts.isFunctionDeclaration(node) && node.modifiers ? node.modifiers.some(mod => mod.getText() === 'declare') : false
  ) {
    return visiterForFunction(node, program);
  }

  return ts.visitEachChild(node, childNode => visitNode(childNode, program, context), context);
}

function visiterForFunction(node: ts.Node, program: ts.Program): ts.Node | undefined {
  if (ts.isFunctionDeclaration(node)) {
    const exportModifier = node.modifiers ? node.modifiers.some(mod => mod.getText() === 'export') : false;
    const typePredicate = node.type;

    if (typePredicate !== undefined && ts.isTypePredicateNode(typePredicate)) {
      const typeParamName = typePredicate.parameterName.getText();
      const name = node.name ? node.name.getText() : 'is' + typeParamName;
      const type = typePredicate.type;

      if (type !== undefined && type.kind !== 125) {
        let expression;
        let propsName;
        let returnFunctionArgumentName: ts.Expression | undefined;
        const cm = new ChainManager(program);

        const secondArg = node.parameters[1];
        if (secondArg && secondArg.type) {
          if (
            ts.isTypeLiteralNode(secondArg.type) &&
            secondArg.type.members.find(
              item =>
                ts.isPropertySignature(item) &&
                item.type &&
                ts.isFunctionTypeNode(item.type) &&
                item.name?.getText() === callback
            )
          ) {
            hasCallback = true;
          } else if (ts.isTypeReferenceNode(secondArg.type)) {
            let declaration = getDeclarationsFromTypeReferenceNode(secondArg.type, program);
            declaration = importSpecifierHandler(declaration, program);
            if (declaration) {
              if (
                ts.isInterfaceDeclaration(declaration) &&
                declaration.members.find(
                  item =>
                    ts.isPropertySignature(item) &&
                    item.type &&
                    ts.isFunctionTypeNode(item.type) &&
                    item.name?.getText() === callback
                )
              ) {
                hasCallback = true;
              }
            }
          }
        }

        if (ts.isTypeReferenceNode(type)) {
          if (type.typeName.getText() === 'Array' && type.typeArguments) {
            expression = typeNodeHandler(type, program, ts.createIdentifier(typeParamName));
            propsName = 'condition';
            returnFunctionArgumentName = undefined;
          } else {
            let declaration = getDeclarationsFromTypeReferenceNode(type, program);
            declaration = importSpecifierHandler(declaration, program);

            if (declaration) {
              if (ts.isInterfaceDeclaration(declaration)) {
                cm.init(declaration);
                isIntersects = cm.intersectChains.length > 0;
                intersectNodes = cm.intersectNodes;
                expression = interfaceDeclarationHandler(declaration, program, true);
                propsName = type.getText();
                returnFunctionArgumentName = ts.createIdentifier(typeParamName);
              }
            }
          }
        } else if (ts.isTypeLiteralNode(type)) {
          cm.init(type);
          isIntersects = cm.intersectChains.length > 0;
          intersectNodes = cm.intersectNodes;
          expression = interfaceDeclarationHandler(type, program, ts.createIdentifier(argName));
          propsName = 'object';
          returnFunctionArgumentName = ts.createIdentifier(typeParamName);
        } else {
          expression = typeNodeHandler(type, program, ts.createIdentifier(typeParamName));
          propsName = 'condition';
          returnFunctionArgumentName = undefined;
        }

        if (expression && propsName) {
          const arrOfPropsAssignment = [ts.createPropertyAssignment(ts.createIdentifier(propsName), expression)];

          interfaceList.forEach((data, name) => {
            if (data) {
              arrOfPropsAssignment.push(ts.createPropertyAssignment(ts.createIdentifier(name), data));
            }
          });

          const block: ts.Statement[] = [];

          hasCallback && block.push(letVar('messageStack', ts.createArrayLiteral([], false)));

          if (cm.intersectChains.length > 0) {
            block.push(
              generateMapForIntersectNodes(intersectNodes.map(node => node.name.getText())),
              getFunctionForIsIntersectObject()
            );
          }

          block.push(
            constVar(dataObjName, ts.createObjectLiteral(arrOfPropsAssignment, true)),
            constVar('result', call(propAccess(dataObjName, propsName), returnFunctionArgumentName))
          );

          let args;

          if (hasCallback) {
            const secondArgName = secondArg.name.getText();
            block.push(
              _if(
                and(
                  not('result'),
                  and(
                    ts.createIdentifier(secondArgName),
                    ts.createBinary(
                      ts.createTypeOf(
                        ts.createPropertyAccess(ts.createIdentifier(secondArgName), ts.createIdentifier(callback))
                      ),
                      ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                      ts.createStringLiteral('function')
                    )
                  )
                ),

                ts.createExpressionStatement(
                  ts.createCall(
                    ts.createPropertyAccess(ts.createIdentifier(secondArgName), ts.createIdentifier(callback)),
                    undefined,
                    [ts.createIdentifier('messageStack')]
                  )
                )
              )
            );

            args = [typeParamName, secondArgName];
          } else {
            args = typeParamName;
          }

          block.push(ts.createReturn(ts.createIdentifier('result')));

          return func(name, block, args, exportModifier);
        }
      }
    }
  }
  return;
}

function generateMapForIntersectNodes(intersectNodeNames: string[]): ts.VariableStatement {
  return ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList(
      [
        ts.createVariableDeclaration(
          ts.createIdentifier('objectStore'),
          undefined,
          ts.createNew(ts.createIdentifier('Map'), undefined, [
            ts.createArrayLiteral(
              intersectNodeNames.map(name =>
                ts.createArrayLiteral(
                  [ts.createStringLiteral(name), ts.createNew(ts.createIdentifier('Set'), undefined, [])],
                  false
                )
              ),
              true
            ),
          ])
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}

function getFunctionForIsIntersectObject(): ts.VariableStatement {
  return constVar(
    'isIntersectObject',
    arrowFunc(
      [
        _if(call(propAccess('objectStore', 'has'), ts.createIdentifier('interfaceName')), [
          constVar('objects', call(propAccess('objectStore', 'get'), ts.createIdentifier('interfaceName'))),
          _if(
            call(propAccess('objects', 'has'), ts.createIdentifier('obj')),
            [ts.createReturn(ts.createTrue())],
            [
              ts.createExpressionStatement(call(propAccess('objects', 'add'), ts.createIdentifier('obj'))),
              ts.createReturn(ts.createFalse()),
            ]
          ),
        ]),
      ],
      ['interfaceName', 'obj']
    )
  );
}

function typeReferenceHandler(
  node: ts.TypeReferenceNode,
  program: ts.Program,
  objIdentifier: ts.PropertyAccessExpression | ts.Identifier
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
  return ts.createLiteral('undefined');
}

function classDeclarationHandler(node: ts.ClassDeclaration): ts.BinaryExpression {
  const name = node.name as ts.Identifier;
  return ts.createBinary(
    ts.createIdentifier('obj'),
    ts.createToken(ts.SyntaxKind.InstanceOfKeyword),
    ts.createIdentifier(name.getText())
  );
}

function interfaceDeclarationHandler(
  node: ts.InterfaceDeclaration,
  program: ts.Program,
  withProps: true | ts.PropertyAccessExpression | ts.Identifier
): ts.Expression;
function interfaceDeclarationHandler(
  node: ts.TypeLiteralNode,
  program: ts.Program,
  withProps: ts.Identifier | ts.PropertyAccessExpression
): ts.Expression;
function interfaceDeclarationHandler(
  node: ts.InterfaceDeclaration | ts.TypeLiteralNode,
  program: ts.Program,
  withProps: true | ts.Identifier | ts.PropertyAccessExpression
): ts.Expression {
  const getProps = (objPropsAccess: ts.Identifier | ts.PropertyAccessExpression): ts.ArrowFunction[] => {
    const props: Array<ts.ArrowFunction> = [];
    node.members.forEach(propertySignature => {
      if (ts.isPropertySignature(propertySignature)) {
        const expression = propertySignatureHandler(propertySignature, program, objPropsAccess);
        if (expression) {
          props.push(expression);
        }
      }
    });

    return props;
  };

  const callFunction = (objPropsAccess: ts.Identifier | ts.PropertyAccessExpression): ts.CallExpression =>
    every(ts.createArrayLiteral(getProps(objPropsAccess)), call('item'));

  const body = (
    objPropsAccess: ts.Identifier | ts.PropertyAccessExpression
  ): (ts.ExpressionStatement | ts.ReturnStatement)[] => {
    if (isIntersects && ts.isInterfaceDeclaration(node)) {
      if (intersectNodes.some(item => item === node)) {
        return [
          ts.createExpressionStatement(call('isIntersectObject', [node.name.getText(), ts.createIdentifier(argName)])),
          ts.createReturn(callFunction(objPropsAccess)),
        ];
      }
    }

    return [ts.createReturn(callFunction(objPropsAccess))];
  };

  const arrowFunction = (objPropsAccess: ts.Identifier | ts.PropertyAccessExpression): ts.ArrowFunction =>
    arrowFunc(body(objPropsAccess), 'arg');

  if (ts.isTypeLiteralNode(node)) {
    return callFunction(withProps as ts.Identifier | ts.PropertyAccessExpression);
  }

  if (typeof withProps === 'boolean' && withProps) {
    interfaceList.set(node.name.getText(), undefined);
    return arrowFunction(ts.createIdentifier(argName));
  } else {
    if (!interfaceList.has(node.name.getText())) {
      interfaceList.set(node.name.getText(), undefined);
      interfaceList.set(node.name.getText(), arrowFunction(ts.createIdentifier(argName)));
    }

    const condition = and(isTypeOfObject(withProps), call(propAccess(dataObjName, node.name.getText()), withProps));

    if (isIntersects && intersectNodes.some(item => item === node)) {
      return ts.createParen(or(call('isIntersectObject', [node.name.getText(), withProps]), condition));
    } else {
      return condition;
    }
  }
}

function propertySignatureHandler(
  node: ts.PropertySignature | ts.ParameterDeclaration,
  program: ts.Program,
  objIdentifier: ts.Identifier | ts.PropertyAccessExpression
): ts.ArrowFunction | undefined {
  const nodeType = node.type;

  if (nodeType) {
    const access = ts.createPropertyAccess(objIdentifier, ts.createIdentifier(node.name.getText()));

    const expression = typeHandler(nodeType, program, access);

    const resultVariable = (): ts.VariableStatement => {
      if (node.questionToken) {
        if (equateUndefinedAndNull) {
          return constVar('result', or(typeOf(access, 'undefined'), or(isNull(access), expression)));
        }
        return constVar('result', or(typeOf(access, 'undefined'), expression));
      } else {
        return constVar('result', expression);
      }
    };

    const { message, messageClean } = errorMessage(nodeType, objIdentifier);
    const then = [consoleWarn(message)];
    hasCallback && then.push(pushMessageStack(messageClean));

    const block = [resultVariable(), _if(not('result'), then), ts.createReturn(ts.createIdentifier('result'))];

    // if (isHasArrayType(nodeType)) {
    //   block.unshift(letVar('arrayIndex'));
    // }

    return arrowFunc(block);
  }

  return undefined;
}

function typeNodeHandler(nodeType: ts.TypeNode, program: ts.Program, objPropsAccess: ts.Identifier): ts.ArrowFunction {
  const expression = typeHandler(nodeType, program, objPropsAccess);

  const resultVariable = (): ts.VariableStatement => {
    return constVar('result', expression);
  };

  const { message, messageClean } = errorMessage(nodeType, objPropsAccess);
  const then = [consoleWarn(message)];
  hasCallback && then.push(pushMessageStack(messageClean));

  const block = [resultVariable(), _if(not('result'), then), ts.createReturn(ts.createIdentifier('result'))];

  return arrowFunc(block);
}

function getFullAccessName(access: ts.PropertyAccessExpression | ts.Identifier, result = ''): string {
  if (ts.isIdentifier(access)) {
    result = access.text;
  } else {
    if (result.length > 0) {
      result = `${access.name.text}.${result}`;
    } else {
      result = access.name.text;
    }
    if (ts.isPropertyAccessExpression(access.expression)) {
      return getFullAccessName(access.expression, result);
    }
  }
  return result;
}

function errorMessage(
  node: ts.TypeNode,
  access: ts.PropertyAccessExpression | ts.Identifier,
  showIndex: boolean | number = false
): {
  message: ts.Expression[];
  messageClean: ts.Expression;
} {
  let message: ts.Expression[];

  let indexIdentifier;
  if (showIndex !== false) {
    indexIdentifier =
      typeof showIndex === 'number'
        ? str(`[${showIndex}]`)
        : ts.createTemplateExpression(ts.createTemplateHead('[', '['), [
            ts.createTemplateSpan(ts.createIdentifier('index'), ts.createTemplateTail(']', ']')),
          ]);
  }

  let messageClean: ts.Expression = str(getFullAccessName(access));
  messageClean = indexIdentifier
    ? ts.createBinary(messageClean, ts.createToken(ts.SyntaxKind.PlusToken), indexIdentifier)
    : messageClean;
  messageClean = ts.createBinary(
    messageClean,
    ts.createToken(ts.SyntaxKind.PlusToken),
    str(` MUST be type of: ${node.getText()}`)
  );

  if (env === 'browser') {
    let text: ts.Expression = str('%c' + getFullAccessName(access));
    text = indexIdentifier
      ? ts.createBinary(
          text,
          ts.createToken(ts.SyntaxKind.PlusToken),
          ts.createBinary(str('%c'), ts.createToken(ts.SyntaxKind.PlusToken), indexIdentifier)
        )
      : text;
    text = ts.createBinary(
      text,
      ts.createToken(ts.SyntaxKind.PlusToken),
      str(` %cMUST be type of: %c${node.getText()}`)
    );
    message = [text];

    message.push(str('color:' + color1));
    indexIdentifier && message.push(str('color:' + color2));
    message.push(str('color:' + color3));
    message.push(str('color:' + color1));
  } else {
    let text: ts.Expression = str(color1 + getFullAccessName(access));
    text = indexIdentifier
      ? ts.createBinary(
          text,
          ts.createToken(ts.SyntaxKind.PlusToken),
          ts.createBinary(str(color2), ts.createToken(ts.SyntaxKind.PlusToken), indexIdentifier)
        )
      : text;

    message = [text];
    message.push(str(color3 + 'MUST be type of:'), str(color1 + node.getText() + '\x1b[39m'));
  }

  return { message, messageClean };
}

function messageForTupleLength(
  node: ts.TupleTypeNode,
  objIdentifier: ts.Identifier | ts.PropertyAccessExpression
): { message: ts.Expression[]; messageClean: ts.TemplateExpression } {
  const messageClean = ts.createTemplateExpression(ts.createTemplateHead(`${getFullAccessName(objIdentifier)} has `), [
    ts.createTemplateSpan(
      ts.createPropertyAccess(objIdentifier, ts.createIdentifier('length')),
      ts.createTemplateMiddle(' element(s) but MUST be ')
    ),
    ts.createTemplateSpan(ts.createNumericLiteral(node.elementTypes.length.toString()), ts.createTemplateTail('')),
  ]);

  let message: ts.Expression[];

  if (env === 'browser') {
    message = [
      ts.createTemplateExpression(ts.createTemplateHead(`%c${getFullAccessName(objIdentifier)} has %c`), [
        ts.createTemplateSpan(
          ts.createPropertyAccess(objIdentifier, ts.createIdentifier('length')),
          ts.createTemplateMiddle(' %celement(s) but MUST be %c')
        ),
        ts.createTemplateSpan(ts.createNumericLiteral(node.elementTypes.length.toString()), ts.createTemplateTail('')),
      ]),
    ];

    message.push(str('color:' + color1), str('color:' + color2), str('color:' + color3), str('color:' + color2));
  } else {
    message = [
      ts.createTemplateExpression(ts.createTemplateHead(`${color1}${getFullAccessName(objIdentifier)} has ${color2}`), [
        ts.createTemplateSpan(
          ts.createPropertyAccess(objIdentifier, ts.createIdentifier('length')),
          ts.createTemplateMiddle(`${color3} element(s) but MUST be ${color2}`)
        ),
        ts.createTemplateSpan(ts.createNumericLiteral(node.elementTypes.length.toString()), ts.createTemplateTail('')),
      ]),
    ];
  }
  return { message, messageClean };
}

function pushMessageStack(message: ts.Expression): ts.ExpressionStatement {
  return ts.createExpressionStatement(
    ts.createCall(
      ts.createPropertyAccess(ts.createIdentifier('messageStack'), ts.createIdentifier('push')),
      undefined,
      [message]
    )
  );
}

function tupleTypeNodeHandler(
  node: ts.TupleTypeNode,
  program: ts.Program,
  objIdentifier: ts.PropertyAccessExpression | ts.Identifier
): ts.Expression {
  const resultConditions = ts.createArrayLiteral(
    node.elementTypes.map((typeNode, index) => {
      const { message, messageClean } = errorMessage(typeNode, objIdentifier, index);
      const then = [consoleWarn(message)];
      hasCallback && then.push(pushMessageStack(messageClean));

      return arrowFunc(
        [
          constVar('condition', typeHandler(typeNode, program, ts.createIdentifier('item'))),
          _if(not(identifier('condition')), then),
          ts.createReturn(identifier('condition')),
        ],
        'item'
      );
    }),
    false
  );

  const checker = constVar(
    'condition',
    ts.createCall(ts.createIdentifier('item'), undefined, [
      ts.createElementAccess(objIdentifier, ts.createIdentifier('index')),
    ])
  );

  const returnState = ts.createReturn(identifier('condition'));

  const { message, messageClean } = messageForTupleLength(node, objIdentifier);
  const then = [consoleWarn(message)];
  hasCallback && then.push(pushMessageStack(messageClean));

  const func = arrowFunc([checker, returnState], ['item', 'index']);
  return and(
    and(
      isArray(objIdentifier),
      ts.createCall(
        ts.createParen(
          arrowFunc([
            constVar(
              'condition',
              ts.createBinary(
                ts.createPropertyAccess(objIdentifier, ts.createIdentifier('length')),
                ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                ts.createNumericLiteral(node.elementTypes.length.toString())
              )
            ),
            _if(not(identifier('condition')), then),
            ts.createReturn(identifier('condition')),
          ])
        ),
        undefined,
        []
      )
    ),
    every(resultConditions, func, { index: true })
  );
}

function arrayReferenceNodeHandler(
  node: ts.TypeReferenceNode | ts.ArrayTypeNode,
  program: ts.Program,
  objIdentifier: ts.PropertyAccessExpression | ts.Identifier
): ts.BinaryExpression {
  let type;
  if (ts.isArrayTypeNode(node)) {
    type = node.elementType;
  } else {
    type = (node.typeArguments as ts.NodeArray<ts.TypeNode>)[0];
  }

  const { message, messageClean } = errorMessage(node, objIdentifier);
  const then = [consoleWarn(message)];
  hasCallback && then.push(pushMessageStack(messageClean));

  const resultCondition = constVar('condition', typeHandler(type, program, ts.createIdentifier('item')));
  const condition = _if(not(identifier('condition')), then);
  const returnState = ts.createReturn(identifier('condition'));
  const func = arrowFunc([resultCondition, condition, returnState], ['item', 'index']);
  return and(isArray(objIdentifier), every(objIdentifier, func, { index: true }));
}

function typeHandler(
  node: ts.TypeNode,
  program: ts.Program,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier
): ts.Expression {
  if (ts.isTypeReferenceNode(node)) {
    if (node.typeName.getText() === 'Array' && node.typeArguments) {
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
    return literalTypeHandler(node, objPropsAccess);
  } else if (ts.isFunctionTypeNode(node)) {
    return functionTypeHandler(objPropsAccess);
  } else if (ts.SyntaxKind[node.kind] === 'NullKeyword') {
    return nullKeywordHandler(objPropsAccess);
  } else if (ts.SyntaxKind[node.kind] === 'UndefinedKeyword') {
    return undefinedKeywordHandler(objPropsAccess);
  } else if (ts.isArrayTypeNode(node)) {
    return arrayReferenceNodeHandler(node, program, objPropsAccess);
  } else if (ts.isParenthesizedTypeNode(node)) {
    return typeHandler(node.type, program, objPropsAccess);
  } else if (ts.isTupleTypeNode(node)) {
    return tupleTypeNodeHandler(node, program, objPropsAccess);
  } else {
    return otherTypeHandler(node, objPropsAccess);
  }
}

function undefinedKeywordHandler(objPropsAccess: ts.PropertyAccessExpression | ts.Identifier): ts.BinaryExpression {
  if (equateUndefinedAndNull) {
    return or(typeOf(objPropsAccess, 'undefined'), isNull(objPropsAccess));
  }
  return typeOf(objPropsAccess, 'undefined');
}

function nullKeywordHandler(objPropsAccess: ts.PropertyAccessExpression | ts.Identifier): ts.BinaryExpression {
  return isNull(objPropsAccess);
}

function otherTypeHandler(
  node: ts.TypeNode,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier
): ts.BinaryExpression {
  return typeOf(objPropsAccess, node.getText());
}

function functionTypeHandler(objPropsAccess: ts.PropertyAccessExpression | ts.Identifier): ts.BinaryExpression {
  return typeOf(objPropsAccess, 'function');
}

function literalTypeHandler(
  node: ts.LiteralTypeNode,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier
): ts.BinaryExpression {
  if (ts.isLiteralExpression(node.literal)) {
    return equal(
      objPropsAccess,
      ts.isNumericLiteral(node.literal)
        ? ts.createNumericLiteral(node.literal.text)
        : ts.createStringLiteral(node.literal.text)
    );
  } else {
    return equal(objPropsAccess, node.literal);
  }
}

function unionTypeHandler(
  node: ts.UnionTypeNode,
  program: ts.Program,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier
): ts.Expression {
  const binaryBuilder = (array: Array<ts.TypeNode>): ts.BinaryExpression => {
    const lastType = array.pop() as ts.TypeNode;
    return or(
      array.length > 1 ? binaryBuilder(array) : typeHandler(array[0], program, objPropsAccess),
      typeHandler(lastType, program, objPropsAccess)
    );
  };
  return binaryBuilder(node.types.concat());
}

function intersectionTypeHandler(
  node: ts.IntersectionTypeNode,
  program: ts.Program,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier
): ts.Expression {
  const binaryBuilder = (array: Array<ts.TypeNode>): ts.BinaryExpression => {
    const lastType = array.pop() as ts.TypeNode;
    return and(
      array.length > 1 ? binaryBuilder(array) : typeHandler(array[0], program, objPropsAccess),
      typeHandler(lastType, program, objPropsAccess)
    );
  };
  return binaryBuilder(node.types.concat());
}

function typeAliasDeclarationHandler(
  node: ts.TypeAliasDeclaration,
  program: ts.Program,
  objPropsAccess: ts.PropertyAccessExpression | ts.Identifier
): ts.Expression {
  return typeHandler(node.type, program, objPropsAccess);
}
