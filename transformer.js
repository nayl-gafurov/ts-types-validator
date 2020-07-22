"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeclarationsFromTypeReferenceNode = void 0;
const typescript_1 = __importDefault(require("typescript"));
const ChainManager_1 = require("./utils/ChainManager");
const interfaceList = new Map();
const dataObjName = "data";
const argName = "arg";
let intersectNodes;
let isIntersects = false;
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
                const cm = new ChainManager_1.ChainManager(program);
                if (typescript_1.default.isTypeReferenceNode(type)) {
                    let declaration = getDeclarationsFromTypeReferenceNode(type, program);
                    declaration = importSpecifierHandler(declaration, program);
                    if (declaration) {
                        if (typescript_1.default.isInterfaceDeclaration(declaration)) {
                            cm.init(declaration);
                            isIntersects = cm.intersectChains.length > 0;
                            intersectNodes = cm.intersectNodes;
                            expression = interfaceDeclarationHandler(declaration, program, true);
                            propsName = type.getText();
                        }
                    }
                }
                if (typescript_1.default.isTypeLiteralNode(type)) {
                    cm.init(type);
                    isIntersects = cm.intersectChains.length > 0;
                    intersectNodes = cm.intersectNodes;
                    expression = interfaceDeclarationHandler(type, program, typescript_1.default.createIdentifier(argName));
                    propsName = "object";
                }
                if (expression && propsName) {
                    const arr = [
                        typescript_1.default.createPropertyAssignment(typescript_1.default.createIdentifier(propsName), expression)
                    ];
                    interfaceList.forEach((data, name) => {
                        if (data) {
                            arr.push(typescript_1.default.createPropertyAssignment(typescript_1.default.createIdentifier(name), data));
                        }
                    });
                    const block = [];
                    if (cm.intersectChains.length > 0) {
                        block.push(generateMapForIntersectNodes(intersectNodes.map(node => node.name.getText())), getFunctionForIsIntersectObject());
                    }
                    block.push(typescript_1.default.createVariableStatement(undefined, typescript_1.default.createVariableDeclarationList([typescript_1.default.createVariableDeclaration(typescript_1.default.createIdentifier(dataObjName), undefined, typescript_1.default.createObjectLiteral(arr, true))], typescript_1.default.NodeFlags.Const)), typescript_1.default.createReturn(typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier(dataObjName), typescript_1.default.createIdentifier(propsName)), undefined, [typescript_1.default.createIdentifier(typeParamName)])));
                    return typescript_1.default.createFunctionDeclaration(undefined, exportModifier ? [typescript_1.default.createModifier(typescript_1.default.SyntaxKind.ExportKeyword)] : undefined, undefined, typescript_1.default.createIdentifier(name), undefined, [typescript_1.default.createParameter(undefined, undefined, undefined, typescript_1.default.createIdentifier(typeParamName), undefined, typescript_1.default.createKeywordTypeNode(typescript_1.default.SyntaxKind.ObjectKeyword), undefined)], undefined, typescript_1.default.createBlock(block, true));
                }
            }
        }
    }
    return;
}
function importSpecifierHandler(node, program) {
    if (node && typescript_1.default.isImportSpecifier(node)) {
        const checker = program.getTypeChecker();
        const symbol = checker.getSymbolAtLocation(node.name);
        if (symbol) {
            const type = checker.getDeclaredTypeOfSymbol(symbol);
            return type.symbol.declarations[0];
        }
    }
    return node;
}
function generateMapForIntersectNodes(intersectNodeNames) {
    return typescript_1.default.createVariableStatement(undefined, typescript_1.default.createVariableDeclarationList([typescript_1.default.createVariableDeclaration(typescript_1.default.createIdentifier("objectStore"), undefined, typescript_1.default.createNew(typescript_1.default.createIdentifier("Map"), undefined, [typescript_1.default.createArrayLiteral(intersectNodeNames.map(name => typescript_1.default.createArrayLiteral([
                typescript_1.default.createStringLiteral(name),
                typescript_1.default.createNew(typescript_1.default.createIdentifier("Set"), undefined, [])
            ], false)), true)]))], typescript_1.default.NodeFlags.Const));
}
function getFunctionForIsIntersectObject() {
    return typescript_1.default.createVariableStatement(undefined, typescript_1.default.createVariableDeclarationList([typescript_1.default.createVariableDeclaration(typescript_1.default.createIdentifier("isIntersectObject"), undefined, typescript_1.default.createArrowFunction(undefined, undefined, [
            typescript_1.default.createParameter(undefined, undefined, undefined, typescript_1.default.createIdentifier("interfaceName"), undefined, undefined, undefined),
            typescript_1.default.createParameter(undefined, undefined, undefined, typescript_1.default.createIdentifier("obj"), undefined, undefined, undefined)
        ], undefined, typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), typescript_1.default.createBlock([typescript_1.default.createIf(typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier("objectStore"), typescript_1.default.createIdentifier("has")), undefined, [typescript_1.default.createIdentifier("interfaceName")]), typescript_1.default.createBlock([
                typescript_1.default.createVariableStatement(undefined, typescript_1.default.createVariableDeclarationList([typescript_1.default.createVariableDeclaration(typescript_1.default.createIdentifier("objects"), undefined, typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier("objectStore"), typescript_1.default.createIdentifier("get")), undefined, [typescript_1.default.createIdentifier("interfaceName")]))], typescript_1.default.NodeFlags.Const)),
                typescript_1.default.createIf(typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier("objects"), typescript_1.default.createIdentifier("has")), undefined, [typescript_1.default.createIdentifier("obj")]), typescript_1.default.createBlock([typescript_1.default.createReturn(typescript_1.default.createTrue())], true), typescript_1.default.createBlock([
                    typescript_1.default.createExpressionStatement(typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier("objects"), typescript_1.default.createIdentifier("add")), undefined, [typescript_1.default.createIdentifier("obj")])),
                    typescript_1.default.createReturn(typescript_1.default.createFalse())
                ], true))
            ], true), undefined)], true)))], typescript_1.default.NodeFlags.Const));
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
exports.getDeclarationsFromTypeReferenceNode = getDeclarationsFromTypeReferenceNode;
function typeReferenceHandler(node, program, objIdentifier) {
    let declaration = getDeclarationsFromTypeReferenceNode(node, program);
    declaration = importSpecifierHandler(declaration, program);
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
    return typescript_1.default.createLiteral("undefined");
}
function classDeclarationHandler(node, program) {
    const name = node.name;
    return typescript_1.default.createBinary(typescript_1.default.createIdentifier("obj"), typescript_1.default.createToken(typescript_1.default.SyntaxKind.InstanceOfKeyword), typescript_1.default.createIdentifier(name.getText()));
}
function interfaceDeclarationHandler(node, program, withProps) {
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
    const bloc = (objPropsAccess) => {
        if (isIntersects && typescript_1.default.isInterfaceDeclaration(node)) {
            if (intersectNodes.some(item => item === node)) {
                return [
                    typescript_1.default.createExpressionStatement(typescript_1.default.createCall(typescript_1.default.createIdentifier("isIntersectObject"), undefined, [
                        typescript_1.default.createStringLiteral(node.name.getText()),
                        typescript_1.default.createIdentifier(argName)
                    ])),
                    typescript_1.default.createReturn(call(objPropsAccess))
                ];
            }
        }
        return [
            typescript_1.default.createReturn(call(objPropsAccess))
        ];
    };
    const func = (objPropsAccess) => typescript_1.default.createArrowFunction(undefined, undefined, [typescript_1.default.createParameter(undefined, undefined, undefined, typescript_1.default.createIdentifier("arg"), undefined, undefined, undefined)], undefined, typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), typescript_1.default.createBlock(bloc(objPropsAccess), false));
    if (typescript_1.default.isTypeLiteralNode(node)) {
        return call(withProps);
    }
    if (typeof withProps === "boolean" && withProps) {
        interfaceList.set(node.name.getText(), undefined);
        return func(typescript_1.default.createIdentifier(argName));
    }
    else {
        if (!interfaceList.has(node.name.getText())) {
            interfaceList.set(node.name.getText(), undefined);
            interfaceList.set(node.name.getText(), func(typescript_1.default.createIdentifier(argName)));
        }
        const condition = typescript_1.default.createBinary(typescript_1.default.createBinary(typescript_1.default.createTypeOf(withProps), typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsEqualsEqualsToken), typescript_1.default.createStringLiteral("object")), typescript_1.default.createToken(typescript_1.default.SyntaxKind.AmpersandAmpersandToken), typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier(dataObjName), typescript_1.default.createIdentifier(node.name.getText())), undefined, [withProps]));
        if (isIntersects && intersectNodes.some(item => item === node)) {
            return typescript_1.default.createParen(typescript_1.default.createBinary(typescript_1.default.createCall(typescript_1.default.createIdentifier("isIntersectObject"), undefined, [
                typescript_1.default.createStringLiteral(node.name.getText()),
                withProps
            ]), typescript_1.default.createToken(typescript_1.default.SyntaxKind.BarBarToken), condition));
        }
        else {
            return condition;
        }
    }
}
function propertySignatureHandler(node, program, objIdentifier) {
    const nodeType = node.type;
    if (nodeType) {
        const access = typescript_1.default.createPropertyAccess(objIdentifier, typescript_1.default.createIdentifier(node.name.getText()));
        const expression = typeHandler(nodeType, program, access);
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
        const result = () => {
            const insideBinary = typescript_1.default.createBinary(typescript_1.default.createBinary(typescript_1.default.createStringLiteral(access.name.text), typescript_1.default.createToken(typescript_1.default.SyntaxKind.InKeyword), access.expression), typescript_1.default.createToken(typescript_1.default.SyntaxKind.AmpersandAmpersandToken), expression);
            if (node.questionToken) {
                return typescript_1.default.createVariableStatement(undefined, typescript_1.default.createVariableDeclarationList([typescript_1.default.createVariableDeclaration(typescript_1.default.createIdentifier("result"), undefined, typescript_1.default.createBinary(typescript_1.default.createBinary(typescript_1.default.createTypeOf(access), typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsEqualsEqualsToken), typescript_1.default.createStringLiteral("undefined")), typescript_1.default.createToken(typescript_1.default.SyntaxKind.BarBarToken), insideBinary))], typescript_1.default.NodeFlags.None));
            }
            else {
                return typescript_1.default.createVariableStatement(undefined, typescript_1.default.createVariableDeclarationList([typescript_1.default.createVariableDeclaration(typescript_1.default.createIdentifier("result"), undefined, insideBinary)], typescript_1.default.NodeFlags.Const));
            }
        };
        const block = [
            result(),
            typescript_1.default.createIf(typescript_1.default.createPrefix(typescript_1.default.SyntaxKind.ExclamationToken, typescript_1.default.createIdentifier("result")), typescript_1.default.createBlock([typescript_1.default.createExpressionStatement(typescript_1.default.createCall(typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier("console"), typescript_1.default.createIdentifier("warn")), undefined, [
                    typescript_1.default.createStringLiteral("\x1b[33m" + getFullAccessName(access)),
                    typescript_1.default.createStringLiteral("\x1b[36m MUST be type of: "),
                    typescript_1.default.createStringLiteral("\x1b[33m" + nodeType.getText() + "\x1b[39m"),
                ]))], true), undefined),
            typescript_1.default.createReturn(typescript_1.default.createIdentifier("result"))
        ];
        return typescript_1.default.createArrowFunction(undefined, undefined, [], undefined, typescript_1.default.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), typescript_1.default.createBlock(block, true));
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
