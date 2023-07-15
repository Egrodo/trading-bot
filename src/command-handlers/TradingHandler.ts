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
import { CommandListType, IAggsResults } from '../types/types';
import { IAggsPreviousClose } from '@polygon.io/client-js';
import DatabaseManager from '../classes/DatabaseManager';
import BaseCommentHandler from './BaseCommandHandler';
import SeasonConfigManager from './SeasonConfigManager';
import messages from '../static/messages';
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
  };

  private _tradingChannel: TextChannel;
  init(client: Client) {
    super.init(client);
    this.fetchTradingChannel();
  }

  private async fetchTradingChannel() {
    const channel = await this._client.channels.cache.get(ENV.tradingChannelId);
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
        content: `Error fetching price data, try again in a few minutes.`,
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
        content: `Error fetching price data, try again in a few minutes.`,
        ephemeral: true,
      });
      return;
    }
    if (quote.resultsCount === 0 || !quote.results?.length) {
      interaction.reply({
        content: `No stock found with ticker ${ticker}.`,
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
        content: `Ticker is invalid.`,
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
        content: `Ticker ${ticker} is invalid. Ticker must be 1-5 English letters only.`,
        ephemeral: true,
      });
      return;
    }

    const prevClose = await this.fetchPriceInfo(ticker, interaction);
    if (!prevClose) return;

    let companyInfo;
    try {
      const companyInfoReq = await PolygonApi.getTickerInfo(ticker);
      if (companyInfoReq?.status === 'OK') {
        companyInfo = companyInfoReq.results;
      }
    } catch (err) {
      if (err.message !== 'Ticker not found.') {
        ErrorReporter.reportErrorInDebugChannel(
          `Error fetching company info for ${ticker}`,
          err
        );
      }
    }

    // Compose data to display
    const companyName = companyInfo?.name ?? ticker;
    const logoUrl = companyInfo?.branding?.icon_url
      ? `${companyInfo?.branding.icon_url}?apiKey=${ENV.polygonKey}`
      : null;

    // If the stock was up for the day, show green. Otherwise show red
    const color = prevClose.c > prevClose.o ? '#00FF00' : '#FF0000';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(companyName)
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

    if (companyInfo?.homepage_url) {
      embed.setURL(companyInfo.homepage_url);
    }

    const reply = { embeds: [embed], files: [] };
    let logoAttachment;
    if (logoUrl) {
      logoAttachment = new AttachmentBuilder(logoUrl, {
        name: `${ticker}-logo.png`,
      });
      embed.setThumbnail(`attachment://${logoAttachment.name}`);
      reply.files.push(logoAttachment);
    }

    interaction.reply(reply);
  }

  public async handleBuyCommand(interaction: CommandInteraction) {
    if (!SeasonConfigManager.activeSeason) {
      interaction.reply({
        content: messages.noActiveSeason,
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
        content: messages.noAccount,
        ephemeral: true,
      });
      return;
    }

    const { c: stockPrice } = await this.fetchPriceInfo(ticker, interaction);

    const totalCost = Number((stockPrice * quantity).toFixed(2));

    const userBalance = userAccount.balance;

    if (totalCost > userBalance) {
      interaction.reply({
        content: messages.notEnoughMoneyForBuy(
          userBalance,
          quantity,
          ticker,
          totalCost
        ),
        ephemeral: true,
      });
      return;
    }

    // Success? Update the user's balance and add the stock to their portfolio
    try {
      await DatabaseManager.addStocksToAccount({
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
      const imgPath = path.resolve(__dirname, '../images/success.png');
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
        content: messages.checkNewBalance(userAccount.balance),
        ephemeral: true,
      });
    } catch (err) {
      interaction.reply({
        content: messages.errorBuyingStock,
        ephemeral: true,
      });
      return;
    }
  }
}

export default new TradingCommandHandler();