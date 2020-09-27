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
exports.errorReportToCreator = exports.warnChannel = exports.init = void 0;
const bot_1 = require("../bot");
let client;
function init(c) {
    client = c;
}
exports.init = init;
function warnChannel(msg, silent = false) {
    return __awaiter(this, void 0, void 0, function* () {
        // @ts-expect-error
        const tradingChannel = yield client.channels.fetch(bot_1.TRADING_SIM_CHANNEL_ID);
        let message = '';
        if (!silent) {
            message = 'Trading Bot Error: ';
        }
        message += msg;
        tradingChannel.send(message);
    });
}
exports.warnChannel = warnChannel;
function errorReportToCreator(msg, ...errorInformation) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: Send to me if serious error happens.
        console.error(msg);
        console.error(errorInformation); // Log this somewhere externally?
    });
}
exports.errorReportToCreator = errorReportToCreator;
//# sourceMappingURL=ErrorReporter.js.map