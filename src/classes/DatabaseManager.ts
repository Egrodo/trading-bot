import { RedisClientType, createClient } from 'redis';
import ErrorReporter from '../utils/ErrorReporter';
import * as ENV from '../../env.json';
import { getNextStockMarketOpeningTimestamp } from '../utils/helpers';
import { UserAccount, IAggsResults, SeasonDocument } from '../utils/types';
/**
 * Database design docs:
 *
 * Metadata:
 *   - All timestamps stored as UTC Unix timestamps
 *
 * Stock trade cache data:
 *   - Stored using Redis Strings type
 *   - Key breakdown: `stock:${ticker}:${date}`
 *   - `.results` from the Polygon API is stored as a stringified JSON object
 *   - Used as a cache to prevent hitting the Polygon API too often
 *   - Considered ephemeral and is set to expire at the next market open.
 *
 * User account data:
 *   - Stored using Redis JSON type
 *   - Key breakdown: `user:${userId}${seasonId}`
 *   - Keyed on season so we can keep historical data on users previous season performance
 *   - Contains the user's account balance, portfolio, and other information
 *
 * Season data:
 *   - Stored using Redis JSON type
 *   - Key breakdown: `season:${seasonId}`
 *   - Contains the season name, start/end dates, and any other metadata (todo) about seasons
 */

class DatabaseManager {
  _dbClient: RedisClientType;
  async init(): Promise<void> {
    const { dbUrl, dbUser, dbPass } = ENV;

    this._dbClient = createClient({
      url: `redis://${dbUser}:${dbPass}@${dbUrl}`,
    });
    this._dbClient.on('error', this.handleError.bind(this));
    await this._dbClient.connect();
    console.log('Connected to database!');
  }

  private handleError(err) {
    console.error(err);
    ErrorReporter.reportErrorInDebugChannel('Database error', err);
  }

  public async getCachedPrice(ticker: string): Promise<IAggsResults> {
    try {
      const reply = await this._dbClient.get(`stock:${ticker}`);
      const results: IAggsResults = JSON.parse(reply);
      return results;
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        'Database Error: Failed to get cached price',
        err
      );
    }
  }

  public async setCachedStockInfo(
    ticker: string,
    results: IAggsResults
  ): Promise<void> {
    const expireTime = getNextStockMarketOpeningTimestamp();
    const stringified = JSON.stringify(results);
    this._dbClient.set(`stock:${ticker}`, stringified, {
      EXAT: expireTime,
    });
  }

  public async getAccount(
    userId: string,
    seasonId: string
  ): Promise<UserAccount> {
    try {
      const reply = await this._dbClient.json.get(`user:${userId}:${seasonId}`);
      if (reply == null) {
        return null;
      }
      return reply as unknown as UserAccount;
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        'Database Error: Failed to get user document',
        err
      );
    }
  }

  /* Stores user data keyed to the current season ID */
  public async registerAccount(
    userId: string,
    startingBalance: number,
    seasonId: string
  ): Promise<void> {
    const user = {
      balance: startingBalance,
      currentHoldings: {},
      tradeHistory: [],
      signupTs: Date.now(),
    };

    try {
      await this._dbClient.json.set(`user:${userId}:${seasonId}`, '$', user, {
        NX: true,
      });
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        'Database Error: Failed to add user document',
        err
      );
      throw err;
    }
  }

  public async getAllSeasons(): Promise<Array<SeasonDocument>> {
    try {
      const seasonKeys = await this._dbClient.keys('season:*');
      if (seasonKeys == null) {
        return null;
      }

      const seasons = (await this._dbClient.json.mGet(seasonKeys, '$')) ?? [];
      const seasonsFlattened = seasons.flat();

      return seasonsFlattened as unknown as Array<SeasonDocument>;
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        'Database Error: Failed to get all seasons',
        err
      );
    }
  }

  public async getSeason(seasonName: string): Promise<SeasonDocument> {
    try {
      const season = await this._dbClient.json.get(`season:${seasonName}`);
      if (season == null) {
        return null;
      }
      return season as unknown as SeasonDocument;
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        'Database Error: Failed to get one season',
        err
      );
    }
  }

  /**
   * Triggered by admin commands to add a new season.
   * Only one season allowed at a time, unique names required.
   * Callee should ensure their new season doesn't overlap with an existing one before adding
   */
  public async addSeason(name: string, start: Date, end: Date): Promise<void> {
    const season = {
      name: name,
      start: start.getTime(),
      end: end.getTime(),
    };

    try {
      if (await this.getSeason(name)) {
        throw new Error('Season already exists');
      }
      await this._dbClient.json.set(`season:${name}`, '$', season);
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        'Database Error: Failed to add season document',
        err
      );
      throw err;
    }
  }
}

export default new DatabaseManager();

// import { User } from 'discord.js';
// import v8 from 'v8';
// import Nano, { ServerScope, DocumentScope, DocumentGetResponse } from 'nano';
// import { dbUser, dbPass } from '../../auth.json';
// import OutgoingMessageHandler from '../stateful/OutgoingMessageHandler';
// import { warnChannel, errorReportToCreator } from '../stateful/ErrorReporter';
// import helpers from '../helpers';
// const { formatAmountToReadable } = helpers;
// import Messages from '../static/messages';

// const DB_URL = `http://${dbUser}:${dbPass}@174.138.58.238:5984`;

// // This represents the up-to-date aunccot of any given stock
// export interface StockHolding {
//   companyName?: string;
//   amountOwned: number;
//   tradeHistory: PastTrade[];
// }

// // A StockHolding will have a corresponding PastTrade
// interface PastTrade {
//   ticker: string;
//   timestamp: number;
//   price: number;
//   transactionType: 'buy' | 'sell';
//   amountTraded: number;
// }

// export interface CurrentHoldings {
//   [tickerKey: string]: StockHolding;
// }

// interface UserDocument {
//   _id: string;
//   _rev?: string;
//   balance: number; // Total balance represented in cents
//   currentHoldings: CurrentHoldings;
//   deleted: boolean;
// }

// interface UserDocReturnType {
//   error?: string;
//   userDoc?: UserDocument & DocumentGetResponse;
// }

// class DatabaseManager {
//   _dbConnection: ServerScope;
//   _userDb: DocumentScope<any>;
//   constructor() {
//     this._dbConnection = Nano(DB_URL);
//   }

//   private connectToUsersDb() {
//     this._userDb = this._dbConnection.use('users');
//   }

//   private async getUserDocument(user: User): Promise<UserDocReturnType> {
//     if (!this._userDb) this.connectToUsersDb();

//     const response: UserDocReturnType = {};
//     try {
//       response.userDoc = await this._userDb.get(user.id);
//     } catch (err) {
//       response.error = err.reason;
//     }
//     return response;
//   }

//   // INTERNAL ONLY - modify the users balance directly by passing ina positive or negative number.
//   private async _modifyBalance(toUser: User, newBalance: number) {
//     // Get toUser doc
//     let userDocResult: UserDocReturnType;
//     try {
//       userDocResult = await this.getUserDocument(toUser);
//     } catch (err) {
//       console.log('ERROR');
//       console.log(err);
//       return;
//     }

//     if (userDocResult?.error) {
//       if (
//         userDocResult?.userDoc?.deleted === true ||
//         userDocResult?.error === 'deleted'
//       ) {
//         warnChannel(Messages.noAccountForUser(toUser.username));
//         return;
//       } else {
//         warnChannel(Messages.failedToGetAccount);
//         errorReportToCreator(
//           'UserDocResult returned unrecognized data?',
//           userDocResult
//         );
//         return;
//       }
//     }

//     const updatedUserDoc = {
//       ...userDocResult.userDoc,
//       balance: newBalance,
//     };

//     try {
//       const result = await this._userDb.insert(updatedUserDoc);

//       if (result.ok === true) {
//         return true;
//       } else {
//         warnChannel(Messages.failedToGetAccount);
//         errorReportToCreator(
//           'User document update failed in decreaseBalance',
//           result,
//           userDocResult.userDoc
//         );
//         return false;
//       }
//     } catch (err) {
//       warnChannel(Messages.failedToGetAccount);
//       errorReportToCreator(
//         'User document update failed in decreaseBalance',
//         err,
//         userDocResult.userDoc
//       );
//       return false;
//     }
//   }

//   public async removeUserAccount(user: User): Promise<void> {
//     const userDocResult = await this.getUserDocument(user);

//     if (
//       userDocResult?.userDoc?.deleted === true ||
//       userDocResult?.error === 'deleted'
//     ) {
//       warnChannel(Messages.noAccount);
//       return;
//     } else if (userDocResult?.error === 'failed') {
//       warnChannel(Messages.failedToDelete);
//       errorReportToCreator(
//         'User document creation failed? ',
//         userDocResult.error,
//         user
//       );
//       return;
//     }

//     const updatedUser = {
//       ...userDocResult.userDoc,
//       deleted: true,
//     };

//     // Insert at the revision with the modified property to indicate that the account is "deleted".
//     const result = await this._userDb.insert(updatedUser);
//     if (result.ok) {
//       OutgoingMessageHandler.sendToTrading(Messages.deleteSuccess);
//     } else {
//       warnChannel(Messages.failedToDelete);
//       errorReportToCreator(
//         'User document update failed in removeUserAccount',
//         result,
//         user
//       );
//     }
//   }

//   public async createNewUser(user: User): Promise<void> {
//     const userDocResult = await this.getUserDocument(user);

//     if (userDocResult?.error === 'failed') {
//       warnChannel(Messages.failedToDelete);
//       errorReportToCreator(
//         'User document creation failed in createNewUser',
//         userDocResult,
//         user
//       );
//       return;
//     }

//     if (!userDocResult.userDoc) {
//       try {
//         const NewUser: UserDocument = {
//           _id: user.id,
//           balance: 10000 * 100, // $1000.00 represented in cents
//           currentHoldings: {},
//           deleted: false,
//         };

//         const result = await this._userDb.insert(NewUser);
//         if (result.ok === true) {
//           OutgoingMessageHandler.sendToTrading(Messages.signupSuccess);
//         } else {
//           warnChannel(Messages.signupFailure);
//           errorReportToCreator(
//             'User document creation failed in createNewUser',
//             result,
//             user
//           );
//         }
//       } catch (err) {
//         warnChannel(Messages.failedToDelete);
//         errorReportToCreator(
//           'User document creation failed in createNewUser',
//           err,
//           user
//         );
//         return;
//       }
//     } else if (userDocResult.userDoc.deleted === true) {
//       // Perhaps their account exists but is "deleted". Update that.
//       // Re-create it
//       const updatedUser = {
//         ...userDocResult.userDoc,
//         deleted: false,
//       };
//       const result = await this._userDb.insert(updatedUser);
//       if (result.ok === true) {
//         OutgoingMessageHandler.sendToTrading(
//           Messages.signupAgainSuccess(
//             formatAmountToReadable(userDocResult.userDoc.balance)
//           )
//         );
//       } else {
//         warnChannel(Messages.signupFailure);
//         errorReportToCreator(
//           'User document update failed createNewUser',
//           result,
//           user
//         );
//       }
//     } else if (userDocResult.userDoc) {
//       // They trippin'
//       warnChannel(`You already have an account.`);
//       return;
//     }
//   }

//   public async getBalance(user: User): Promise<number | undefined> {
//     const userDocResult = await this.getUserDocument(user);
//     if (
//       userDocResult?.userDoc?.deleted === true ||
//       userDocResult?.error === 'deleted'
//     ) {
//       warnChannel(Messages.noAccount);
//     } else if (userDocResult?.error === 'missing') {
//       warnChannel(Messages.noAccount);
//     } else if (userDocResult?.error === 'failed') {
//       warnChannel(Messages.failedToGetAccount);
//     } else if (userDocResult.userDoc) {
//       return userDocResult.userDoc.balance;
//     } else {
//       warnChannel(Messages.failedToGetAccount);
//       errorReportToCreator(
//         'UserDocResult returned unrecognized data?',
//         userDocResult
//       );
//     }
//   }

//   public async increaseUserBalance(
//     user: User,
//     amount: number
//   ): Promise<boolean> {
//     const userBalance = await this.getBalance(user);
//     const newBalance = userBalance + amount;
//     if (!Number.isNaN(newBalance)) {
//       return this._modifyBalance(user, newBalance);
//     }
//     return false;
//   }

//   public async decreaseUserBalance(
//     user: User,
//     amount: number
//   ): Promise<boolean> {
//     const userBalance = await this.getBalance(user);
//     const newBalance = userBalance - amount;
//     if (!Number.isNaN(Number(newBalance))) {
//       return this._modifyBalance(user, newBalance);
//     }
//     return false;
//   }

//   public async addStocksToUserAccount(
//     user: User,
//     ticker: string,
//     buyPrice: number,
//     companyName: string,
//     amount: number
//   ): Promise<StockHolding> {
//     // Get userDoc
//     let userDocResult: UserDocReturnType;
//     try {
//       userDocResult = await this.getUserDocument(user);
//     } catch (err) {
//       console.log('ERROR');
//       console.log(err);
//       return;
//     }

//     if (userDocResult?.error) {
//       if (
//         userDocResult?.userDoc?.deleted === true ||
//         userDocResult?.error === 'missing'
//       ) {
//         warnChannel(Messages.noAccountForUser(user.username));
//         return;
//       } else {
//         warnChannel(Messages.failedToGetAccount);
//         errorReportToCreator(
//           'UserDocResult returned unrecognized data?',
//           userDocResult
//         );
//         return;
//       }
//     }

//     const { currentHoldings } = userDocResult.userDoc;

//     const newTrade: PastTrade = {
//       ticker,
//       price: buyPrice,
//       amountTraded: amount,
//       timestamp: Date.now(),
//       transactionType: 'buy',
//     };

//     let pastHolding = currentHoldings[ticker];
//     const pastTradeHistory = pastHolding?.tradeHistory || [];

//     const newAmount = pastHolding?.amountOwned
//       ? pastHolding.amountOwned + amount
//       : amount;

//     const newHolding: StockHolding = {
//       companyName,
//       amountOwned: newAmount,
//       tradeHistory: [...pastTradeHistory, newTrade],
//     };

//     const updatedUserDoc: UserDocument = {
//       ...userDocResult.userDoc,
//       currentHoldings: {
//         ...userDocResult.userDoc.currentHoldings,
//         [ticker]: newHolding,
//       },
//     };

//     try {
//       const result = await this._userDb.insert(updatedUserDoc, {
//         rev: updatedUserDoc._rev,
//       });

//       if (result.ok === true) {
//         return newHolding;
//       } else {
//         warnChannel(Messages.failedToGetAccount);
//         errorReportToCreator(
//           'User document update failed in addStocksToUserAccount',
//           result,
//           userDocResult.userDoc
//         );
//       }
//     } catch (err) {
//       warnChannel(Messages.failedToGetAccount);
//       errorReportToCreator(
//         'User document update failed in addStocksToUserAccount',
//         err,
//         userDocResult.userDoc
//       );
//     }
//   }
// }

// export default DatabaseManager;
