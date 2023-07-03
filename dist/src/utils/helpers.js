"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Guard = void 0;
function Guard() {
    return function (target, methodName, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            if (this._client != null) {
                return originalMethod.apply(this, args);
            }
            else {
                throw new Error(`Cannot use ${target.constructor.name} until it has been init'd with client`);
            }
        };
        return descriptor;
    };
}
exports.Guard = Guard;
//# sourceMappingURL=helpers.js.map