"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Discord = require("discord.js");
const TradingMessageHandler_1 = require("./classes/TradingMessageHandler");
const AUTH = require("../auth.json");
const helpers_1 = require("./helpers");
// 1.5 second cooldown to limit spam
const COMMAND_COOLDOWN = 1.5 * 1000;
const TRADING_SIM_CHANNEL_ID = '759562306417328148';
const client = new Discord.Client();
function init() {
    const limitedMessageHandler = helpers_1.RateLimiter(COMMAND_COOLDOWN, MessageHandler);
    client.on('message', limitedMessageHandler);
}
// Handles the direction of messages into their respective handler class
function MessageHandler(msg) {
    var _a;
    if (((_a = msg === null || msg === void 0 ? void 0 : msg.channel) === null || _a === void 0 ? void 0 : _a.id) === TRADING_SIM_CHANNEL_ID) {
        new TradingMessageHandler_1.default().onMessage(msg);
    }
}
console.log('Logging in...');
client.login(AUTH.token);
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    init();
});
client.on('error', (err) => {
    console.error('Failed to log in: ', err);
});
//# sourceMappingURL=bot.js.map