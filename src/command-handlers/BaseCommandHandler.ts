import { Client, CommandInteraction } from 'discord.js';
import { CommandListType } from '../utils/types';

class BaseCommentHandler {
  public commands: CommandListType = {};
  protected _client: Client;

  init(client: Client) {
    if (!client) throw new Error('Client is undefined');
    this._client = client;
  }

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
}

export default BaseCommentHandler;
