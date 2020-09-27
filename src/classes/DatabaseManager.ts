import { User } from 'discord.js';
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

class DatabaseManager {
  _dbConnection: ServerScope;
  _userDb: DocumentScope<any>;
  constructor() {
    this._dbConnection = Nano(DB_URL);
  }

  public connectToUsersDb() {
    this._userDb = this._dbConnection.use('users');
  }

  private async getExistingUser(user: User): Promise<(DocumentGetResponse & UserDocument) | void> {
    try {
      const userDoc = await this._userDb.get(user.id);
      return userDoc;
    } catch (err) {
      console.log(err);
      // No account most likely
      return;
    }
  }

  // TODO: Move the strings to the messages file
  // TODO: Intro tutorial PM to them
  public async removeUserAccount(user: User): Promise<void> {
    if (!this._userDb) this.connectToUsersDb();

    let userDoc: UserDocument & DocumentGetResponse;
    try {
      userDoc = await this._userDb.get(user.id);
    } catch (err) {
      if (err.reason === 'deleted') {
        warnChannel(Messages.noAccount);
        return;
      } else {
        warnChannel(Messages.failedToDelete);
        errorReportToCreator('User document creation failed? ', err, user);
        return;
      }
    }

    if (userDoc.deleted) {
      warnChannel(Messages.noAccount);
      return;
    }

    const updatedUser = { ...userDoc, deleted: true };

    // Insert at the revision with the modified property to indicate that the account is "deleted".
    const result = await this._userDb.insert(updatedUser);
    if (result.ok) {
      OutgoingMessageHandler.sendToTrading(Messages.deleteSuccess);
    } else {
      warnChannel(Messages.failedToDelete);
      errorReportToCreator('User document creation failed? ', result, user);
    }
  }

  public async createNewUser(user: User): Promise<void> {
    if (!this._userDb) this.connectToUsersDb();
    const userDb = await this.getExistingUser(user);
    if (!userDb) {
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
    } else if (userDb.deleted === true) {
      // Perhaps their account exists but is "deleted". Update that.
      // Re-create it
      const updatedUser = {
        ...userDb,
        deleted: false,
      };
      const result = await this._userDb.insert(updatedUser);
      if (result.ok === true) {
        OutgoingMessageHandler.sendToTrading(Messages.signupAgainSuccess(formatBalanceToReadable(userDb.balance)));
      } else {
        warnChannel(Messages.signupFailure);
        errorReportToCreator('User document update failed? ', result, user);
      }
    } else if (userDb.deleted === false) {
      // They trippin'
      warnChannel(`You already have an account.`);
      return;
    }
  }
}

export default DatabaseManager;
