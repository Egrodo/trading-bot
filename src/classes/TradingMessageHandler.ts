import { Message, Client, TextChannel } from 'discord.js';
import { isCommand } from '../helpers';
import UserManager from './UserManager';
import { TRADING_SIM_CHANNEL_ID } from '../bot';
import OutgoingMessageHandler from './OutgoingMessageHandler';
import Messages from '../static/messages';
const { signupSuccess, signupFailure } = Messages;

class TradingMessageHandler {
  _userManager: UserManager;
  _tradingChannel: TextChannel;
  constructor(client: Client) {
    this._userManager = new UserManager();
    client.channels
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
      isCommand(content, 'balancecheck')
    ) {
      await this._userManager.checkBalance(msg.author);
    }
  }
}

export default TradingMessageHandler;
