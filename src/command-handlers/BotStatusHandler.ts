import {
  API,
  APIApplicationCommandInteraction,
  APIInteraction,
  Client,
  MessageFlags,
} from '@discordjs/core';
import { CommandInteraction, Interaction } from 'discord.js';

export const commands = [
  {
    name: 'ping',
    description: 'ERROR',
  },
];

class BotStatusHandler {
  public async onMessage(interaction: CommandInteraction): Promise<void> {
    switch (interaction.commandName) {
      case 'ping':
      default:
        return this.ping(interaction);
    }
  }

  private ping(interaction: CommandInteraction) {
    interaction.reply({ content: 'pong', ephemeral: true });
  }
}

export default new BotStatusHandler();
