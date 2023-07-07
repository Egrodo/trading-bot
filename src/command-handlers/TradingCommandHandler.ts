import {
  ChannelType,
  Client,
  CommandInteraction,
  TextChannel,
} from 'discord.js';
import { Guard } from '../utils/helpers';
import ENV from '../../env.json';
import ErrorReporter from '../utils/ErrorReporter';
import PolygonApi from '../classes/PolygonApi';

class TradingCommandHandler {
  public commands: CommandListType = {
    price: {
      description: 'Check the price of a stock',
      allowedChannel: ENV.tradingChannelId,
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
    const { commandName } = interaction;

    // Ensure that the command is only used in the proper channel.
    if (
      !this.commands[commandName].allowedChannel.includes(interaction.channelId)
    ) {
      interaction.reply({
        content: `This command is only available in <#${this.commands[
          commandName
        ].allowedChannel.toString()}>`,
        ephemeral: true,
      });
      return;
    }

    switch (commandName) {
      case 'price':
        return this.handlePriceCommand(interaction);
      default:
        interaction.reply('No command with that name found?');
    }
  }

  private async handlePriceCommand(
    interaction: CommandInteraction
  ): Promise<void> {
    const ticker = (
      interaction.options.get('ticker').value as string
    ).toUpperCase();
    if (!ticker) {
      ErrorReporter.reportErrorInDebugChannel(
        'Price command received with no ticker',
        interaction
      );
      return;
    }

    // TODO: Format it all pretty-like & include more info
    const quote = await PolygonApi.getPrevClosePriceData(ticker);
    if (quote.resultsCount === 0) {
      interaction.reply({
        content: `No stock found with ticker ${ticker}.`,
        ephemeral: true,
      });
    } else {
      const result = quote.results[0]; // For previous close, there should only be one result.
      interaction.reply(
        `The price of ${ticker} on previous close was $${result.c}`
      );
    }
  }
}

export default new TradingCommandHandler();
