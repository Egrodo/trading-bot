import { createClient, RedisClientType } from 'redis';
import ErrorReporter from '../utils/ErrorReporter';
import * as ENV from '../../env.json';
import { getNextStockMarketOpeningTimestamp } from '../utils/helpers';
import type { IAggsResults, SeasonDocument, UserAccount } from '../types';

import { TradeType } from '../types';

const MAX_CONNECTION_ATTEMPTS = 5;
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
 *   - Key breakdown: `user:${userId}${seasonName}`
 *   - Keyed on season so we can keep historical data on users previous season performance
 *   - Contains the user's account balance, portfolio, and other information
 *
 * Season data:
 *   - Stored using Redis JSON type
 *   - Key breakdown: `season:${seasonName}`
 *   - Contains the season name, start/end dates, and any other metadata (todo) about seasons
 */

class DatabaseManager {
  _dbClient: RedisClientType;
  async init(): Promise<void> {
    const { dbUrl, dbPass, dbPort } = ENV;

    this._dbClient = createClient({
      password: dbPass,
      socket: {
        host: dbUrl,
        port: +dbPort,
      },
    });
    this._dbClient.on('error', this.handleError.bind(this));
    await this._dbClient.connect();
    this._reconnectAttempts = 0;
    console.log('Connected to database!');
  }

  _reconnectAttempts = 0;
  private async handleError(err): Promise<void> {
    if (err.code === 'ECONNRESET') {
      if (this._reconnectAttempts >= MAX_CONNECTION_ATTEMPTS) {
        console.error(
          `Failed to reconnect to database after ${MAX_CONNECTION_ATTEMPTS} attempts. Exiting...`
        );
        process.exit(1);
      }
      this._reconnectAttempts++;
      console.error('Database connection reset, attempting to reconnect...');
      await this._dbClient.disconnect();
      return this.init();
    }
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
    seasonName: string
  ): Promise<UserAccount> {
    try {
      const reply = await this._dbClient.json.get(
        `user:${userId}:${seasonName}`
      );
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

  public async getAccountsForSeason(
    seasonName: string
  ): Promise<Array<[accountId: string, accountData: UserAccount]>> {
    try {
      const userKeys = await this._dbClient.keys(`user:*:${seasonName}`);
      if (userKeys == null || userKeys.length === 0) {
        return [];
      }

      const users = (await this._dbClient.json.mGet(userKeys, '$')) ?? [];
      const usersTuple = users
        .flat()
        .map<[string, UserAccount]>((user, i) => [
          userKeys[i].split(':')[1],
          user as unknown as UserAccount,
        ]);

      return usersTuple;
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        'Database Error: Failed to get all users for season',
        err
      );
    }
  }

  /* Stores user data keyed to the current season ID */
  public async registerAccount(
    userId: string,
    startingBalance: number,
    seasonName: string
  ): Promise<void> {
    const user = {
      balance: startingBalance,
      currentHoldings: {},
      tradeHistory: [],
      signupTs: Date.now(),
    };

    try {
      await this._dbClient.json.set(`user:${userId}:${seasonName}`, '$', user, {
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
      if (seasonKeys == null || seasonKeys.length === 0) {
        return [];
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

  public async editSeason(name: string, start: Date, end: Date): Promise<void> {
    const season = {
      name: name,
      start: start.getTime(),
      end: end.getTime(),
    };

    try {
      await this._dbClient.json.set(`season:${name}`, '$', season);
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        'Database Error: Failed to edit season document',
        err
      );
      throw err;
    }
  }

  public async buyStocks({
    userId,
    userAccount,
    seasonName,
    ticker,
    price,
    quantity,
  }: {
    userId: string; // This refers to the users Discord ID
    userAccount: UserAccount;
    seasonName: string;
    ticker: string;
    price: number;
    quantity: number;
  }) {
    const newCurrentHoldings = {
      ...userAccount.currentHoldings,
      [ticker]: quantity + (userAccount.currentHoldings[ticker] ?? 0),
    };

    const newTrade = {
      ticker,
      timestamp: Date.now(),
      price,
      type: TradeType.BUY,
      quantity,
    };

    const newUserBalance = userAccount.balance - price * quantity;

    try {
      const userIdKey = `user:${userId}:${seasonName}`;
      // Update user balance first, if that fails we can exit early
      await this._dbClient.json.set(userIdKey, '.balance', newUserBalance);
      // Then update the user's current holdings
      await this._dbClient.json.set(
        userIdKey,
        '.currentHoldings',
        newCurrentHoldings
      );
      // Then add the trade to the user's trade history
      await this._dbClient.json.arrAppend(userIdKey, '.tradeHistory', newTrade);
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        'Database Error: Failed to add buy to user account',
        err
      );
      throw err;
    }
  }

  public async sellStocks({
    userId,
    userAccount,
    seasonName,
    ticker,
    price,
    quantity,
  }: {
    userId: string; // This refers to the users Discord ID
    userAccount: UserAccount;
    seasonName: string;
    ticker: string;
    price: number;
    quantity: number;
  }) {
    try {
      const newStockQuantity = userAccount.currentHoldings[ticker] - quantity;
      if (newStockQuantity < 0) {
        throw new Error('Not enough stock to sell');
      }

      const newQuantity = userAccount.currentHoldings[ticker] - quantity;
      const newCurrentHoldings = {
        ...userAccount.currentHoldings,
      };

      if (newQuantity === 0) {
        delete newCurrentHoldings[ticker];
      } else {
        newCurrentHoldings[ticker] = newQuantity;
      }

      const newTrade = {
        ticker,
        timestamp: Date.now(),
        type: TradeType.SELL,
        price,
        quantity,
      };

      const newUserBalance = userAccount.balance + price * quantity;

      const userIdKey = `user:${userId}:${seasonName}`;
      // Update user balance first, if that fails we can exit early
      await this._dbClient.json.set(userIdKey, '.balance', newUserBalance);
      // Then update the user's current holdings
      await this._dbClient.json.set(
        userIdKey,
        '.currentHoldings',
        newCurrentHoldings
      );
      // Then add the trade to the user's trade history
      await this._dbClient.json.arrAppend(userIdKey, '.tradeHistory', newTrade);
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        'Database Error: Failed to add sell to user account',
        err
      );
      throw err;
    }
  }
}

export default new DatabaseManager();
