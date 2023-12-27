import {
  AttachmentBuilder,
  ChannelType,
  Client,
  CommandInteraction,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import ENV from '../../env.json';
import ErrorReporter from '../utils/ErrorReporter';
import PolygonApi from '../classes/PolygonApi';
import { CommandListType, IAggsResults } from '../types';
import { IAggsPreviousClose } from '@polygon.io/client-js';
import DatabaseManager from '../classes/DatabaseManager';
import BaseCommentHandler from './BaseCommandHandler';
import SeasonConfigManager from './SeasonConfigManager';
import { richStrings, strings } from '../static/strings';
import { formatAmountToReadable } from '../utils/helpers';
import fsPromise from 'fs/promises';
import path from 'path';

class TradingCommandHandler extends BaseCommentHandler {
  public commands: CommandListType = {
    price: {
      description: 'Check the price of a stock',
      allowedChannel: ENV.tradingChannelId,
      handler: this.handlePriceCommand.bind(this),
      options: [
        {
          name: 'ticker',
          description: 'The ticker of the stock to check',
          type: 'string',
          required: true,
          maxLength: 5,
          minLength: 1,
        },
      ],
    },
    buy: {
      description: 'Buy a stock',
      allowedChannel: ENV.tradingChannelId,
      handler: this.handleBuyCommand.bind(this),
      options: [
        {
          name: 'ticker',
          description: 'The ticker of the stock to buy',
          type: 'string',
          required: true,
          maxLength: 5,
          minLength: 1,
        },
        {
          name: 'quantity',
          description: 'The quantity of the stock to buy',
          type: 'integer',
          required: true,
          minValue: 1,
          maxValue: 1000000,
        },
      ],
    },
    sell: {
      description: 'Sell a stock',
      allowedChannel: ENV.tradingChannelId,
      handler: this.handleSellCommand.bind(this),
      options: [
        {
          name: 'ticker',
          description: 'The ticker of the stock to sell',
          type: 'string',
          required: true,
          maxLength: 5,
          minLength: 1,
        },
        {
          name: 'quantity',
          description: 'The quantity of the stock to sell',
          type: 'integer',
          required: true,
          minValue: 1,
          maxValue: 1000000,
        },
      ],
    },
  };

  private _tradingChannel: TextChannel;
  init(client: Client) {
    super.init(client);
    this.fetchTradingChannel();
  }

  private async fetchTradingChannel() {
    const channel = await this._client.channels.cache.get(ENV.tradingChannelId);
    if (channel == null) {
      ErrorReporter.reportErrorInDebugChannel(
        'Trading channel not found in cache'
      );
      return;
    }
    if (channel.type === ChannelType.GuildText) {
      this._tradingChannel = channel;
    } else {
      ErrorReporter.reportErrorInDebugChannel(
        'Trading channel is not a text channel'
      );
    }
  }

  /* Get price info either from the cache or from Polygon API */
  private async fetchPriceInfo(
    ticker: string,
    interaction: CommandInteraction
  ): Promise<IAggsResults> {
    const cachedPriceInfo = await DatabaseManager.getCachedPrice(ticker);
    if (cachedPriceInfo) {
      console.log(`Found cached price data for ${ticker}`);
      return cachedPriceInfo;
    }
    let quote: IAggsPreviousClose;
    try {
      console.log(`Requesting price data for ${ticker}`);
      quote = await PolygonApi.getPrevClosePriceData(ticker);
    } catch (err) {
      interaction.reply({
        content: strings.errorFetchingPrice,
        ephemeral: true,
      });
      return;
    }
    if (quote.status !== 'OK') {
      ErrorReporter.reportErrorInDebugChannel(
        `Error fetching price data for ${ticker}`,
        interaction
      );
      interaction.reply({
        content: strings.errorFetchingPrice,
        ephemeral: true,
      });
      return;
    }
    if (quote.resultsCount === 0 || !quote.results?.length) {
      interaction.reply({
        content: strings.invalidStockTicker,
        ephemeral: true,
      });
      return;
    }

    const results = quote.results[0];

    // If we got valid data, cache it
    console.log(`Caching price data for ${ticker}`);
    DatabaseManager.setCachedStockInfo(ticker, results);

    return results;
  }

  private async handlePriceCommand(
    interaction: CommandInteraction
  ): Promise<void> {
    // Validate that the user actually sent a ticker
    const ticker = (
      interaction.options.get('ticker')?.value as string
    ).toUpperCase();
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

    const validRegex = new RegExp(/^[A-z]{1,5}$/g);
    if (!validRegex.test(ticker)) {
      interaction.reply({
        content: strings.invalidStockTicker,
        ephemeral: true,
      });
      return;
    }

    const prevClose = await this.fetchPriceInfo(ticker, interaction);
    // Errors handled inside fetchPriceInfo
    if (!prevClose) {
      return;
    }

    // If the stock was up for the day, show green. Otherwise show red
    const color = prevClose.c > prevClose.o ? '#00FF00' : '#FF0000';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(ticker)
      .setAuthor({
        name: ENV.botName,
        iconURL: ENV.botIconUrl,
      })
      .setDescription(`Market close data from the last trading day`)
      .addFields([
        {
          name: 'Close price',
          value: `$${prevClose.c}`,
          inline: true,
        },
        {
          name: prevClose.c > prevClose.o ? 'Increase of' : 'Decrease of',
          value: `$${(prevClose.c - prevClose.o).toFixed(2)}`,
          inline: true,
        },
        {
          name: '\u200B',
          value: '\u200B',
          inline: true,
        },
        {
          name: 'Percent change',
          value: `${((prevClose.c / prevClose.o - 1) * 100).toFixed(2)}%`,
        },
        {
          name: 'Open price',
          value: `$${prevClose.o}`,
          inline: true,
        },
        {
          name: 'High price',
          value: `$${prevClose.h}`,
          inline: true,
        },
        {
          name: 'Low price',
          value: `$${prevClose.l}`,
          inline: true,
        },
        {
          name: 'Volume',
          value: `${prevClose.v.toLocaleString()} shares traded`,
        },
      ])
      .setTimestamp();

    const reply = { embeds: [embed], files: [] };

    await interaction.reply(reply);

    // After replying, see if we can get more info to display
    let companyInfo;
    try {
      const companyInfoReq = await PolygonApi.getTickerInfo(ticker);
      if (companyInfoReq?.status === 'OK') {
        companyInfo = companyInfoReq.results;
      }
    } catch (err) {
      // Mute this error because it's not really an issue.
      if (err.message !== 'Ticker not found.') {
        ErrorReporter.reportErrorInDebugChannel(
          `Error fetching company info for ${ticker}`,
          err
        );
      }
    }

    if (companyInfo) {
      console.log(`Found company info for ${ticker}`);
      if (companyInfo.name != null) {
        embed.setTitle(companyInfo.name);
      }

      if (companyInfo?.homepage_url) {
        embed.setURL(companyInfo.homepage_url);
      }

      if (companyInfo?.branding?.icon_url != null) {
        const logoUrl = `${companyInfo.branding.icon_url}?apiKey=${ENV.polygonKey}`;
        const logoAttachment = new AttachmentBuilder(logoUrl, {
          name: `${ticker}-logo.png`,
        });
        embed.setThumbnail(`attachment://${logoAttachment.name}`);
        reply.files.push(logoAttachment);
      }

      try {
        interaction.editReply(reply);
      } catch (err) {
        // If looking for comapny info took too long the interaction edit reply might
        // throw an error because the interaction expired. Eat it.
      }
    }
  }

  public async handleBuyCommand(interaction: CommandInteraction) {
    if (!SeasonConfigManager.activeSeason) {
      interaction.reply({
        content: strings.noActiveSeason,
        ephemeral: true,
      });
      return;
    }

    const ticker = (
      interaction.options.get('ticker')?.value as string
    ).toUpperCase();
    const quantity = interaction.options.get('quantity')?.value as number;

    // Get user info to validate that they can afford this transaction
    const userAccount = await DatabaseManager.getAccount(
      interaction.user.id,
      SeasonConfigManager.activeSeason.name
    );

    if (!userAccount) {
      interaction.reply({
        content: strings.noAccount,
        ephemeral: true,
      });
      return;
    }

    const { c: stockPrice } = await this.fetchPriceInfo(ticker, interaction);

    const totalCost = Number((stockPrice * quantity).toFixed(2));

    const userBalance = userAccount.balance;

    if (totalCost > userBalance) {
      interaction.reply({
        content: richStrings.notEnoughMoneyForBuy(
          userBalance,
          quantity,
          ticker,
          totalCost
        ),
        ephemeral: true,
      });
      return;
    }

    const newBalance = userBalance - totalCost;

    // Success? Update the user's balance and add the stock to their portfolio
    try {
      await DatabaseManager.buyStocks({
        userId: interaction.user.id,
        userAccount,
        seasonName: SeasonConfigManager.activeSeason.name,
        ticker,
        price: stockPrice,
        quantity,
      });

      // Success! Reply with a detailed confirmation message
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`Success!`)
        .setAuthor({
          name: ENV.botName,
          iconURL: ENV.botIconUrl,
        })
        .setDescription(
          `Succesfully purchased ${quantity} shares of ${ticker} at ${formatAmountToReadable(
            stockPrice
          )} per share for a total of ${formatAmountToReadable(totalCost)}`
        )
        .setTimestamp();

      // Attach success icon
      const imgPath = path.resolve(__dirname, '../static/images/success.png');
      const imgBuffer = await fsPromise.readFile(imgPath);

      const successIconAttachment = new AttachmentBuilder(imgBuffer, {
        name: 'success.png',
      });
      embed.setThumbnail(`attachment://${successIconAttachment.name}`);

      await interaction.reply({
        embeds: [embed],
        files: [successIconAttachment],
      });
      // Follow up with ephemeral message telling user their new balance
      await interaction.followUp({
        content: richStrings.checkNewBalance(newBalance),
        ephemeral: true,
      });
    } catch (err) {
      interaction.reply({
        content: strings.errorBuyingStock,
        ephemeral: true,
      });
      return;
    }
  }

  public async handleSellCommand(interaction: CommandInteraction) {
    if (!SeasonConfigManager.activeSeason) {
      interaction.reply({
        content: strings.noActiveSeason,
        ephemeral: true,
      });
      return;
    }

    const ticker = (
      interaction.options.get('ticker')?.value as string
    ).toUpperCase();
    const quantity = interaction.options.get('quantity')?.value as number;

    // Get user info to validate that they own the stock they're trying to sell
    const userAccount = await DatabaseManager.getAccount(
      interaction.user.id,
      SeasonConfigManager.activeSeason.name
    );

    if (!userAccount) {
      interaction.reply({
        content: strings.noAccount,
        ephemeral: true,
      });
      return;
    }

    const usersHoldings = userAccount.currentHoldings;
    const holdingsOfRequestedStock = usersHoldings[ticker];
    if (!holdingsOfRequestedStock || holdingsOfRequestedStock === 0) {
      interaction.reply({
        content: richStrings.dontOwnStock(ticker),
        ephemeral: true,
      });
      return;
    }

    if (holdingsOfRequestedStock < quantity) {
      interaction.reply({
        content: richStrings.notEnoughStock(ticker, quantity),
        ephemeral: true,
      });
      return;
    }

    // To prevent arbitrage, disallow user from selling a stock that they purchased within the last day.
    const lastTradeOfStock = userAccount.tradeHistory.find(
      (trade) => trade.ticker === ticker
    );
    if (lastTradeOfStock.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
      interaction.reply({
        content: richStrings.tooSoonToSell(ticker, lastTradeOfStock.timestamp),
        ephemeral: true,
      });
      return;
    }

    const { c: stockPrice } = await this.fetchPriceInfo(ticker, interaction);

    const totalIncome = Number((stockPrice * quantity).toFixed(2));
    const newBalance = userAccount.balance + totalIncome;

    // Success? Update the user's balance and remove the stock quantity from their account
    try {
      await DatabaseManager.sellStocks({
        userId: interaction.user.id,
        userAccount,
        seasonName: SeasonConfigManager.activeSeason.name,
        ticker,
        price: stockPrice,
        quantity,
      });

      // Success! Reply with a detailed confirmation message
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`Success!`)
        .setAuthor({
          name: ENV.botName,
          iconURL: ENV.botIconUrl,
        })
        .setDescription(
          `Succesfully sold ${quantity} shares of ${ticker} at ${formatAmountToReadable(
            stockPrice
          )} per share for a total of ${formatAmountToReadable(totalIncome)}`
        )
        .setTimestamp();

      // Attach success icon
      const imgPath = path.resolve(__dirname, '../static/images/success.png');
      const imgBuffer = await fsPromise.readFile(imgPath);

      const successIconAttachment = new AttachmentBuilder(imgBuffer, {
        name: 'success.png',
      });
      embed.setThumbnail(`attachment://${successIconAttachment.name}`);

      await interaction.reply({
        embeds: [embed],
        files: [successIconAttachment],
      });

      // Follow up with ephemeral message telling user their new balance
      await interaction.followUp({
        content: richStrings.checkNewBalance(newBalance),
        ephemeral: true,
      });
    } catch (err) {
      interaction.reply({
        content: strings.errorSellingStock,
        ephemeral: true,
      });
      return;
    }
  }
}

export default new TradingCommandHandler();
