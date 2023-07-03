import * as ENV from "../../env.json";
import { ChannelType, Client, EmbedBuilder, TextChannel } from "discord.js";
import { Guard } from "./helpers";

class ErrorReporter {
  _client: Client;
  _debugInfoChannel: TextChannel;
  init(client: Client) {
    if (!client) throw new Error("Client is undefined");
    this._client = client;
    this.fetchDebugChannel();
  }

  private async fetchDebugChannel() {
    const channel = await this._client.channels.cache.get(
      ENV.debugInfoChannelId,
    );
    if (channel.type === ChannelType.GuildText) {
      this._debugInfoChannel = channel;
    }
  }

  @Guard()
  // Reports an error to designated channel
  public async reportToCreator(msg: string, ...errorInformation: any) {
    console.error(`ERROR REPORTED TO CREATOR WITH MSG: ${msg}}`);
    console.error(errorInformation);

    const errorMsg = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("Trading Bot Error Report")
      .setDescription(msg);

    this._debugInfoChannel.send({ embeds: [errorMsg] });
  }
}

export default new ErrorReporter();
