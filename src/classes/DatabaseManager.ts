import { User } from 'discord.js';
import Nano, { ServerScope, DocumentScope, DocumentGetResponse } from 'nano';
import { dbUser, dbPass } from '../../auth.json';
import OutgoingMessageHandler from '../stateful/OutgoingMessageHandler';
import { warnChannel, errorReportToCreator } from '../stateful/ErrorReporter';
import helpers from '../helpers';
const { formatAmountToReadable } = helpers;
import Messages from '../static/messages';

const DB_URL = `http://${dbUser}:${dbPass}@174.138.58.238:5984`;

// This represents the up-to-date account of any given stock
export interface StockHolding {
  companyName?: string;
  amountOwned: number;
  tradeHistory: PastTrade[];
}

// A StockHolding will have a corresponding PastTrade
interface PastTrade {
  ticker: string;
  timestamp: number;
  price: number;
  transactionType: 'buy' | 'sell';
  amountTraded: number;
}

export interface CurrentHoldings {
  [tickerKey: string]: StockHolding;
}

interface UserDocument {
  _id: string;
  _rev?: string;
  balance: number; // Total balance represented in cents
  currentHoldings: CurrentHoldings;
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
    if (!this._userDb) this.connectToUsersDb();

    const response: UserDocReturnType = {};
    try {
      response.userDoc = await this._userDb.get(user.id);
    } catch (err) {
      response.error = err.reason;
    }
    return response;
  }

  // INTERNAL ONLY - modify the users balance directly by passing ina positive or negative number.
  private async _modifyBalance(toUser: User, newBalance: number) {
    // Get toUser doc
    let userDocResult: UserDocReturnType;
    try {
      userDocResult = await this.getUserDocument(toUser);
    } catch (err) {
      console.log('ERROR');
      console.log(err);
      return;
    }

    if (userDocResult?.error) {
      if (userDocResult?.error === 'missing') {
        warnChannel(Messages.noAccountForUser(toUser.username));
        return;
      } else {
        warnChannel(Messages.failedToGetAccount);
        errorReportToCreator(
          'UserDocResult returned unrecognized data?',
          userDocResult
        );
        return;
      }
    }

    const updatedUserDoc = {
      ...userDocResult.userDoc,
      balance: newBalance,
    };

    const result = await this._userDb.insert(updatedUserDoc);
    if (result.ok === true) {
      return true;
    } else {
      warnChannel(Messages.failedToGetAccount);
      errorReportToCreator(
        'User document update failed? ',
        result,
        userDocResult.userDoc
      );
      return false;
    }
  }

  public async removeUserAccount(user: User): Promise<void> {
    const userDocResult = await this.getUserDocument(user);

    if (
      userDocResult?.userDoc.deleted === true ||
      userDocResult?.error === 'deleted'
    ) {
      warnChannel(Messages.noAccount);
      return;
    } else if (userDocResult?.error === 'failed') {
      warnChannel(Messages.failedToDelete);
      errorReportToCreator(
        'User document creation failed? ',
        userDocResult.error,
        user
      );
      return;
    }

    const updatedUser = {
      ...userDocResult.userDoc,
      currentHoldings: [],
      deleted: true,
    };

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
    const userDocResult = await this.getUserDocument(user);

    if (userDocResult?.error === 'failed') {
      warnChannel(Messages.failedToDelete);
      errorReportToCreator(
        'User document creation failed? ',
        userDocResult,
        user
      );
      return;
    }

    if (!userDocResult.userDoc) {
      try {
        const NewUser: UserDocument = {
          _id: user.id,
          balance: 10000 * 100, // $1000.00 represented in cents
          currentHoldings: {},
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
          Messages.signupAgainSuccess(
            formatAmountToReadable(userDocResult.userDoc.balance)
          )
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

  public async getBalance(user: User): Promise<number> {
    const userDocResult = await this.getUserDocument(user);
    if (
      userDocResult?.userDoc.deleted === true ||
      userDocResult?.error === 'deleted'
    ) {
      warnChannel(Messages.noAccount);
    } else if (userDocResult?.error === 'missing') {
      warnChannel(Messages.noAccount);
    } else if (userDocResult?.error === 'failed') {
      warnChannel(Messages.failedToGetAccount);
    } else if (userDocResult.userDoc) {
      return userDocResult.userDoc.balance;
    } else {
      warnChannel(Messages.failedToGetAccount);
      errorReportToCreator(
        'UserDocResult returned unrecognized data?',
        userDocResult
      );
    }
  }

  public async increaseUserBalance(
    user: User,
    amount: number
  ): Promise<boolean> {
    const userBalance = await this.getBalance(user);
    const newBalance = userBalance + amount;
    if (!Number.isNaN(newBalance)) {
      return this._modifyBalance(user, newBalance);
    }
    return false;
  }

  public async decreaseUserBalance(
    user: User,
    amount: number
  ): Promise<boolean> {
    const userBalance = await this.getBalance(user);
    const newBalance = userBalance - amount;
    if (!Number.isNaN(newBalance)) {
      return this._modifyBalance(user, newBalance);
    }
    return false;
  }

  public async addStocksToUserAccount(
    user: User,
    ticker: string,
    buyPrice: number,
    companyName: string,
    amount: number
  ): Promise<CurrentHoldings> {
    // Get userDoc
    let userDocResult: UserDocReturnType;
    try {
      userDocResult = await this.getUserDocument(user);
    } catch (err) {
      console.log('ERROR');
      console.log(err);
      return;
    }

    if (userDocResult?.error) {
      if (userDocResult?.error === 'missing') {
        warnChannel(Messages.noAccountForUser(user.username));
        return;
      } else {
        warnChannel(Messages.failedToGetAccount);
        errorReportToCreator(
          'UserDocResult returned unrecognized data?',
          userDocResult
        );
        return;
      }
    }

    const { currentHoldings } = userDocResult.userDoc;

    const newTrade: PastTrade = {
      ticker,
      price: buyPrice,
      amountTraded: amount,
      timestamp: Date.now(),
      transactionType: 'buy',
    };

    let pastHolding = currentHoldings[ticker];
    const pastTradeHistory = pastHolding?.tradeHistory || [];

    const newAmount = pastHolding?.amountOwned
      ? pastHolding.amountOwned + amount
      : amount;

    const newHolding: StockHolding = {
      companyName,
      amountOwned: newAmount,
      tradeHistory: [...pastTradeHistory, newTrade],
    };

    const updatedUserDoc: UserDocument = {
      ...userDocResult.userDoc,
      currentHoldings: {
        [ticker]: newHolding,
        ...userDocResult.userDoc.currentHoldings,
      },
    };

    const result = await this._userDb.insert(updatedUserDoc);
    if (result.ok === true) {
      return updatedUserDoc.currentHoldings;
    } else {
      warnChannel(Messages.failedToGetAccount);
      errorReportToCreator(
        'User document update failed? ',
        result,
        userDocResult.userDoc
      );
      return {};
    }
  }
}

export default DatabaseManager;
