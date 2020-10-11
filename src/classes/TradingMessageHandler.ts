import { Message, Client, TextChannel } from 'discord.js';
import helpers from '../helpers';
import UserManager from './UserManager';
import { TRADING_SIM_CHANNEL_ID } from '../bot';
import Messages from '../static/messages';
import { warnChannel } from '../stateful/ErrorReporter';
import IEXCloudApis, {
  GetPriceReturnType,
  ErrorType,
} from '../stateful/IEXCloudApis';
import OutgoingMessageHandler from '../stateful/OutgoingMessageHandler';

const {
  isCommand,
  isUserAdminOrMod,
  composeHelpCommand,
  composePriceCheckMessage,
} = helpers;

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
    const { content }: { content: string } = msg;
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
    } else if (isCommand(content, 'p', 'pricecheck', 'price')) {
      let ticker: string | string[] = content.split(' ');
      try {
        if (ticker.length !== 2) {
          warnChannel(Messages.invalidCommandSyntax('$p TSLA'));
          return;
        }
        ticker = ticker[1];
        if (ticker[0] === '$') ticker = ticker.substring(1, ticker.length);
        if (!ticker.match(/[A-z]/i)) {
          warnChannel(Messages.invalidStockTicker);
          return;
        }

        const priceReturn = await IEXCloudApis.getPrice(ticker);
        if (priceReturn.hasOwnProperty('error')) {
          warnChannel((<ErrorType>priceReturn).reason);
          return;
        }

        const { price, companyName, priceChange, percentChange } = <
          GetPriceReturnType
        >priceReturn;
        OutgoingMessageHandler.sendToTrading(
          composePriceCheckMessage(
            ticker,
            price,
            companyName,
            priceChange,
            percentChange
          )
        );
      } catch (err) {
        warnChannel(err);
      }
    }
  }
}

export default TradingMessageHandler;
