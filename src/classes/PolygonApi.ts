import ENV from '../../env.json';
import ErrorReporter from '../utils/ErrorReporter';
import {
  IAggsPreviousClose,
  ITickerDetails,
  restClient,
} from '@polygon.io/client-js';

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

  public async getPrevClosePriceData(
    ticker: string
  ): Promise<IAggsPreviousClose> {
    return this._restClient.stocks.previousClose(ticker);
  }

  /**
   * Ticker information likely doesn't change often so we can cache it in a
   * quick LRU
   */
  _tickerInfoCache: Map<string, ITickerDetails> = new Map();
  _tickerInfoCacheMaxSize = 100;
  public async getTickerInfo(ticker: string): Promise<ITickerDetails> {
    if (this._tickerInfoCache.has(ticker)) {
      return this._tickerInfoCache.get(ticker);
    }

    const tickerInfo = await this._restClient.reference.tickerDetails(ticker);
    if (tickerInfo) {
      this._tickerInfoCache.set(ticker, tickerInfo);
      if (this._tickerInfoCache.size > this._tickerInfoCacheMaxSize) {
        this._tickerInfoCache.delete(this._tickerInfoCache.keys().next().value);
      }
    }

    return tickerInfo;
  }
}

export default new PolygonApi();
