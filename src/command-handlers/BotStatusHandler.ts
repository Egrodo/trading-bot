import { Client, CommandInteraction, Guild } from 'discord.js';
import ENV from '../../env.json';
import { registerCommands } from '../bot';
import { CommandListType } from '../types';
import ErrorReporter from '../utils/ErrorReporter';
import BaseCommentHandler from './BaseCommandHandler';

class BotStatusHandler extends BaseCommentHandler {
  private _guild: Guild;
  public commands: CommandListType = {
    ping: {
      description: 'Check if the bot is alive',
      allowedChannels: [ENV.debugInfoChannelId],
      handler: this.handlePingCommand.bind(this),
      adminsOnly: true,
    },
    reset: {
      description:
        'Re-register the bot commands with Discord. Only use when necessary',
      allowedChannels: [ENV.debugInfoChannelId],
      handler: this.handleReregisterCommandsCommand.bind(this),
      adminsOnly: true,
    },
  };

  public initWithGuild(client: Client, guild: Guild) {
    super.init(client);
    this._guild = guild;
  }

  private handlePingCommand(interaction: CommandInteraction) {
    interaction.reply({ content: 'pong', ephemeral: true });
  }

  private async handleReregisterCommandsCommand(
    interaction: CommandInteraction
  ) {
    console.log(`Resetting commands as per request...`);
    interaction.reply({ content: `Resetting commands...`, ephemeral: true });
    try {
      await this._client.application.commands.set([]);
      await this._guild.commands.set([]);
      console.log(`Successfully reset commands.`);
      interaction.editReply(`Successfully unregistered commands...`);
      const data = await registerCommands();
      interaction.editReply(
        `Successfully registered ${data.length ?? 0} application (/) commands.`
      );
      console.log(`Successfully registered ${data.length ?? 0} commands.`);
    } catch (err) {
      console.error(err);
      ErrorReporter.reportErrorInDebugChannel(
        `Failed to register application (/) commands.`,
        err
      );
      interaction.editReply(`Failed to register application (/) commands.`);
    }
  }
}

export default new BotStatusHandler();
