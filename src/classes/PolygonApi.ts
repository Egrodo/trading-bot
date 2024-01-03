import ENV from '../../env.json';
import {
  IAggsPreviousClose,
  ITickerDetails,
  restClient,
} from '@polygon.io/client-js';
import DatabaseManager from './DatabaseManager';

const MAX_PRICE_CACHE_SIZE = 100;
const MAX_TICKER_INFO_CACHE_SIZE = 100;
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

  /**
   * Stock price information changes once a day (currently) so cache it
   * keyed with the current date and tickder in a quick LRU
   */
  _prevClosePriceCache: Map<string, IAggsPreviousClose> = new Map();
  /* Get price information from the last market day's close */
  public async getPrevClosePriceData(
    ticker: string
  ): Promise<IAggsPreviousClose> {
    const tickerKey = `${ticker}:${new Date().toDateString()}`;
    if (this._prevClosePriceCache.has(tickerKey)) {
      return this._prevClosePriceCache.get(tickerKey);
    }
    const prevClosePriceData = await this._restClient.stocks.previousClose(
      ticker
    );
    if (prevClosePriceData) {
      this._prevClosePriceCache.set(tickerKey, prevClosePriceData);
      if (this._prevClosePriceCache.size > MAX_PRICE_CACHE_SIZE) {
        this._prevClosePriceCache.delete(
          this._prevClosePriceCache.keys().next().value
        );
      }
    }

    return prevClosePriceData;
  }

  /* getPrevClosePriceData but will return from cache if valid and save to cache if not */
  public async cacheGetPrevClosePriceData(
    ticker: string
  ): Promise<IAggsPreviousClose> {
    const cachedPriceInfo = await DatabaseManager.getCachedPrice(ticker);
    if (cachedPriceInfo) {
      console.log(`Found cached price data for ${ticker}`);
      return {
        ticker,
        status: 'OK',
        resultsCount: 1,
        results: [cachedPriceInfo],
      };
    }

    console.log(`Requesting price data for ${ticker}`);
    const quote = await this.getPrevClosePriceData(ticker);

    if (quote.status !== 'OK') {
      throw new Error(quote.status);
    } else if (quote.resultsCount === 0 || !quote.results?.length) {
      console.log(`No price data found for ${ticker}`);
      return quote;
    }

    const results = quote.results[0];

    // If we got valid data, cache and return it
    console.log(`Caching price data for ${ticker}`);
    DatabaseManager.setCachedStockInfo(ticker, results);
    return quote;
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
