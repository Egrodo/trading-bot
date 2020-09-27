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
const OutgoingMessageHandler_1 = __importDefault(require("./OutgoingMessageHandler"));
const ErrorReporter_1 = require("./ErrorReporter");
const helpers_1 = require("../helpers");
const messages_1 = __importDefault(require("../static/messages"));
const DB_URL = `http://${auth_json_1.dbUser}:${auth_json_1.dbPass}@174.138.58.238:5984`;
class DatabaseManager {
    constructor() {
        this._dbConnection = nano_1.default(DB_URL);
    }
    connectToUsersDb() {
        this._userDb = this._dbConnection.use('users');
    }
    getExistingUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userDoc = yield this._userDb.get(user.id);
                return userDoc;
            }
            catch (err) {
                console.log(err);
                return;
            }
        });
    }
    removeUserAccount(user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._userDb)
                this.connectToUsersDb();
            let userDoc;
            try {
                userDoc = yield this._userDb.get(user.id);
            }
            catch (err) {
                if (err.reason === 'deleted') {
                    ErrorReporter_1.warnChannel(messages_1.default.noAccount);
                    return;
                }
                else {
                    ErrorReporter_1.warnChannel(messages_1.default.failedToDelete);
                    ErrorReporter_1.errorReportToCreator('User document creation failed? ', err, user);
                    return;
                }
            }
            if (userDoc.deleted) {
                ErrorReporter_1.warnChannel(messages_1.default.noAccount);
                return;
            }
            const updatedUser = Object.assign(Object.assign({}, userDoc), { deleted: true });
            const result = yield this._userDb.insert(updatedUser);
            if (result.ok) {
                OutgoingMessageHandler_1.default.sendToTrading(messages_1.default.deleteSuccess);
            }
            else {
                ErrorReporter_1.warnChannel(messages_1.default.failedToDelete);
                ErrorReporter_1.errorReportToCreator('User document creation failed? ', result, user);
            }
        });
    }
    createNewUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._userDb)
                this.connectToUsersDb();
            const userDb = yield this.getExistingUser(user);
            if (!userDb) {
                try {
                    const NewUser = {
                        _id: user.id,
                        balance: 10000 * 100,
                        tradeHistory: [],
                        deleted: false,
                    };
                    const result = yield this._userDb.insert(NewUser);
                    if (result.ok === true) {
                        OutgoingMessageHandler_1.default.sendToTrading(messages_1.default.signupSuccess);
                    }
                    else {
                        ErrorReporter_1.warnChannel(messages_1.default.signupFailure);
                        ErrorReporter_1.errorReportToCreator('User document creation failed? ', result, user);
                    }
                }
                catch (err) {
                    ErrorReporter_1.warnChannel(messages_1.default.failedToDelete);
                    ErrorReporter_1.errorReportToCreator('User document creation failed? ', err, user);
                    return;
                }
            }
            else if (userDb.deleted === true) {
                const updatedUser = Object.assign(Object.assign({}, userDb), { deleted: false });
                const result = yield this._userDb.insert(updatedUser);
                if (result.ok === true) {
                    OutgoingMessageHandler_1.default.sendToTrading(messages_1.default.signupAgainSuccess(helpers_1.formatBalanceToReadable(userDb.balance)));
                }
                else {
                    ErrorReporter_1.warnChannel(messages_1.default.signupFailure);
                    ErrorReporter_1.errorReportToCreator('User document update failed? ', result, user);
                }
            }
            else if (userDb.deleted === false) {
                ErrorReporter_1.warnChannel(`You already have an account.`);
                return;
            }
        });
    }
}
exports.default = DatabaseManager;
//# sourceMappingURL=DatabaseManager.js.map