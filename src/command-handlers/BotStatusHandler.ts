import { CommandInteraction } from 'discord.js';
import ENV from '../../env.json';

class BotStatusHandler {
  public commands: CommandListType = {
    ping: {
      description: 'Check if the bot is alive',
      allowedChannel: ENV.debugInfoChannelId,
    },
  };

  public async onMessage(interaction: CommandInteraction): Promise<void> {
    switch (interaction.commandName) {
      case 'ping':
      default:
        return this.ping(interaction);
    }
  }

  private ping(interaction: CommandInteraction) {
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

    interaction.reply({ content: 'pong', ephemeral: true });
  }
}

export default new BotStatusHandler();
