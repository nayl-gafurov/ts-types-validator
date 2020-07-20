"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = __importDefault(require("typescript"));
const interfaceList = new Map();
const dataObjName = "data";
const argName = "arg";
function transformer(program) {
    return (context) => (file) => {
        return visitNode(file, program, context);
    };
}
exports.default = transformer;
function visitNode(node, program, context) {
    if (typescript_1.default.isFunctionDeclaration(node) && node.modifiers ? node.modifiers.some((mod) => mod.getText() === "declare") : false) {
        return visiterForFunction(node, program);
    }
    return typescript_1.default.visitEachChild(node, childNode => visitNode(childNode, program, context), context);
}
function visiterForFunction(node, program) {
    if (typescript_1.default.isFunctionDeclaration(node)) {
        const exportModifier = node.modifiers ? node.modifiers.some((mod) => mod.getText() === "export") : false;
        const typePredicate = node.type;
        if (typePredicate !== undefined && typescript_1.default.isTypePredicateNode(typePredicate)) {
            const typeParamName = typePredicate.parameterName.getText();
            const name = node.name ? node.name.getText() : "is" + typeParamName;
            const type = typePredicate.type;
            if (type !== undefined && type.kind !== 125) {
                let expression;
                let propsName;
                if (typescript_1.default.isTypeReferenceNode(type)) {
                    const declaration = getDeclarationsFromTypeReferenceNode(type, program);
                    if (declaration && typescript_1.default.isInterfaceDeclaration(declaration)) {
                        expression = interfaceDeclarationHandler(declaration, program, true);
                        propsName = type.getText();
                    }
                }
                if (typescript_1.default.isTypeLiteralNode(type)) {
                    expression = interfaceDeclarationHandler(type, program, typescript_1.default.createIdentifier(argName));
                    propsName = "object";
                }
                if (expression && propsName) {
                    const arr = [
                        typescript_1.default.createPropertyAssignment(typescript_1.default.createIdentifier(propsName), expression)
                    ];
                    interfaceList.forEach((data, name) => {
                        arr.push(typescript_1.default.createPropertyAssignment(typescript_1.default.createIdentifier(name), data));
                    });
                    return typescript_1.default.createFunctionDeclaration(undefined, undefined, undefined, typescript_1.default.createIdentifier(name), undefined, [typescript_1.default.createParameter(undefined, undefined, undefined, typescript_1.default.createIdentifier(typeParamName), undefined, typescript_1.default.createKeywordTypeNode(typescript_1.default.SyntaxKind.ObjectKeyword), undefined)], undefined, typescript_1.default.createBlock([typescript_1.default.createVariableStatement(undefined, typescript_1.default.createVariableDeclarationList([typescript_1.default.createVariableDeclaration(typescript_1.default.createIdentifier(dataObjName), undefined, typescript_1.default.createObjectLiteral(arr, true))], typescript_1.default.NodeFlags.Const)),
                        typescript_1.default.createReturn(typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier(dataObjName), typescript_1.default.createIdentifier(propsName)), undefined, [typescript_1.default.createIdentifier(typeParamName)]))
                    ], true));
                }
            }
        }
    }
    return;
}
function getDeclarationsFromTypeReferenceNode(node, program) {
    const typeReferenceIdentifier = node.typeName;
    const typeChecker = program.getTypeChecker();
    const symbol = typeChecker.getSymbolAtLocation(typeReferenceIdentifier);
    const declarations = symbol === null || symbol === void 0 ? void 0 : symbol.declarations;
    if (declarations && declarations.length > 0) {
        return declarations[0];
    }
    return;
}
function typeReferenceHandler(node, program, objIdentifier) {
    const declaration = getDeclarationsFromTypeReferenceNode(node, program);
    if (declaration) {
        if (typescript_1.default.isInterfaceDeclaration(declaration)) {
            return interfaceDeclarationHandler(declaration, program, objIdentifier);
        }
        else if (typescript_1.default.isClassDeclaration(declaration)) {
            return classDeclarationHandler(declaration, program);
        }
        else if (typescript_1.default.isTypeAliasDeclaration(declaration)) {
            return typeAliasDeclarationHandler(declaration, program, objIdentifier);
        }
    }
    console.log(declaration);
    return typescript_1.default.createLiteral("undefined");
}
function classDeclarationHandler(node, program) {
    const name = node.name;
    return typescript_1.default.createBinary(typescript_1.default.createIdentifier("obj"), typescript_1.default.createToken(typescript_1.default.SyntaxKind.InstanceOfKeyword), typescript_1.default.createIdentifier(name.getText()));
}
function interfaceDeclarationHandler(node, program, withProps) {
    let objPropsAccess = typeof withProps === "boolean" ? typescript_1.default.createIdentifier(argName) : withProps;
    const getProps = (objPropsAccess) => {
        const props = [];
        (node.members).forEach((propertySignature) => {
            if (typescript_1.default.isPropertySignature(propertySignature)) {
                const expression = propertySignatureHandler(propertySignature, program, objPropsAccess);
                if (expression) {
                    props.push(expression);
                }
            }
        });
        return props;
    };
    const call = (objPropsAccess) => typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createArrayLiteral(getProps(objPropsAccess), true), typescript_1.default.createIdentifier("every")), undefined, [typescript_1.default.createArrowFunction(undefined, undefined, [typescript_1.default.createParameter(undefined, undefined, undefined, typescript_1.default.createIdentifier("item"), undefined, undefined, undefined)], undefined, typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), typescript_1.default.createCall(typescript_1.default.createIdentifier("item"), undefined, []))]);
    const func = (objPropsAccess) => typescript_1.default.createArrowFunction(undefined, undefined, [typescript_1.default.createParameter(undefined, undefined, undefined, typescript_1.default.createIdentifier(argName), undefined, undefined, undefined)
    ], undefined, typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), call(objPropsAccess));
    if (typescript_1.default.isTypeLiteralNode(node)) {
        return call(withProps);
    }
    if (typeof withProps === "boolean" && withProps) {
        return func(typescript_1.default.createIdentifier(argName));
    }
    else {
        interfaceList.set(node.name.getText(), func(typescript_1.default.createIdentifier(argName)));
        return typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier(dataObjName), typescript_1.default.createIdentifier(node.name.getText())), undefined, [withProps]);
    }
}
function propertySignatureHandler(node, program, objIdentifier) {
    if (node.type) {
        const access = typescript_1.default.createPropertyAccess(objIdentifier, typescript_1.default.createIdentifier(node.name.getText()));
        const expression = typeHandler(node.type, program, access);
        const getFullAccessName = (access, result = "") => {
            if (result.length > 0) {
                result = `${access.name.text}.${result}`;
            }
            else {
                result = access.name.text;
            }
            if (typescript_1.default.isPropertyAccessExpression(access.expression)) {
                return getFullAccessName(access.expression, result);
            }
            return result;
        };
        return typescript_1.default.createArrowFunction(undefined, undefined, [], undefined, typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), typescript_1.default.createBlock([
            typescript_1.default.createVariableStatement(undefined, typescript_1.default.createVariableDeclarationList([typescript_1.default.createVariableDeclaration(typescript_1.default.createIdentifier("result"), undefined, typescript_1.default.createBinary(typescript_1.default.createBinary(typescript_1.default.createStringLiteral(access.name.text), typescript_1.default.createToken(typescript_1.default.SyntaxKind.InKeyword), access.expression), typescript_1.default.createToken(typescript_1.default.SyntaxKind.AmpersandAmpersandToken), expression))], typescript_1.default.NodeFlags.Const)),
            typescript_1.default.createIf(typescript_1.default.createPrefix(typescript_1.default.SyntaxKind.ExclamationToken, typescript_1.default.createIdentifier("result")), typescript_1.default.createBlock([typescript_1.default.createExpressionStatement(typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier("console"), typescript_1.default.createIdentifier("warn")), undefined, [typescript_1.default.createStringLiteral(getFullAccessName(access) + " MUST be : " + node.type.getText())]))], true), undefined),
            typescript_1.default.createReturn(typescript_1.default.createIdentifier("result"))
        ], true));
    }
    else {
        return;
    }
}
function arrayReferenceNodeHandler(node, program, objIdentifier) {
    const args = node.typeArguments;
    return typescript_1.default.createBinary(typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier("Array"), typescript_1.default.createIdentifier("isArray")), undefined, [objIdentifier]), typescript_1.default.createToken(typescript_1.default.SyntaxKind.AmpersandAmpersandToken), typescript_1.default.createCall(typescript_1.default.createPropertyAccess(objIdentifier, typescript_1.default.createIdentifier("every")), undefined, [
        typescript_1.default.createArrowFunction(undefined, undefined, [typescript_1.default.createParameter(undefined, undefined, undefined, typescript_1.default.createIdentifier("item"), undefined, undefined, undefined)], undefined, typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), typeHandler(args[0], program, typescript_1.default.createIdentifier("item")))
    ]));
}
function typeHandler(node, program, objPropsAccess) {
    if (typescript_1.default.isTypeReferenceNode(node)) {
        if (node.typeName.getText() === "Array" && node.typeArguments) {
            return arrayReferenceNodeHandler(node, program, objPropsAccess);
        }
        return typeReferenceHandler(node, program, objPropsAccess);
    }
    else if (typescript_1.default.isTypeLiteralNode(node)) {
        return interfaceDeclarationHandler(node, program, objPropsAccess);
    }
    else if (typescript_1.default.isUnionTypeNode(node)) {
        return unionTypeHandler(node, program, objPropsAccess);
    }
    else if (typescript_1.default.isIntersectionTypeNode(node)) {
        return intersectionTypeHandler(node, program, objPropsAccess);
    }
    else if (typescript_1.default.isLiteralTypeNode(node)) {
        return literalTypeHandler(node, program, objPropsAccess);
    }
    else if (typescript_1.default.isFunctionTypeNode(node)) {
        return functionTypeHandler(node, objPropsAccess);
    }
    else {
        return simpleTypeHandler(node, objPropsAccess);
    }
}
function simpleTypeHandler(node, objPropsAccess) {
    return typescript_1.default.createBinary(typescript_1.default.createTypeOf(objPropsAccess), typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsEqualsEqualsToken), typescript_1.default.createStringLiteral(node.getText()));
}
function functionTypeHandler(node, objPropsAccess) {
    return typescript_1.default.createBinary(typescript_1.default.createTypeOf(objPropsAccess), typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsEqualsEqualsToken), typescript_1.default.createStringLiteral("function"));
}
function literalTypeHandler(node, program, objPropsAccess) {
    if (typescript_1.default.isLiteralExpression(node.literal)) {
        typescript_1.default.isNumericLiteral(node.literal);
        return typescript_1.default.createBinary(objPropsAccess, typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsEqualsEqualsToken), typescript_1.default.isNumericLiteral(node.literal) ? typescript_1.default.createNumericLiteral(node.literal.text) : typescript_1.default.createStringLiteral(node.literal.text));
    }
    else {
        return typescript_1.default.createBinary(objPropsAccess, typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsEqualsEqualsToken), typescript_1.default.createIdentifier(node.literal.getText()));
    }
}
function unionTypeHandler(node, program, objPropsAccess) {
    let types;
    let lastType;
    if (Array.isArray(node)) {
        types = node;
        lastType = node.pop();
    }
    else {
        types = node.types.concat();
        lastType = types.pop();
    }
    return typescript_1.default.createBinary(types.length > 1 ? unionTypeHandler(types, program, objPropsAccess) :
        typeHandler(types[0], program, objPropsAccess), typescript_1.default.createToken(typescript_1.default.SyntaxKind.BarBarToken), typeHandler(lastType, program, objPropsAccess));
}
function intersectionTypeHandler(node, program, objPropsAccess) {
    let types;
    let lastType;
    if (Array.isArray(node)) {
        types = node;
        lastType = node.pop();
    }
    else {
        types = node.types.concat();
        lastType = types.pop();
    }
    return typescript_1.default.createBinary(types.length > 1 ? intersectionTypeHandler(types, program, objPropsAccess) :
        typeHandler(types[0], program, objPropsAccess), typescript_1.default.createToken(typescript_1.default.SyntaxKind.AmpersandAmpersandToken), typeHandler(lastType, program, objPropsAccess));
}
function typeAliasDeclarationHandler(node, program, objPropsAccess) {
    return typeHandler(node.type, program, objPropsAccess);
}
