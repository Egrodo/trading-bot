"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRADING_SIM_CHANNEL_ID = void 0;
const discord_js_1 = require("discord.js");
const TradingMessageHandler_1 = __importDefault(require("./classes/TradingMessageHandler"));
const ErrorReporter_1 = require("./classes/ErrorReporter");
const OutgoingMessageHandler_1 = require("./classes/OutgoingMessageHandler");
const AUTH = __importStar(require("../auth.json"));
const helpers_1 = require("./helpers");
const COMMAND_COOLDOWN = 1.5 * 1000;
exports.TRADING_SIM_CHANNEL_ID = '759562306417328148';
const client = new discord_js_1.Client();
function init() {
    const limitedMessageHandler = helpers_1.RateLimiter(COMMAND_COOLDOWN, MessageRouter);
    client.on('message', limitedMessageHandler);
    ErrorReporter_1.init(client);
    OutgoingMessageHandler_1.init(client);
}
function MessageRouter(msg) {
    var _a;
    if (((_a = msg === null || msg === void 0 ? void 0 : msg.channel) === null || _a === void 0 ? void 0 : _a.id) === exports.TRADING_SIM_CHANNEL_ID) {
        new TradingMessageHandler_1.default(client).onMessage(msg);
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