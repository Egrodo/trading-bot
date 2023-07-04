import { Client, CommandInteraction } from 'discord.js';
import { Guard } from '../utils/helpers';
import ENV from '../../env.json';

class TradingCommandHandler {
  public commands: CommandListType = {
    price: {
      description: 'Check the price of a stock',
      allowedChannel: ENV.tradingChannelId,
    },
  };
  private _client: Client;
  //   _userManager: UserManager;
  //   _tradingChannel: TextChannel;
  init(client: Client) {
    if (!client) throw new Error('Client is undefined');
    this._client = client;
  }

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

    interaction.reply('Work in progress!');
  }
}

export default new TradingCommandHandler();
