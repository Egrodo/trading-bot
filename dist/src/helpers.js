"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatBalanceToReadable = exports.isCommand = exports.RateLimiter = void 0;
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
function isCommand(msgContent, commandType) {
    if (msgContent.charAt(0) === '!') {
        return msgContent.substr(1, msgContent.length).trim().toLowerCase() === commandType;
    }
}
exports.isCommand = isCommand;
function formatBalanceToReadable(balance) {
    return `$${(balance / 100).toLocaleString()}`;
}
exports.formatBalanceToReadable = formatBalanceToReadable;
//# sourceMappingURL=helpers.js.map