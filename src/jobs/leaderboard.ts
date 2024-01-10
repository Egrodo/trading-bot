import { ChannelType, Client } from 'discord.js';
import GameAdminHandler from '../command-handlers/GameAdminHandler';
import * as ENV from '../../env.json';
import ErrorReporter from '../utils/ErrorReporter';
import DatabaseManager from '../classes/DatabaseManager';
import { chunkArray } from '../utils/helpers';
import PolygonApi from '../classes/PolygonApi';

const LEADERBOARD_POST_INTERVAL = 60 * 1000; // 1 minute
const PRICE_CHUNKED_REQUEST_SIZE = 3;

async function attemptPost(client: Client) {
  const embed = await GameAdminHandler.createLeaderboardMsg();
  if (!embed) {
    console.error('No leaderboard data to post.');
    return;
  }

  try {
    const channel = await client.channels.fetch(ENV.tradingChannelId);
    if (channel.type == ChannelType.GuildText) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    ErrorReporter.reportErrorInDebugChannel(
      'Failed to fetch trading channel to post leaderboard into. Maybe I dont hvae permission?',
      err
    );
  }
}

/**
 * In order to calculate leaderboard positions we need to proactively check the
 * price of each stock in everyone's portfolio. Rate limits prevent us from doing
 * this all at once, so we chunk the requests and slowly request them over time.
 */
export async function leaderboardJob(
  client: Client,
  _nextJob?: Date
): Promise<void> {
  const currentSeason = await GameAdminHandler.activeSeason?.name;
  if (!currentSeason) {
    console.warn('No active season found.');
    return;
  }
  const accountsForSeason = await DatabaseManager.getAccountsForSeason(
    currentSeason
  );
  const tickersNeeded = (
    await GameAdminHandler.getAllTickersForAccounts(accountsForSeason)
  )?.filter((ticker) => !DatabaseManager.tickerCache.has(ticker));

  const tickerChunks = chunkArray<string>(
    tickersNeeded,
    PRICE_CHUNKED_REQUEST_SIZE
  );

  console.log(`Slowly requesting ${tickerChunks.length} chunks of tickers`);

  if (!tickerChunks.length) return;

  const priceCashInterval = global.setInterval(async () => {
    const tickersToRequest = tickerChunks.shift();
    if (tickersToRequest === undefined) {
      clearInterval(priceCashInterval);
      attemptPost(client);
      return;
    }

    console.log(`Requesting ${tickersToRequest.join(', ')} to pre-cache`);

    tickersToRequest.forEach((ticker) =>
      PolygonApi.getPrevClosePriceData(ticker)
    );
  }, LEADERBOARD_POST_INTERVAL);
}
