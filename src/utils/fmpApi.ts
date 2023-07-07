import ENV from '../../env.json';

const BASE_URL = 'https://financialmodelingprep.com/api/v3/quote';

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

export async function getQuote(ticker: string): Promise<StockQuote> {
  const composedUrl = `${BASE_URL}/${ticker}?apikey=${ENV.fmpKey}`;
  try {
    const result = await fetch(composedUrl);
    if (result.status === 404) {
      throw new Error('Invalid stock ticker, stock not found.');
    }
    if (!result || !result.body || !result.ok) {
      throw new Error('Improperly formatted response data for price check');
    }

    const parsedData: StockQuote = await result.json();
    return parsedData;
  } catch (err) {
    console.error(err);
    throw new Error('Error fetching stock price');
  }
}
