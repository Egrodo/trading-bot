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
exports.sendToTrading = exports.init = void 0;
const bot_1 = require("../bot");
let client;
function init(c) {
    client = c;
}
exports.init = init;
function sendToTrading(...msgs) {
    return __awaiter(this, void 0, void 0, function* () {
        const tradingChannel = yield client.channels.fetch(bot_1.TRADING_SIM_CHANNEL_ID);
        msgs.forEach((msg) => tradingChannel.send(msg));
    });
}
exports.sendToTrading = sendToTrading;
exports.default = { sendToTrading };
//# sourceMappingURL=OutgoingMessageHandler.js.map