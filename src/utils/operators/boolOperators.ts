import ts from 'typescript';
import { wrapToIdentifier } from './operators';

export const typeOf = (
  identifier: string | ts.PropertyAccessExpression | ts.Identifier,
  type: string
): ts.BinaryExpression =>
  ts.createBinary(
    ts.createTypeOf(typeof identifier === 'string' ? ts.createIdentifier(identifier) : identifier),
    ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
    ts.createStringLiteral(type)
  );

export const or = (firstBinary: ts.Expression, secondBinary: ts.Expression): ts.BinaryExpression =>
  ts.createBinary(firstBinary, ts.createToken(ts.SyntaxKind.BarBarToken), secondBinary);

export const and = (firstBinary: ts.Expression, secondBinary: ts.Expression): ts.BinaryExpression =>
  ts.createBinary(firstBinary, ts.createToken(ts.SyntaxKind.AmpersandAmpersandToken), secondBinary);

export const isNull = (identifier: string | ts.PropertyAccessExpression | ts.Identifier): ts.BinaryExpression =>
  ts.createBinary(wrapToIdentifier(identifier), ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken), ts.createNull());

export const isNotNull = (identifier: string | ts.PropertyAccessExpression | ts.Identifier): ts.BinaryExpression =>
  ts.createBinary(
    typeof identifier === 'string' ? ts.createIdentifier(identifier) : identifier,
    ts.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
    ts.createNull()
  );

export const isTypeOfObject = (identifier: string | ts.PropertyAccessExpression | ts.Identifier): ts.BinaryExpression =>
  and(typeOf(identifier, 'object'), isNotNull(identifier));

export const equal = (
  left: string | ts.Expression,
  right: string | ts.Expression,
  strict = true
): ts.BinaryExpression =>
  ts.createBinary(
    typeof left === 'string' ? ts.createIdentifier(left) : left,
    strict ? ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken) : ts.createToken(ts.SyntaxKind.EqualsEqualsToken),
    typeof right === 'string' ? ts.createIdentifier(right) : right
  );

export const notEqual = (
  left: string | ts.Expression,
  right: string | ts.Expression,
  strict = true
): ts.BinaryExpression =>
  ts.createBinary(
    typeof left === 'string' ? ts.createIdentifier(left) : left,
    strict
      ? ts.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken)
      : ts.createToken(ts.SyntaxKind.ExclamationEqualsToken),
    typeof right === 'string' ? ts.createIdentifier(right) : right
  );

export const isArray = (expression: string | ts.Expression): ts.CallExpression =>
  ts.createCall(ts.createPropertyAccess(ts.createIdentifier('Array'), ts.createIdentifier('isArray')), undefined, [
    typeof expression === 'string' ? ts.createIdentifier(expression) : expression,
  ]);

export const inObj = (
  propName: string | ts.StringLiteral,
  access: ts.PropertyAccessExpression | ts.LeftHandSideExpression | ts.Identifier
): ts.BinaryExpression =>
  ts.createBinary(
    typeof propName === 'string' ? ts.createStringLiteral(propName) : propName,
    ts.createToken(ts.SyntaxKind.InKeyword),
    access
  );

export const every = (
  access: ts.Expression,
  expression: ts.Expression | ts.ArrowFunction,
  opt?: { index?: boolean; arr?: boolean }
): ts.CallExpression => {
  const args = [
    ts.createParameter(undefined, undefined, undefined, ts.createIdentifier('item'), undefined, undefined, undefined),
  ];

  if (opt) {
    if (opt.index) {
      args.push(
        ts.createParameter(
          undefined,
          undefined,
          undefined,
          ts.createIdentifier('index'),
          undefined,
          undefined,
          undefined
        )
      );
    }

    if (opt.arr) {
      args.push(
        ts.createParameter(undefined, undefined, undefined, ts.createIdentifier('arr'), undefined, undefined, undefined)
      );
    }
  }

  return ts.createCall(
    ts.createPropertyAccess(access, ts.createIdentifier('every')),
    undefined,
    ts.isArrowFunction(expression)
      ? [expression]
      : [
          ts.createArrowFunction(
            undefined,
            undefined,
            args,
            undefined,
            ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            expression
          ),
        ]
  );
};
