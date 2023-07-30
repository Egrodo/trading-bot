import { createClient, RedisClientType } from "redis";
import ErrorReporter from "../utils/ErrorReporter";
import * as ENV from "../../env.json";
import { getNextStockMarketOpeningTimestamp } from "../utils/helpers";
import type { IAggsResults, SeasonDocument, UserAccount } from "../types";

import { TradeType } from "../types";

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
    const { dbUrl, dbUser, dbPass } = ENV;

    this._dbClient = createClient({
      url: `redis://${dbUser}:${dbPass}@${dbUrl}`,
    });
    this._dbClient.on("error", this.handleError.bind(this));
    await this._dbClient.connect();
    console.log("Connected to database!");
  }

  private handleError(err) {
    console.error(err);
    ErrorReporter.reportErrorInDebugChannel("Database error", err);
  }

  public async getCachedPrice(ticker: string): Promise<IAggsResults> {
    try {
      const reply = await this._dbClient.get(`stock:${ticker}`);
      const results: IAggsResults = JSON.parse(reply);
      return results;
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        "Database Error: Failed to get cached price",
        err,
      );
    }
  }

  public async setCachedStockInfo(
    ticker: string,
    results: IAggsResults,
  ): Promise<void> {
    const expireTime = getNextStockMarketOpeningTimestamp();
    const stringified = JSON.stringify(results);
    this._dbClient.set(`stock:${ticker}`, stringified, {
      EXAT: expireTime,
    });
  }

  public async getAccount(
    userId: string,
    seasonName: string,
  ): Promise<UserAccount> {
    try {
      const reply = await this._dbClient.json.get(
        `user:${userId}:${seasonName}`,
      );
      if (reply == null) {
        return null;
      }
      return reply as unknown as UserAccount;
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        "Database Error: Failed to get user document",
        err,
      );
    }
  }

  /* Stores user data keyed to the current season ID */
  public async registerAccount(
    userId: string,
    startingBalance: number,
    seasonName: string,
  ): Promise<void> {
    const user = {
      balance: startingBalance,
      currentHoldings: {},
      tradeHistory: [],
      signupTs: Date.now(),
    };

    try {
      await this._dbClient.json.set(`user:${userId}:${seasonName}`, "$", user, {
        NX: true,
      });
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        "Database Error: Failed to add user document",
        err,
      );
      throw err;
    }
  }

  public async getAllSeasons(): Promise<Array<SeasonDocument>> {
    try {
      const seasonKeys = await this._dbClient.keys("season:*");
      if (seasonKeys == null) {
        return null;
      }

      const seasons = (await this._dbClient.json.mGet(seasonKeys, "$")) ?? [];
      const seasonsFlattened = seasons.flat();

      return seasonsFlattened as unknown as Array<SeasonDocument>;
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        "Database Error: Failed to get all seasons",
        err,
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
        "Database Error: Failed to get one season",
        err,
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
        throw new Error("Season already exists");
      }
      await this._dbClient.json.set(`season:${name}`, "$", season);
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        "Database Error: Failed to add season document",
        err,
      );
      throw err;
    }
  }

  public async addStocksToAccount({
    userId,
    userAccount,
    seasonName,
    ticker,
    price,
    quantity,
  }: {
    userId: string;
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
      await this._dbClient.json.set(userIdKey, ".balance", newUserBalance);
      // Then update the user's current holdings
      await this._dbClient.json.set(
        userIdKey,
        ".currentHoldings",
        newCurrentHoldings,
      );
      // Then add the trade to the user's trade history
      await this._dbClient.json.arrAppend(userIdKey, ".tradeHistory", newTrade);
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        "Database Error: Failed to add buy to user account",
        err,
      );
      throw err;
    }
  }
}

export default new DatabaseManager();
