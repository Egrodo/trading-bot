import * as ENV from '../../env.json';
import {
  ChannelType,
  Client,
  EmbedBuilder,
  TextChannel,
  User,
} from 'discord.js';
import { GuardClientExists } from './helpers';

class ErrorReporter {
  _client: Client;
  _debugChannel: TextChannel;
  _creator: User;
  init(client: Client) {
    if (!client) throw new Error('Client is undefined');
    this._client = client;
    this.fetchDebugChannel();
    this.fetchCreator();
  }

  private async fetchDebugChannel() {
    const channel = await this._client.channels.cache.get(
      ENV.debugInfoChannelId
    );
    if (channel.type === ChannelType.GuildText) {
      this._debugChannel = channel;
    }
  }

  private async fetchCreator() {
    const creator = await this._client.users.fetch(ENV.creatorId);
    if (creator) {
      this._creator = creator;
    }
  }

  // Reports an error to designated channel
  @GuardClientExists()
  public async reportErrorInDebugChannel(
    msg: string,
    ...errorInformation: any
  ) {
    console.error(`ERROR REPORTED TO CREATOR WITH MSG: ${msg}}`);
    console.error(errorInformation);

    const errorMsg = new EmbedBuilder()
      .setAuthor({
        name: ENV.botName,
        iconURL: ENV.botIconUrl,
      })
      .setColor('#ff0000')
      .setTitle('Trading Bot Error Report')
      .setDescription(msg);

    this._debugChannel.send(this._creator.toString());
    this._debugChannel.send({ embeds: [errorMsg] });
  }
}

export default new ErrorReporter();
