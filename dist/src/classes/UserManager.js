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
const { getUserFromMention } = helpers_1.default;
const DatabaseManager_1 = __importDefault(require("./DatabaseManager"));
const OutgoingMessageHandler_1 = __importDefault(require("./OutgoingMessageHandler"));
const ErrorReporter_1 = require("./ErrorReporter");
const messages_1 = __importDefault(require("../static/messages"));
class UserManager {
    constructor(client) {
        this._db = new DatabaseManager_1.default();
        this._client = client;
    }
    deleteUserAccount(user) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._db.removeUserAccount(user);
        });
    }
    signupNewUser(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._db.createNewUser(msg.author);
        });
    }
    checkBalance(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const balance = yield this._db.getBalance(user);
            if (balance != null) {
                OutgoingMessageHandler_1.default.sendToTrading(messages_1.default.checkBalance(balance));
            }
        });
    }
    grantMoney(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            const splitMsg = msg.content.split(/\s+/);
            if (splitMsg.length < 3) {
                ErrorReporter_1.warnChannel(messages_1.default.invalidCommandSyntax('!grantMoney @userMention $69.42'));
                return;
            }
            let toUser;
            try {
                toUser = yield getUserFromMention(this._client, splitMsg[1]);
            }
            catch (err) {
                ErrorReporter_1.warnChannel(messages_1.default.invalidCommandSyntax('!grantMoney @userMention $69.42'));
                return;
            }
            let dollarAmount = splitMsg[2];
            let centAmount;
            if (dollarAmount.includes('.')) {
                const decimalSplit = dollarAmount.split('.');
                if (decimalSplit.length > 2) {
                    ErrorReporter_1.warnChannel(messages_1.default.invalidCommandSyntax('!sendMoney @userMention $69.42'));
                    return;
                }
                centAmount = decimalSplit[1];
                if (centAmount.length === 1)
                    centAmount += '0';
                if (centAmount.length > 2) {
                    ErrorReporter_1.warnChannel(messages_1.default.invalidCommandSyntax('!sendMoney @userMention $69.42'));
                    return;
                }
                dollarAmount = decimalSplit[0];
            }
            else
                centAmount = '0';
            if (dollarAmount[0] === '$' || dollarAmount[1] === '$') {
                dollarAmount = dollarAmount.replace(/\$+/, '');
            }
            let totalAmount;
            if (dollarAmount[0] === '-') {
                totalAmount = Number(dollarAmount) * 100 - Number(centAmount);
            }
            else {
                totalAmount = Number(dollarAmount) * 100 + Number(centAmount);
            }
            if (isNaN(totalAmount)) {
                ErrorReporter_1.warnChannel(messages_1.default.invalidCommandSyntax('!sendMoney @userMention $69.42'));
                return;
            }
            try {
                this._db.grantFunds(toUser, totalAmount);
            }
            catch (err) {
                ErrorReporter_1.warnChannel(err);
            }
        });
    }
}
exports.default = UserManager;
//# sourceMappingURL=UserManager.js.map