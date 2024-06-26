import { ChatInputCommandInteraction, Client, GuildMember } from 'discord.js';
import { CommandListType, CommandWithSubCommandsType } from '../types';
import { GuardClientExists } from '../utils/helpers';
import { richStrings, strings } from '../static/strings';
import { PermissionFlagsBits } from 'discord.js';
import * as ENV from '../../env.json';

class BaseCommentHandler {
  public commands: CommandListType = {};
  protected _client: Client;

  init(client: Client) {
    if (!client) throw new Error('Client is undefined');
    this._client = client;
  }

  @GuardClientExists()
  public async onMessage(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const localCommand = this.commands[interaction.commandName];

    if (localCommand.allowDm === true) {
      // TODO: Do I even want to support this?
      throw new Error('Not Implemented yet');
    }

    if (localCommand.adminsOnly) {
      // Ensure user is admin; otherwise tell them off
      const isAdmin = (interaction.member as GuildMember).permissions.has(
        PermissionFlagsBits.Administrator
      );
      if (!isAdmin) {
        interaction.reply({
          content: strings.noPermission,
          ephemeral: true,
        });
        return;
      }
    }

    // For all other commands, ensure that the user has the trader role
    const hasTraderRole = (interaction.member as GuildMember).roles.cache.has(
      ENV.traderRoleId
    );

    if (!hasTraderRole) {
      interaction.reply({
        content: strings.noTraderRole,
        ephemeral: true,
      });
      return;
    }

    // Ensure that the command is only used in the proper channel.
    if (!localCommand.allowedChannels.includes(interaction.channelId)) {
      interaction.reply({
        content: richStrings.wrongChannel(localCommand.allowedChannels),
        ephemeral: true,
      });
      return;
    }

    let commandHandler;

    const subCommand = interaction.options.getSubcommand(false);
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
