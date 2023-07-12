import { Client, ChatInputCommandInteraction } from 'discord.js';
import { CommandListType, CommandWithSubCommandsType } from '../utils/types';
import { Guard } from '../utils/helpers';

class BaseCommentHandler {
  public commands: CommandListType = {};
  protected _client: Client;

  init(client: Client) {
    if (!client) throw new Error('Client is undefined');
    this._client = client;
  }

  @Guard()
  public async onMessage(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    // Ensure that the command is only used in the proper channel.

    const localCommand = this.commands[interaction.commandName];
    if (!localCommand.allowedChannel.includes(interaction.channelId)) {
      interaction.reply({
        content: `This command is only available in <#${localCommand.allowedChannel.toString()}>`,
        ephemeral: true,
      });
      return;
    }

    let commandHandler;

    const subCommand = interaction.options.getSubcommand();
    if (subCommand) {
      commandHandler = (localCommand as CommandWithSubCommandsType).subCommands[
        subCommand
      ].handler;
    } else {
      commandHandler = localCommand.handler;
    }

    return commandHandler(interaction);
  }
}

export default BaseCommentHandler;
