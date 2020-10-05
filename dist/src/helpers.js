"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFromMention = exports.isUserAdminOrMod = exports.formatAmountToReadable = exports.isCommand = exports.RateLimiter = void 0;
const SERVER_ID = '482608530105434112';
function RateLimiter(delay, fn) {
    const userMap = new Map();
    return (msg) => {
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
    const message = msgContent.trim();
    if (message.charAt(0) === '!') {
        const commandSubStr = message.split(/\s+/)[0];
        return commandSubStr.substring(1, message.length).trim().toLowerCase() === commandType;
    }
}
exports.isCommand = isCommand;
function formatAmountToReadable(balance) {
    if (balance < 0) {
        return `-$${Math.abs(balance / 100).toLocaleString()}`;
    }
    return `$${(balance / 100).toLocaleString()}`;
}
exports.formatAmountToReadable = formatAmountToReadable;
function getUserFromMention(client, mention) {
    if (!mention)
        return;
    if (mention.startsWith('<@') && mention.endsWith('>')) {
        mention = mention.slice(2, -1);
        if (mention.startsWith('!')) {
            mention = mention.slice(1);
        }
        return client.users.fetch(mention);
    }
    else if (!isNaN(Number(mention))) {
        return client.users.fetch(mention);
    }
    return null;
}
exports.getUserFromMention = getUserFromMention;
function isUserAdminOrMod(client, user) {
    return __awaiter(this, void 0, void 0, function* () {
        const guild = yield client.guilds.fetch(SERVER_ID);
        const member = yield guild.members.fetch(user);
        return member.hasPermission('ADMINISTRATOR');
    });
}
exports.isUserAdminOrMod = isUserAdminOrMod;
//# sourceMappingURL=helpers.js.map