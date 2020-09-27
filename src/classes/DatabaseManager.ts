import { User, MessageEmbed } from 'discord.js';
import Nano, { ServerScope, DocumentScope, DocumentInsertResponse, DocumentGetResponse } from 'nano';
import { dbUser, dbPass } from '../../auth.json';
import OutgoingMessageHandler from './OutgoingMessageHandler';
import { warnChannel, errorReportToCreator } from './ErrorReporter';
import { formatBalanceToReadable } from '../helpers';
import Messages from '../static/messages';

const DB_URL = `http://${dbUser}:${dbPass}@174.138.58.238:5984`;

interface Trade {
  ticker: string;
  timestamp: Date;
  price: string;
  transactionType: 'buy' | 'sell';
  amountTraded: number;
}

interface UserDocument {
  _id: string;
  _rev?: string;
  balance: number; // Total balance represented in cents by a BigInt
  tradeHistory: Trade[];
  deleted: boolean;
}

interface UserDocReturnType {
  error?: string;
  userDoc?: UserDocument & DocumentGetResponse;
}

class DatabaseManager {
  _dbConnection: ServerScope;
  _userDb: DocumentScope<any>;
  constructor() {
    this._dbConnection = Nano(DB_URL);
  }

  private connectToUsersDb() {
    this._userDb = this._dbConnection.use('users');
  }

  private async getUserDocument(user: User): Promise<UserDocReturnType> {
    const response: UserDocReturnType = {};
    try {
      response.userDoc = await this._userDb.get(user.id);
    } catch (err) {
      console.log(err);
      response.error = err.reason;
    }
    return response;
  }

  public async removeUserAccount(user: User): Promise<void> {
    if (!this._userDb) this.connectToUsersDb();

    const userDocResult = await this.getUserDocument(user);

    if (userDocResult?.userDoc.deleted === true || userDocResult?.error === 'deleted') {
      warnChannel(Messages.noAccount);
      return;
    } else if (userDocResult?.error === 'failed') {
      warnChannel(Messages.failedToDelete);
      errorReportToCreator('User document creation failed? ', userDocResult.error, user);
      return;
    }

    const updatedUser = { ...userDocResult.userDoc, deleted: true };

    // Insert at the revision with the modified property to indicate that the account is "deleted".
    const result = await this._userDb.insert(updatedUser);
    if (result.ok) {
      OutgoingMessageHandler.sendToTrading(Messages.deleteSuccess);
    } else {
      warnChannel(Messages.failedToDelete);
      errorReportToCreator('User document update failed? ', result, user);
    }
  }

  public async createNewUser(user: User): Promise<void> {
    if (!this._userDb) this.connectToUsersDb();
    const userDocResult = await this.getUserDocument(user);

    if (userDocResult?.error === 'failed') {
      warnChannel(Messages.failedToDelete);
      errorReportToCreator('User document creation failed? ', userDocResult, user);
      return;
    }

    if (!userDocResult.userDoc) {
      try {
        const NewUser: UserDocument = {
          _id: user.id,
          balance: 10000 * 100, // $1000.00 represented in cents
          tradeHistory: [],
          deleted: false,
        };

        const result = await this._userDb.insert(NewUser);
        if (result.ok === true) {
          OutgoingMessageHandler.sendToTrading(Messages.signupSuccess);
        } else {
          warnChannel(Messages.signupFailure);
          errorReportToCreator('User document creation failed? ', result, user);
        }
      } catch (err) {
        warnChannel(Messages.failedToDelete);
        errorReportToCreator('User document creation failed? ', err, user);
        return;
      }
    } else if (userDocResult.userDoc.deleted === true) {
      // Perhaps their account exists but is "deleted". Update that.
      // Re-create it
      const updatedUser = {
        ...userDocResult.userDoc,
        deleted: false,
      };
      const result = await this._userDb.insert(updatedUser);
      if (result.ok === true) {
        OutgoingMessageHandler.sendToTrading(
          Messages.signupAgainSuccess(formatBalanceToReadable(userDocResult.userDoc.balance)),
        );
      } else {
        warnChannel(Messages.signupFailure);
        errorReportToCreator('User document update failed? ', result, user);
      }
    } else if (userDocResult.userDoc) {
      // They trippin'
      warnChannel(`You already have an account.`);
      return;
    }
  }

  public async getBalance(user: User): Promise<string> {
    if (!this._userDb) this.connectToUsersDb();

    const userDocResult = await this.getUserDocument(user);
    if (userDocResult?.userDoc.deleted === true || userDocResult?.error === 'deleted') {
      warnChannel(Messages.noAccount);
    } else if (userDocResult?.error === 'failed') {
      warnChannel(Messages.failedToGetAccount);
    } else if (userDocResult.userDoc) {
      return formatBalanceToReadable(userDocResult.userDoc.balance);
    } else {
      warnChannel(Messages.failedToGetAccount);
      errorReportToCreator('UserDocResult returned unrecognized data?', userDocResult);
    }
  }
}

export default DatabaseManager;
