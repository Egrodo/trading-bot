import { CommandListType, SeasonDocument } from '../types';
import ENV from '../../env.json';
import { CommandInteraction, EmbedBuilder, User } from 'discord.js';
import BaseCommentHandler from './BaseCommandHandler';
import DatabaseManager from '../classes/DatabaseManager';
import ErrorReporter from '../utils/ErrorReporter';
import { richStrings, strings } from '../static/strings';
import PolygonApi from '../classes/PolygonApi';
import { GuardClientExists, formatAmountToReadable } from '../utils/helpers';

type LeaderboardDataType = { [accountId: string]: /* accountValue */ number };

const MAX_USERS_TO_SHOW_ON_LEADERBOARD = 10;

/**
 * Handles configuration of game itself, including season and leaderboard data
 *
 * Admins can queue up a new season to start when the current season ends, and determine
 * what rewards (or punishments) are given to the winners of the season.
 *
 * This information needs to be stored in the database so it can persist, keyed on the
 * guild id.
 */
class GameAdmin extends BaseCommentHandler {
  public commands: CommandListType = {
    season: {
      description: 'Get or set trading game seasons',
      allowedChannel: ENV.debugInfoChannelId,
      adminsOnly: true,
      subCommands: {
        current: {
          description: 'Get information about the current season',
          handler: this.handleCurrentSeasonCommand.bind(this),
        },
        add: {
          description: 'Add a new season to the queue',
          handler: this.handleAddNewSeasonCommand.bind(this),
          options: [
            {
              name: 'name',
              description: 'The name of the season',
              type: 'string',
              required: true,
            },
            {
              name: 'startdate',
              description:
                'The date the season starts in a valid format like MM/DD/YYYY. At least one day in the future.',
              type: 'string',
              required: true,
            },
            {
              name: 'enddate',
              description:
                'The date the season ends in a valid format like MM/DD/YYYY. At least one day later than startdate',
              type: 'string',
              required: true,
            },
            {
              name: 'startingbalance',
              description:
                'The starting balance for each user, an integer in dollars (no cents)',
              type: 'integer',
              required: true,
            },
          ],
        },
        end: {
          description: 'End the current season early',
          handler: this.handleEndCurrentSeasonCommand.bind(this),
          options: [
            {
              name: 'name',
              description: 'To confirm, type the name of the current season',
              type: 'string',
              required: true,
            },
          ],
        },
      },
      // TODO: season list, season remove, season edit
    },
    leaderboard: {
      description: 'View player stat information',
      allowedChannel: ENV.debugInfoChannelId,
      adminsOnly: true,
      subCommands: {
        view: {
          description: 'View the top players for a season',
          handler: this.handleViewLeaderboardCommand.bind(this),
          options: [
            {
              name: 'name',
              description: 'View a specific season',
              type: 'string',
              required: false,
            },
          ],
        },
      },
    },
  };

  public seasons: { [seasonName: string]: SeasonDocument } = {};

  public activeSeason?: SeasonDocument;

  public async init(client) {
    super.init(client);
    return this.fetchSeasonInfo();
  }

  @GuardClientExists()
  public async checkForSeasonChanges(): Promise<void> {
    this.fetchSeasonInfo();
  }

  private async fetchSeasonInfo(): Promise<void> {
    console.log('Fetching season info...');
    const allSeasons = await DatabaseManager.getAllSeasons();
    if (!allSeasons?.length) return;
    this.seasons = allSeasons.reduce((acc, season) => {
      acc[season.name] = season;
      return acc;
    }, {});
    console.log(`Found ${Object.keys(this.seasons).length} seasons.`);

    // Select which season is active based on the current date
    const now = new Date().getTime();
    const activeSeason = allSeasons.find(
      (season) => season.start < now && season.end > now
    );
    if (activeSeason) {
      this.activeSeason = activeSeason;
      // TODO: This might also need to trigger some other things,
      // like announcement strings in the trading channel
      console.log(`Active season is "${this.activeSeason.name}"`);
    } else {
      console.log(`There is currently no active season.`);
    }
  }

  private handleCurrentSeasonCommand(interaction: CommandInteraction) {
    if (this.activeSeason) {
      interaction.reply(
        `Currently in season "${
          this.activeSeason.name
        }". The season ends ${new Date(
          this.activeSeason.end
        ).toDateString()} and started ${new Date(
          this.activeSeason.start
        ).toDateString()}`
      );
    } else {
      interaction.reply('There is no active season');
    }
  }

  private async handleEndCurrentSeasonCommand(interaction: CommandInteraction) {
    if (!this.activeSeason) {
      interaction.reply('There is no active season');
      return;
    }
    const name = interaction.options.get('name')?.value as string;
    if (name !== this.activeSeason.name) {
      interaction.reply({
        content: richStrings.seasonNameMismatch(name, this.activeSeason.name),
        ephemeral: true,
      });
      return;
    }
    await DatabaseManager.editSeason(
      name,
      new Date(this.activeSeason.start),
      new Date(new Date().getTime() - 10)
    );
    await interaction.reply(
      `${interaction.user.username} ended the season ${name}`
    );
    await this.fetchSeasonInfo();
  }

  // Do work to fetch all user accounts and calculate + sort by account value
  public async getLeaderboardDataForSeason(
    seasonName: string,
    limit = MAX_USERS_TO_SHOW_ON_LEADERBOARD
  ): Promise<LeaderboardDataType> {
    const accountsForSeason = await DatabaseManager.getAccountsForSeason(
      seasonName
    );

    // Get all tickers owned by all users
    const tickersToFetch = accountsForSeason.reduce<string[]>(
      (acc, [_accountId, accountData]) => {
        acc.push(...Object.keys(accountData.currentHoldings));
        return acc;
      },
      []
    );
    const tickerPricePromises = tickersToFetch.map<Promise<[string, number]>>(
      async (ticker) => {
        try {
          const priceData = await PolygonApi.getPrevClosePriceData(ticker);
          return [ticker, priceData.results[0].c];
        } catch (_err) {
          // TODO: This shouldn't throw unless a stock is delisted or something...
          ErrorReporter.reportErrorInDebugChannel(
            `Error fetching ticker price`,
            ticker,
            _err
          );
          return [ticker, 0];
        }
      }
    );
    const tickerPrices = (await Promise.all(tickerPricePromises)).reduce<
      Record<string, number>
    >((acc, [ticker, price]) => {
      acc[ticker] = price;
      return acc;
    }, {});

    // Now, for each player this season, calculate their total account value
    const accountValues = accountsForSeason.map<[string, number]>(
      ([accountId, accountData]) => {
        let totalValue = 0;
        for (const [ticker, quantity] of Object.entries(
          accountData.currentHoldings
        )) {
          totalValue += quantity * tickerPrices[ticker];
        }
        return [accountId, totalValue];
      }
    );

    const sortedAccountValues = accountValues.sort((a, b) => b[1] - a[1]);

    const winners = sortedAccountValues.splice(0, limit);

    return winners.reduce((acc, [accountId, accountValue]) => {
      acc[accountId] = accountValue;
      return acc;
    }, {});
  }

  public async handleViewLeaderboardCommand(interaction: CommandInteraction) {
    const seasonName = interaction.options.get('name')?.value as string;
    const whichSeason = seasonName ?? this.activeSeason?.name;

    if (whichSeason == null) {
      interaction.reply({
        content: strings.noActiveSeason,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(richStrings.leaderboardTitle(whichSeason))
      .setDescription(strings.leaderboardDescription)
      .setColor('#663399')
      .setTimestamp();

    // Defer reply since this will take awhile...
    await interaction.deferReply();

    let leaderboardData: LeaderboardDataType;
    try {
      leaderboardData = await this.getLeaderboardDataForSeason(whichSeason);
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        `Error fetching leaderboard data`,
        err
      );
      interaction.editReply({
        content: strings.errorCalculatingLeaderboard,
      });
      return;
    }

    // Fetch each eligible account's username in an id -> username map
    const usernamePromises = Object.keys(leaderboardData).map((accountId) =>
      this._client.users.fetch(accountId)
    );

    const usernames = await Promise.all(usernamePromises);

    const accountIdToUsername = usernames.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    // Now that we have the account values, we can build the embed
    const fields = [];
    Object.entries(leaderboardData).forEach(([accountId, accountValue]) => {
      console.log(usernames);
      const username =
        accountIdToUsername[accountId].globalName ??
        accountIdToUsername[accountId].username ??
        accountId;
      fields.push({
        name: username,
        value: formatAmountToReadable(accountValue),
        inline: true,
      });
    });

    embed.setFields(fields);

    interaction.editReply({ embeds: [embed] });
  }

  private async handleAddNewSeasonCommand(interaction: CommandInteraction) {
    const name = interaction.options.get('name')?.value as string;
    const startDateStr = interaction.options.get('startdate')?.value as string;
    const endDateStr = interaction.options.get('enddate')?.value as string;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    // To allow for seasons to be ended & started at the same time, set the time of each new
    // season to be 1 second before midnight
    endDate.setHours(23, 59, 59, 0);

    // Date validation
    if (
      startDate.toString() === 'Invalid Date' ||
      endDate.toString() === 'Invalid Date'
    ) {
      interaction.reply({
        content: strings.invalidDateFormat,
        ephemeral: true,
      });
      return;
    }

    // Start date must be before end date
    if (startDate > endDate) {
      interaction.reply({
        content: richStrings.invalidStartDateEnd(startDate, endDate),
        ephemeral: true,
      });
      return;
    }

    // Make sure that this season doesn't overlap with an existing one
    for (const season of Object.values(this.seasons)) {
      if (
        (startDate.getTime() >= season.start &&
          startDate.getTime() <= season.end) ||
        (endDate.getTime() >= season.start && endDate.getTime() <= season.end)
      ) {
        interaction.reply({
          content: richStrings.seasonOverlap(
            season.name,
            new Date(season.start),
            new Date(season.end)
          ),
          ephemeral: true,
        });
        return;
      }
    }

    // Make sure the name of this new season is unique
    if (this.seasons[name]) {
      interaction.reply({
        content: strings.duplicateSeasonName,
        ephemeral: true,
      });
      return;
    }

    // Make sure the starting balance makes sense
    const startingBalance = interaction.options.get('startingbalance')
      ?.value as number;
    if (
      !Number.isInteger(startingBalance) ||
      startingBalance < 1 ||
      startingBalance > 100000000
    ) {
      interaction.reply({
        content: strings.invalidStartingBalance,
        ephemeral: true,
      });
      return;
    }

    try {
      await DatabaseManager.addSeason(
        name,
        startDate,
        endDate,
        startingBalance
      );
    } catch (err) {
      interaction.reply({
        content: strings.errorAddingSeason,
        ephemeral: true,
      });
      ErrorReporter.reportErrorInDebugChannel(
        `Error adding season to the database`,
        err
      );
      return;
    }
    interaction.reply(richStrings.seasonAddSuccess(name, startDate, endDate));

    // Then update the seasons in memory
    await this.fetchSeasonInfo();
  }
}

export default new GameAdmin();
