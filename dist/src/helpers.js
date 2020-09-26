"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
// User specific debounce function
function RateLimiter(delay, fn) {
    const userMap = new Map();
    return (msg) => {
        // Don't rate limit myself.
        if (msg.author.bot) {
            return;
        }
        if (userMap.has(msg.author.id)) {
            clearTimeout(userMap.get(msg.author.id));
        }
        userMap.set(msg.author.id, setTimeout(() => {
            fn(msg);
            userMap.delete(msg.author.id);
        }, delay));
    };
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=helpers.js.map