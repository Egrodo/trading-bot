import {
  AttachmentBuilder,
  ChannelType,
  Client,
  CommandInteraction,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { Guard } from '../utils/helpers';
import ENV from '../../env.json';
import ErrorReporter from '../utils/ErrorReporter';
import PolygonApi from '../classes/PolygonApi';
import { CommandListType } from '../utils/types';

class TradingCommandHandler {
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
  };
  private _client: Client;

  private _tradingChannel: TextChannel;
  //   _userManager: UserManager;
  init(client: Client) {
    if (!client) throw new Error('Client is undefined');
    this._client = client;

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

  @Guard()
  public async onMessage(interaction: CommandInteraction): Promise<void> {
    // Ensure that the command is only used in the proper channel.
    const localCommand = this.commands[interaction.commandName];
    if (!localCommand.allowedChannel.includes(interaction.channelId)) {
      interaction.reply({
        content: `This command is only available in <#${localCommand.allowedChannel.toString()}>`,
        ephemeral: true,
      });
      return;
    }

    return localCommand.handler(interaction);
  }

  private async handlePriceCommand(
    interaction: CommandInteraction
  ): Promise<void> {
    const ticker = (
      interaction.options.get('ticker')?.value as string
    ).toUpperCase();
    if (!ticker) {
      ErrorReporter.reportErrorInDebugChannel(
        'Price command received with no ticker',
        interaction
      );
      return;
    }

    const quote = await PolygonApi.getPrevClosePriceData(ticker);
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
    if (quote.resultsCount === 0) {
      interaction.reply({
        content: `No stock found with ticker ${ticker}.`,
        ephemeral: true,
      });
      return;
    }

    const prevClose = quote.results[0]; // For previous close, there should only be one result.

    const companyInfoReq = await PolygonApi.getTickerInfo(ticker);
    const { results: companyInfo } = companyInfoReq;

    // Compose data to display
    const companyName = companyInfo.name ?? ticker;
    const logoUrl = companyInfo.branding?.icon_url
      ? `${companyInfo.branding.icon_url}?apiKey=${ENV.polygonKey}`
      : null;

    // If the stock was up for the day, show green. Otherwise show red
    const color = prevClose.c > prevClose.o ? '#00FF00' : '#FF0000';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(companyName)
      .setURL(companyInfo.homepage_url)
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
}

export default new TradingCommandHandler();
