import {
  APIApplicationCommandInteraction,
  Client,
  MessageFlags,
} from "discord.js";
import { Guard } from "../utils/helpers";
import { API } from "@discordjs/core";

export const commands = [
  {
    name: "price",
    description: "Check the price of a stock",
  },
];

class TradingCommandHandler {
  private _client: Client;
  //   _userManager: UserManager;
  //   _tradingChannel: TextChannel;
  init(client: Client) {
    if (!client) throw new Error("Client is undefined");
    this._client = client;
  }

  @Guard()
  public async onMessage(
    interaction: APIApplicationCommandInteraction,
    api: API,
  ): Promise<void> {
    // todo;
    api.interactions.reply(interaction.id, interaction.token, {
      content: "I have not made this yet!",
      flags: MessageFlags.Ephemeral,
    });
  }
}

export default (new TradingCommandHandler());
