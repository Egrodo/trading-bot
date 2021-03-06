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
const nano_1 = __importDefault(require("nano"));
const auth_json_1 = require("../../auth.json");
const OutgoingMessageHandler_1 = __importDefault(require("../stateful/OutgoingMessageHandler"));
const ErrorReporter_1 = require("../stateful/ErrorReporter");
const helpers_1 = __importDefault(require("../helpers"));
const { formatAmountToReadable } = helpers_1.default;
const messages_1 = __importDefault(require("../static/messages"));
const DB_URL = `http://${auth_json_1.dbUser}:${auth_json_1.dbPass}@174.138.58.238:5984`;
class DatabaseManager {
    constructor() {
        this._dbConnection = nano_1.default(DB_URL);
    }
    connectToUsersDb() {
        this._userDb = this._dbConnection.use('users');
    }
    getUserDocument(user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._userDb)
                this.connectToUsersDb();
            const response = {};
            try {
                response.userDoc = yield this._userDb.get(user.id);
            }
            catch (err) {
                response.error = err.reason;
            }
            return response;
        });
    }
    _modifyBalance(toUser, newBalance) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let userDocResult;
            try {
                userDocResult = yield this.getUserDocument(toUser);
            }
            catch (err) {
                console.log('ERROR');
                console.log(err);
                return;
            }
            if (userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.error) {
                if (((_a = userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.userDoc) === null || _a === void 0 ? void 0 : _a.deleted) === true ||
                    (userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.error) === 'deleted') {
                    ErrorReporter_1.warnChannel(messages_1.default.noAccountForUser(toUser.username));
                    return;
                }
                else {
                    ErrorReporter_1.warnChannel(messages_1.default.failedToGetAccount);
                    ErrorReporter_1.errorReportToCreator('UserDocResult returned unrecognized data?', userDocResult);
                    return;
                }
            }
            const updatedUserDoc = Object.assign(Object.assign({}, userDocResult.userDoc), { balance: newBalance });
            try {
                const result = yield this._userDb.insert(updatedUserDoc);
                if (result.ok === true) {
                    return true;
                }
                else {
                    ErrorReporter_1.warnChannel(messages_1.default.failedToGetAccount);
                    ErrorReporter_1.errorReportToCreator('User document update failed in decreaseBalance', result, userDocResult.userDoc);
                    return false;
                }
            }
            catch (err) {
                ErrorReporter_1.warnChannel(messages_1.default.failedToGetAccount);
                ErrorReporter_1.errorReportToCreator('User document update failed in decreaseBalance', err, userDocResult.userDoc);
                return false;
            }
        });
    }
    removeUserAccount(user) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const userDocResult = yield this.getUserDocument(user);
            if (((_a = userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.userDoc) === null || _a === void 0 ? void 0 : _a.deleted) === true ||
                (userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.error) === 'deleted') {
                ErrorReporter_1.warnChannel(messages_1.default.noAccount);
                return;
            }
            else if ((userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.error) === 'failed') {
                ErrorReporter_1.warnChannel(messages_1.default.failedToDelete);
                ErrorReporter_1.errorReportToCreator('User document creation failed? ', userDocResult.error, user);
                return;
            }
            const updatedUser = Object.assign(Object.assign({}, userDocResult.userDoc), { deleted: true });
            const result = yield this._userDb.insert(updatedUser);
            if (result.ok) {
                OutgoingMessageHandler_1.default.sendToTrading(messages_1.default.deleteSuccess);
            }
            else {
                ErrorReporter_1.warnChannel(messages_1.default.failedToDelete);
                ErrorReporter_1.errorReportToCreator('User document update failed in removeUserAccount', result, user);
            }
        });
    }
    createNewUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const userDocResult = yield this.getUserDocument(user);
            if ((userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.error) === 'failed') {
                ErrorReporter_1.warnChannel(messages_1.default.failedToDelete);
                ErrorReporter_1.errorReportToCreator('User document creation failed in createNewUser', userDocResult, user);
                return;
            }
            if (!userDocResult.userDoc) {
                try {
                    const NewUser = {
                        _id: user.id,
                        balance: 10000 * 100,
                        currentHoldings: {},
                        deleted: false,
                    };
                    const result = yield this._userDb.insert(NewUser);
                    if (result.ok === true) {
                        OutgoingMessageHandler_1.default.sendToTrading(messages_1.default.signupSuccess);
                    }
                    else {
                        ErrorReporter_1.warnChannel(messages_1.default.signupFailure);
                        ErrorReporter_1.errorReportToCreator('User document creation failed in createNewUser', result, user);
                    }
                }
                catch (err) {
                    ErrorReporter_1.warnChannel(messages_1.default.failedToDelete);
                    ErrorReporter_1.errorReportToCreator('User document creation failed in createNewUser', err, user);
                    return;
                }
            }
            else if (userDocResult.userDoc.deleted === true) {
                const updatedUser = Object.assign(Object.assign({}, userDocResult.userDoc), { deleted: false });
                const result = yield this._userDb.insert(updatedUser);
                if (result.ok === true) {
                    OutgoingMessageHandler_1.default.sendToTrading(messages_1.default.signupAgainSuccess(formatAmountToReadable(userDocResult.userDoc.balance)));
                }
                else {
                    ErrorReporter_1.warnChannel(messages_1.default.signupFailure);
                    ErrorReporter_1.errorReportToCreator('User document update failed createNewUser', result, user);
                }
            }
            else if (userDocResult.userDoc) {
                ErrorReporter_1.warnChannel(`You already have an account.`);
                return;
            }
        });
    }
    getBalance(user) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const userDocResult = yield this.getUserDocument(user);
            if (((_a = userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.userDoc) === null || _a === void 0 ? void 0 : _a.deleted) === true ||
                (userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.error) === 'deleted') {
                ErrorReporter_1.warnChannel(messages_1.default.noAccount);
            }
            else if ((userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.error) === 'missing') {
                ErrorReporter_1.warnChannel(messages_1.default.noAccount);
            }
            else if ((userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.error) === 'failed') {
                ErrorReporter_1.warnChannel(messages_1.default.failedToGetAccount);
            }
            else if (userDocResult.userDoc) {
                return userDocResult.userDoc.balance;
            }
            else {
                ErrorReporter_1.warnChannel(messages_1.default.failedToGetAccount);
                ErrorReporter_1.errorReportToCreator('UserDocResult returned unrecognized data?', userDocResult);
            }
        });
    }
    increaseUserBalance(user, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const userBalance = yield this.getBalance(user);
            const newBalance = userBalance + amount;
            if (!Number.isNaN(newBalance)) {
                return this._modifyBalance(user, newBalance);
            }
            return false;
        });
    }
    decreaseUserBalance(user, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const userBalance = yield this.getBalance(user);
            const newBalance = userBalance - amount;
            if (!Number.isNaN(Number(newBalance))) {
                return this._modifyBalance(user, newBalance);
            }
            return false;
        });
    }
    addStocksToUserAccount(user, ticker, buyPrice, companyName, amount) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let userDocResult;
            try {
                userDocResult = yield this.getUserDocument(user);
            }
            catch (err) {
                console.log('ERROR');
                console.log(err);
                return;
            }
            if (userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.error) {
                if (((_a = userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.userDoc) === null || _a === void 0 ? void 0 : _a.deleted) === true ||
                    (userDocResult === null || userDocResult === void 0 ? void 0 : userDocResult.error) === 'missing') {
                    ErrorReporter_1.warnChannel(messages_1.default.noAccountForUser(user.username));
                    return;
                }
                else {
                    ErrorReporter_1.warnChannel(messages_1.default.failedToGetAccount);
                    ErrorReporter_1.errorReportToCreator('UserDocResult returned unrecognized data?', userDocResult);
                    return;
                }
            }
            const { currentHoldings } = userDocResult.userDoc;
            const newTrade = {
                ticker,
                price: buyPrice,
                amountTraded: amount,
                timestamp: Date.now(),
                transactionType: 'buy',
            };
            let pastHolding = currentHoldings[ticker];
            const pastTradeHistory = (pastHolding === null || pastHolding === void 0 ? void 0 : pastHolding.tradeHistory) || [];
            const newAmount = (pastHolding === null || pastHolding === void 0 ? void 0 : pastHolding.amountOwned) ? pastHolding.amountOwned + amount
                : amount;
            const newHolding = {
                companyName,
                amountOwned: newAmount,
                tradeHistory: [...pastTradeHistory, newTrade],
            };
            const updatedUserDoc = Object.assign(Object.assign({}, userDocResult.userDoc), { currentHoldings: Object.assign(Object.assign({}, userDocResult.userDoc.currentHoldings), { [ticker]: newHolding }) });
            try {
                const result = yield this._userDb.insert(updatedUserDoc, {
                    rev: updatedUserDoc._rev,
                });
                if (result.ok === true) {
                    return newHolding;
                }
                else {
                    ErrorReporter_1.warnChannel(messages_1.default.failedToGetAccount);
                    ErrorReporter_1.errorReportToCreator('User document update failed in addStocksToUserAccount', result, userDocResult.userDoc);
                }
            }
            catch (err) {
                ErrorReporter_1.warnChannel(messages_1.default.failedToGetAccount);
                ErrorReporter_1.errorReportToCreator('User document update failed in addStocksToUserAccount', err, userDocResult.userDoc);
            }
        });
    }
}
exports.default = DatabaseManager;
//# sourceMappingURL=DatabaseManager.js.map