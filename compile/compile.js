"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = __importDefault(require("typescript"));
const transformer_1 = __importDefault(require("../transformer"));
function compile(filePaths, target = typescript_1.default.ScriptTarget.ES5, writeFileCallback) {
    const program = typescript_1.default.createProgram(filePaths, {
        strict: true,
        noEmitOnError: true,
        suppressImplicitAnyIndexErrors: true,
        esModuleInterop: true,
        target
    });
    const transformers = {
        before: [transformer_1.default(program)],
        after: []
    };
    const { emitSkipped, diagnostics } = program.emit(undefined, writeFileCallback, undefined, false, transformers);
    if (emitSkipped) {
        throw new Error(diagnostics.map(diagnostic => diagnostic.messageText).join('\n'));
    }
}
exports.default = compile;
