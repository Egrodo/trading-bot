import { Client, CommandInteraction, Guild } from 'discord.js';
import ENV from '../../env.json';
import { registerCommands } from '../bot';
import { CommandListType } from '../utils/types';
import { Guard } from '../utils/helpers';
import ErrorReporter from '../utils/ErrorReporter';

class BotStatusHandler {
  private _client: Client;
  private _guild: Guild;
  public commands: CommandListType = {
    ping: {
      description: 'Check if the bot is alive',
      allowedChannel: ENV.debugInfoChannelId,
      handler: this.ping.bind(this),
    },
    // TODO: Reset root cmd with `commands` as subcommand
    reset: {
      description:
        'Re-register the bot commands with Discord. Only use when necessary',
      allowedChannel: ENV.debugInfoChannelId,
      handler: this.reregisterCommands.bind(this),
    },
  };

  init(client: Client, guild: Guild) {
    if (!client) throw new Error('Client is undefined');
    if (!guild) throw new Error('Guild is undefined');
    this._client = client;
    this._guild = guild;
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

  private ping(interaction: CommandInteraction) {
    interaction.reply({ content: 'pong', ephemeral: true });
  }

  private async reregisterCommands(interaction: CommandInteraction) {
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
