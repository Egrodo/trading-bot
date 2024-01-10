import ENV from '../../env.json';
import {
  IAggsPreviousClose,
  ITickerDetails,
  restClient,
} from '@polygon.io/client-js';
import DatabaseManager from './DatabaseManager';
import { IAggsResults } from '../types';

const MAX_PRICE_CACHE_SIZE = 100;
const MAX_TICKER_INFO_CACHE_SIZE = 500;
/**
 * Results description:
 * c: number; The close price for the symbol in the given time period
 * h: number; The highest price for the symbol in the given time period.
 * l: number; The lowest price for the symbol in the given time period.
 * n: number; The number of transactions in the aggregate window.*
 * o: number; The open price for the symbol in the given time period.
 * t: number; The Unix Msec timestamp for the start of the aggregate window.
 * v: number; The trading volume of the symbol in the given time period.
 * vw: number; The volume weighted average price.
 */

class PolygonApi {
  _restClient = restClient(ENV.polygonKey);

  /* Get price information from the last market day's close. Either from cache or API */
  public async getPrevClosePriceData(ticker: string): Promise<IAggsResults> {
    const tickerKey = `${ticker}:${new Date().toDateString()}`;
    if (DatabaseManager.tickerCache.has(tickerKey)) {
      return DatabaseManager.tickerCache.get(tickerKey);
    }

    const prevClosePriceData = await this._restClient.stocks.previousClose(
      ticker
    );

    console.log(prevClosePriceData);

    if (
      prevClosePriceData.resultsCount === 0 ||
      !prevClosePriceData.results?.length
    ) {
      console.log(`No price data found for ${ticker}`);
      return null;
    }

    const results = prevClosePriceData.results[0];

    DatabaseManager.tickerCache.set(tickerKey, results);
    if (DatabaseManager.tickerCache.size > MAX_PRICE_CACHE_SIZE) {
      DatabaseManager.tickerCache.delete(
        DatabaseManager.tickerCache.keys().next().value
      );
    }
    DatabaseManager.setCachedStockInfo(ticker, results);
    return results;
  }

  /**
   * Ticker information likely doesn't change often so we can cache it in a
   * quick LRU
   */
  _tickerInfoCache: Map<string, ITickerDetails> = new Map();
  public async getTickerInfo(ticker: string): Promise<ITickerDetails> {
    if (this._tickerInfoCache.has(ticker)) {
      return this._tickerInfoCache.get(ticker);
    }

    const tickerInfo = await this._restClient.reference.tickerDetails(ticker);
    if (tickerInfo) {
      this._tickerInfoCache.set(ticker, tickerInfo);
      if (this._tickerInfoCache.size > MAX_TICKER_INFO_CACHE_SIZE) {
        this._tickerInfoCache.delete(this._tickerInfoCache.keys().next().value);
      }
    }

    return tickerInfo;
  }
}

export default new PolygonApi();
