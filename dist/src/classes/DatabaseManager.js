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
const messages_1 = __importDefault(require("../static/messages"));
const { signupSuccess, signupFailure } = messages_1.default;
const DB_URL = `http://${auth_json_1.dbUser}:${auth_json_1.dbPass}@174.138.58.238:5984`;
class DatabaseManager {
    constructor() {
        this._dbConnection = nano_1.default(DB_URL);
    }
    createUserDocument(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const NewUser = {
                _id: user.id,
                balance: 1000 * 100,
                tradeHistory: [],
            };
            return this._userDb.insert(NewUser);
        });
    }
    connectToUsersDb() {
        this._userDb = this._dbConnection.use('users');
    }
    getExistingUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userDoc = yield this._userDb.get(user.id);
                console.log(userDoc);
                return userDoc;
            }
            catch (err) {
                ErrorReporter_1.warnChannel("Failed to get your account. I'll PM my creator to report this :(");
                ErrorReporter_1.errorReportToCreator('User getting failed? ', err, user);
            }
        });
    }
    // TODO: Don't *actually* delete the user's account, just mark it deleted that way they can't abuse this to get infinite money.
    // TODO: Accurately report the starting balance in this case.
    // TODO: Move the strings to the messages file
    // TODO: Intro tutorial PM to them
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
                    ErrorReporter_1.warnChannel(`You do not have an account with us. Create one with "!signup".`);
                    return;
                }
                else {
                    ErrorReporter_1.warnChannel("Failed to delete account.  I'll PM my creator to report this :(");
                    ErrorReporter_1.errorReportToCreator('User document creation failed? ', err, user);
                    return;
                }
            }
            // TODO: Don't do this.
            const result = yield this._userDb.destroy(user.id, userDoc._rev);
            if (result.ok) {
                OutgoingMessageHandler_1.default.sendToTrading(`Successfully deleted your account. If you'd like to recreate it at any point use the "!signup" command.`);
            }
            else {
                ErrorReporter_1.warnChannel("Failed to delete account.  I'll PM my creator to report this :(");
                ErrorReporter_1.errorReportToCreator('User document creation failed? ', result, user);
            }
        });
    }
    createNewUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._userDb)
                this.connectToUsersDb();
            let result;
            try {
                result = yield this.createUserDocument(user);
            }
            catch (err) {
                if (err.reason === 'Document update conflict.') {
                    ErrorReporter_1.warnChannel(`You already have an account.`);
                }
                else {
                    ErrorReporter_1.warnChannel("Failed to create account.  I'll PM my creator to report this :(");
                    ErrorReporter_1.errorReportToCreator('User document creation failed? ', err, user);
                }
                return;
            }
            if (result.ok === true) {
                OutgoingMessageHandler_1.default.sendToTrading(signupSuccess);
            }
            else {
                ErrorReporter_1.warnChannel(signupFailure);
                ErrorReporter_1.errorReportToCreator('User document creation failed? ', result, user);
                console.error(result);
            }
        });
    }
}
exports.default = DatabaseManager;
//# sourceMappingURL=DatabaseManager.js.map