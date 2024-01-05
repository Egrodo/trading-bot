import { CommandListType } from '../types';
import ENV from '../../env.json';
import { richStrings, strings } from '../static/strings';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import DatabaseManager from '../classes/DatabaseManager';
import BaseCommentHandler from './BaseCommandHandler';
import GameAdminManager from './GameAdminHandler';
import PolygonApi from '../classes/PolygonApi';
import { ITickerDetails } from '@polygon.io/client-js';
import { formatAmountToReadable, isValidStockTicker } from '../utils/helpers';
import ErrorReporter from '../utils/ErrorReporter';

/* Handles operations to user account information */
class UserAccountManager extends BaseCommentHandler {
  public commands: CommandListType = {
    signup: {
      description: "Sign up for the current season's trading competition",
      allowedChannel: ENV.tradingChannelId,
      handler: this.handleSignupCommand.bind(this),
    },
    balance: {
      description: 'Check how much you have in cash',
      allowedChannel: ENV.tradingChannelId,
      handler: this.handleBalanceCommand.bind(this),
    },
    portfolio: {
      description: 'Check the current stock holdings on your account',
      allowedChannel: ENV.tradingChannelId,
      handler: this.handlePortfolioCommand.bind(this),
    },
    asset: {
      description: 'View your trading history for a specific stock',
      allowedChannel: ENV.tradingChannelId,
      handler: this.handleAssetCommand.bind(this),
      options: [
        {
          name: 'ticker',
          description: 'The ticker you want to view info for',
          type: 'string',
          required: true,
        },
      ],
    },
    // TODO: Trade history command? Prob should figure out pagination first.
  };

  private async handleSignupCommand(interaction: CommandInteraction) {
    const user = interaction.user;
    const currentSeason = GameAdminManager.activeSeason;
    if (!currentSeason) {
      interaction.reply({
        content: strings.signupFailureNoSeason,
        ephemeral: true,
      });
      return;
    }
    const seasonName = currentSeason.name;
    try {
      const existingUser = await DatabaseManager.getAccount(
        user.id,
        seasonName
      );

      if (existingUser) {
        interaction.reply({
          content: `${strings.dupAccount} ${richStrings.checkBalance(
            existingUser.balance
          )}`,
          ephemeral: true,
        });
        return;
      }

      await DatabaseManager.registerAccount(
        user.id,
        currentSeason.startingBalance,
        seasonName
      );
      interaction.reply({
        content: richStrings.signupSuccess(
          GameAdminManager.activeSeason.startingBalance
        ),
        ephemeral: true,
      });
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(`Failed to sign up user.`, err);
      interaction.reply({ content: strings.signupFailure, ephemeral: true });
      return;
    }
  }

  private async handleBalanceCommand(interaction: CommandInteraction) {
    const user = interaction.user;
    const activeSeason = GameAdminManager.activeSeason;
    if (!activeSeason) {
      interaction.reply({
        content: strings.noActiveSeason,
        ephemeral: true,
      });
      return;
    }
    const account = await DatabaseManager.getAccount(
      user.id,
      activeSeason.name
    );
    if (!account) {
      interaction.reply({ content: strings.noAccount, ephemeral: true });
      return;
    }

    interaction.reply({
      content: richStrings.checkBalance(account.balance),
      ephemeral: true,
    });
  }

  private async handlePortfolioCommand(interaction: CommandInteraction) {
    const user = interaction.user;
    const activeSeason = GameAdminManager.activeSeason;
    if (!activeSeason) {
      interaction.reply({
        content: strings.noActiveSeason,
        ephemeral: true,
      });
      return;
    }
    const account = await DatabaseManager.getAccount(
      user.id,
      activeSeason.name
    );
    if (!account) {
      interaction.reply({ content: strings.noAccount, ephemeral: true });
      return;
    }

    const currentHoldings = account.currentHoldings;

    // This should never happen but just in case
    const holdingEntriesZeroesRemoved = Object.entries(currentHoldings).filter(
      ([, quantity]) => quantity > 0
    );

    if (holdingEntriesZeroesRemoved.length === 0) {
      interaction.reply({
        content: `You don't have any stocks in your portfolio! Buy some with /buy`,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Portfolio for ${user.username}`)
      .setAuthor({
        name: ENV.botName,
        iconURL: ENV.botIconUrl,
      })
      .setDescription(
        `Your current holdings for ${activeSeason.name} are as follows:`
      )
      .setColor('#663399');

    // Do the first up to 25 holdings
    const firstLoopLength =
      holdingEntriesZeroesRemoved.length > 25
        ? 25
        : holdingEntriesZeroesRemoved.length;
    const embedFields = [];
    for (let i = 0; i < firstLoopLength; ++i) {
      const [ticker, quantity] = holdingEntriesZeroesRemoved[i];
      embedFields.push({
        name: ticker,
        value: quantity.toLocaleString(),
        inline: true,
      });
    }

    embed.setFields(embedFields);
    // If there are more than 25 holdings we need an additional embed as a single
    // only supports up to 25 table items.
    // TODO: Find a better way to display extraneous holdings
    // if (holdingEntriesZeroesRemoved.length > 25) {
    //   for (let i = 25; i < holdingEntriesZeroesRemoved.length; i += 25) {
    //     const embed = new EmbedBuilder()
    //       .setDescription(
    //         'a continued display of your stock holdings are below:'
    //       )
    //       .setColor('#663399')
    //       .setTimestamp();
    //     const fields = [];
    //     const loopLength =
    //       i + 25 > holdingEntriesZeroesRemoved.length
    //         ? holdingEntriesZeroesRemoved.length
    //         : i + 25;
    //     for (let j = i; j < loopLength; ++j) {
    //       const [ticker, quantity] = holdingEntriesZeroesRemoved[j];
    //       fields.push({
    //         name: ticker,
    //         value: quantity.toLocaleString(),
    //         inline: true,
    //       });
    //     }
    //     embed.addFields(fields);
    //     allEmbeds.push(embed);
    //   }
    // }

    embed.setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Now that we've replied with a dumb portfolio, let's see if we can enrich it with
    // price / company information. Fetch & format.
    const tickerInfoPromises = holdingEntriesZeroesRemoved.map(
      async ([ticker]) => {
        try {
          const tickerInfo = await PolygonApi.getTickerInfo(ticker);
          return tickerInfo;
        } catch (_err) {
          // Not all stocks have rich info, eat throw
        }
      }
    );
    const tickerInfo = (await Promise.all(tickerInfoPromises)).reduce<
      Record<string, ITickerDetails['results']>
    >((acc, tickerInfo) => {
      if (tickerInfo == null) return acc;
      acc[tickerInfo.results.ticker] = tickerInfo.results;
      return acc;
    }, {});
    const tickerPricePromises = holdingEntriesZeroesRemoved.map(
      async ([ticker]) => {
        try {
          const priceData = await PolygonApi.cacheGetPrevClosePriceData(ticker);
          return priceData;
        } catch (_err) {
          // Not all stocks have rich info, eat throw
        }
      }
    );

    let portfolioSum = 0;
    const tickerPrices = (await Promise.all(tickerPricePromises)).reduce<
      Record<string, number>
    >((acc, tickerPrice) => {
      if (tickerPrice == null) return acc;
      const currPrice = tickerPrice.results[0].c;
      acc[tickerPrice.ticker] = currPrice;
      portfolioSum += currPrice;
      return acc;
    }, {});

    // Now edit the fields
    const richEmbedFields = [];
    for (let i = 0; i < firstLoopLength; ++i) {
      const [ticker, quantity] = holdingEntriesZeroesRemoved[i];
      // Prune "inc" and "corp" from the end of the name
      const stockName = tickerInfo[ticker]?.name?.replace(
        /(inc|corp|Inc|Corp|Inc\.|Corp\.|inc\.|corp\.)$/i,
        ''
      );

      const priceString = tickerPrices[ticker]
        ? richStrings.portfolioShares(quantity, tickerPrices[ticker])
        : quantity.toLocaleString();
      richEmbedFields.push({
        name: stockName ?? ticker,
        value: priceString,
        inline: true,
      });
    }
    embed.setFields(richEmbedFields);
    embed.setFooter({
      text: `Total portfolio value: ${formatAmountToReadable(portfolioSum)}`,
    });
    await interaction.editReply({ embeds: [embed] });
  }

  /* Provide user with insights on their trade history with any one specific stock */
  private async handleAssetCommand(interaction: CommandInteraction) {
    // Validate that the user actually sent a ticker
    const ticker = (
      interaction.options.get('ticker')?.value as string
    )?.toUpperCase();
    if (!ticker) {
      interaction.reply({
        content: strings.invalidStockTicker,
        ephemeral: true,
      });
      ErrorReporter.reportErrorInDebugChannel(
        'Price command received with no ticker',
        interaction
      );
      return;
    }

    if (!isValidStockTicker(ticker)) {
      interaction.reply({
        content: strings.invalidStockTicker,
        ephemeral: true,
      });
      return;
    }

    // Get relevant user information
    const user = interaction.user;
    const activeSeason = GameAdminManager.activeSeason;
    if (!activeSeason) {
      interaction.reply({
        content: strings.noActiveSeason,
        ephemeral: true,
      });
      return;
    }
    const account = await DatabaseManager.getAccount(
      user.id,
      activeSeason.name
    );
    if (!account) {
      interaction.reply({ content: strings.noAccount, ephemeral: true });
      return;
    }

    // Get all trade history for a specific ticker
    const relevantTradeHistory = account.tradeHistory.filter(
      (pastTrade) => pastTrade.ticker === ticker
    );
    const tradeCount = relevantTradeHistory.length;

    // Calculate cost-basis
    const totalSpend = relevantTradeHistory.reduce(
      (acc, pastTrade) => acc + pastTrade.price * pastTrade.quantity,
      0
    );
    // For purpose of calculating averageCost, i need to get the total stocks traded not the tradeCount
    const totalTraded = relevantTradeHistory.reduce(
      (acc, pastTrade) => acc + pastTrade.quantity,
      0
    );
    const averageCost = totalSpend / totalTraded;

    // Find lowest and highest price the user bought at
    const [lowestCost, highestCost] = relevantTradeHistory.reduce(
      (acc, pastTrade) => {
        let [prevLowest, prevHighest] = acc;
        if (pastTrade.price < prevLowest) prevLowest = pastTrade.price;
        if (pastTrade.price > prevHighest) prevHighest = pastTrade.price;
        return [prevLowest, prevHighest];
      },
      [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]
    );

    const firstTrade = relevantTradeHistory[0];
    const lastTrade = relevantTradeHistory[tradeCount - 1];

    // Compose the msg
    const embed = new EmbedBuilder()
      .setColor('#123abc') // TODO:
      .setTitle(richStrings.tradeSummaryTitle(ticker))
      .setAuthor({
        name: ENV.botName,
        iconURL: ENV.botIconUrl,
      })
      .setDescription(richStrings.tradeSummaryDesc(tradeCount))
      .setTimestamp();

    const fields = [
      {
        name: strings.tradeSummaryTotalSpend,
        value: formatAmountToReadable(totalSpend),
        inline: true,
      },
      {
        name: strings.tradeSummaryCostBasis,
        value: formatAmountToReadable(averageCost),
        inline: true,
      },
      {
        name: strings.tradeSummaryLowestCost,
        value: formatAmountToReadable(lowestCost),
        inline: true,
      },
      {
        name: strings.tradeSummaryHighestCost,
        value: formatAmountToReadable(highestCost),
        inline: true,
      },
      {
        name: strings.tradeSummaryFirstTrade,
        value: richStrings.tradeSummaryTimeStr(firstTrade.type, firstTrade),
        inline: true,
      },
      {
        name: strings.tradeSummaryLastTrade,
        value: richStrings.tradeSummaryTimeStr(lastTrade.type, lastTrade),
        inline: true,
      },
    ];
    embed.setFields(fields);
    interaction.reply({ embeds: [embed], ephemeral: false });
  }
}

export default new UserAccountManager();
