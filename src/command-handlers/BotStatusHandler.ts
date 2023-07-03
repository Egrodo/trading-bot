import {
  API,
  APIApplicationCommandInteraction,
  APIInteraction,
  Client,
  MessageFlags,
} from "@discordjs/core";

export const commands = [
  {
    name: "ping",
    description: "ERROR",
  },
];

class BotStatusHandler {
  public async onMessage(
    interaction: APIApplicationCommandInteraction,
    api: API,
  ): Promise<void> {
    switch (interaction.data.name) {
      case "ping":
      default:
        return this.ping(interaction, api);
    }
  }

  private ping(interaction: APIInteraction, api: API) {
    api.interactions.reply(interaction.id, interaction.token, {
      content: "Pong!",
      flags: MessageFlags.Ephemeral,
    });
  }
}

export default (new BotStatusHandler());
