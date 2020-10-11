import { Message, Client, TextChannel } from 'discord.js';
import helpers from '../helpers';
import UserManager from './UserManager';
import { TRADING_SIM_CHANNEL_ID } from '../bot';
import Messages from '../static/messages';
import { warnChannel } from './ErrorReporter';
import OutgoingMessageHandler from './OutgoingMessageHandler';

const { isCommand, isUserAdminOrMod, composeHelpCommand } = helpers;

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
      isCommand(
        content,
        'getcashbalance',
        'checkbalance',
        'balance',
        'balancecheck',
        'getbalance'
      )
    ) {
      await this._userManager.checkBalance(msg.author);
    } else if (
      isCommand(content, 'sendmoney', 'grantmoney', 'award', 'changebalance')
    ) {
      const isAdmin = await isUserAdminOrMod(this._client, msg.author);
      if (isAdmin) {
        await this._userManager.grantMoney(msg);
      } else {
        warnChannel(Messages.noPermission);
      }
    } else if (isCommand(content, 'help', 'commands', 'manual')) {
      OutgoingMessageHandler.sendToTrading(composeHelpCommand());
    }
  }
}

export default TradingMessageHandler;
