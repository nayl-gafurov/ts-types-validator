"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNonUnionPrimitives = void 0;
function isNonUnionPrimitives(obj) {
    var data = {
        NonUnionPrimitives: function (arg) {
            return [function () {
                    var result = typeof arg.str === "string";
                    if (!result) {
                        console.warn("\u001B\u001B[33mstr", "", "\u001B[36m MUST be type of: ", "\u001B[33mstring\u001B[39m");
                    }
                    return result;
                }, function () {
                    var result = typeof arg.num === "number";
                    if (!result) {
                        console.warn("\u001B\u001B[33mnum", "", "\u001B[36m MUST be type of: ", "\u001B[33mnumber\u001B[39m");
                    }
                    return result;
                }, function () {
                    var result = typeof arg.bool === "boolean";
                    if (!result) {
                        console.warn("\u001B\u001B[33mbool", "", "\u001B[36m MUST be type of: ", "\u001B[33mboolean\u001B[39m");
                    }
                    return result;
                }, function () {
                    var result = arg.null === null;
                    if (!result) {
                        console.warn("\u001B\u001B[33mnull", "", "\u001B[36m MUST be type of: ", "\u001B[33mnull\u001B[39m");
                    }
                    return result;
                }, function () {
                    var result = typeof arg.undefined === "undefined";
                    if (!result) {
                        console.warn("\u001B\u001B[33mundefined", "", "\u001B[36m MUST be type of: ", "\u001B[33mundefined\u001B[39m");
                    }
                    return result;
                }].every(function (item) { return item(); });
        }
    };
    return data.NonUnionPrimitives(obj);
}
exports.isNonUnionPrimitives = isNonUnionPrimitives;
