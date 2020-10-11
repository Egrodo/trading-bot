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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = __importDefault(require("../helpers"));
const UserManager_1 = __importDefault(require("./UserManager"));
const bot_1 = require("../bot");
const messages_1 = __importDefault(require("../static/messages"));
const ErrorReporter_1 = require("./ErrorReporter");
const OutgoingMessageHandler_1 = __importDefault(require("./OutgoingMessageHandler"));
const { isCommand, isUserAdminOrMod, composeHelpCommand } = helpers_1.default;
class TradingMessageHandler {
    constructor(client) {
        this._userManager = new UserManager_1.default(client);
        this._client = client;
        this._client.channels
            .fetch(bot_1.TRADING_SIM_CHANNEL_ID)
            .then((channel) => (this._tradingChannel = channel));
    }
    onMessage(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            const { content } = msg;
            if (isCommand(content, 'signup')) {
                yield this._userManager.signupNewUser(msg);
            }
            else if (isCommand(content, 'deleteaccount')) {
                yield this._userManager.deleteUserAccount(msg.author);
            }
            else if (isCommand(content, 'getcashbalance', 'checkbalance', 'balance', 'balancecheck', 'getbalance')) {
                yield this._userManager.checkBalance(msg.author);
            }
            else if (isCommand(content, 'sendmoney', 'grantmoney', 'award', 'changebalance')) {
                const isAdmin = yield isUserAdminOrMod(this._client, msg.author);
                if (isAdmin) {
                    yield this._userManager.grantMoney(msg);
                }
                else {
                    ErrorReporter_1.warnChannel(messages_1.default.noPermission);
                }
            }
            else if (isCommand(content, 'help', 'commands', 'manual')) {
                OutgoingMessageHandler_1.default.sendToTrading(composeHelpCommand());
            }
        });
    }
}
exports.default = TradingMessageHandler;
//# sourceMappingURL=TradingMessageHandler.js.map