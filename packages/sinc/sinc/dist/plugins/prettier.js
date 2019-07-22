var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "prettier"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const prettier_1 = __importDefault(require("prettier"));
    const run = function (context, content, options) {
        try {
            let output = "";
            if (content) {
                output = prettier_1.default.format(content, { parser: "babel" });
            }
            return {
                success: true,
                output
            };
        }
        catch (e) {
            throw e;
        }
    };
    exports.run = run;
});
