import { Message, Client, TextChannel } from 'discord.js';
import { isCommand, isUserAdminOrMod } from '../helpers';
import UserManager from './UserManager';
import { TRADING_SIM_CHANNEL_ID } from '../bot';
import Messages from '../static/messages';
import { warnChannel } from './ErrorReporter';

class TradingMessageHandler {
  _client: Client;
  _userManager: UserManager;
  _tradingChannel: TextChannel;
  constructor(client: Client) {
    this._userManager = new UserManager(client);
    this._client = client;
    this._client.channels
      .fetch(TRADING_SIM_CHANNEL_ID)
      // @ts-ignore
      .then((channel) => ((this._tradingChannel as TextChannel) = channel));
  }

  public async onMessage(msg: Message): Promise<void> {
    const { content } = msg;
    if (isCommand(content, 'signup')) {
      await this._userManager.signupNewUser(msg);
    } else if (isCommand(content, 'deleteaccount')) {
      await this._userManager.deleteUserAccount(msg.author);
    } else if (
      isCommand(content, 'checkbalance') ||
      isCommand(content, 'balance') ||
      isCommand(content, 'balancecheck') ||
      isCommand(content, 'getbalance')
    ) {
      await this._userManager.checkBalance(msg.author);
    } else if (
      isCommand(content, 'sendmoney') ||
      isCommand(content, 'grantmoney') ||
      isCommand(content, 'award') ||
      isCommand(content, 'changebalance')
    ) {
      const isAdmin = await isUserAdminOrMod(this._client, msg.author);
      console.log(isAdmin);
      if (isAdmin) {
        await this._userManager.grantMoney(msg);
      } else {
        warnChannel(Messages.noPermission);
      }
    }
  }
}

export default TradingMessageHandler;
