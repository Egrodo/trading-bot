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
  parseTickerFromMsg,
  formatAmountToReadable,
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
        'cb',
        'getbalance'
      )
    ) {
      const balance = await this._userManager.getBalance(msg.author);
      if (balance != null) {
        OutgoingMessageHandler.sendToTrading(
          Messages.checkBalance(formatAmountToReadable(balance), msg.author)
        );
      }
    } else if (
      isCommand(content, 'sendmoney', 'grantmoney', 'award', 'grant')
    ) {
      // TODO: Move the command logic to here from user manager.
      const isAdmin = await isUserAdminOrMod(this._client, msg.author);
      if (isAdmin) {
        await this._userManager.grantMoney(msg);
      } else {
        warnChannel(Messages.noPermission);
      }
    } else if (isCommand(content, 'help', 'commands', 'manual')) {
      OutgoingMessageHandler.sendToTrading(composeHelpCommand());
    } else if (isCommand(content, 'p', 'pricecheck', 'price')) {
      const ticker = parseTickerFromMsg(content);
      if (!ticker) {
        warnChannel(Messages.invalidCommandSyntax('$p TSLA'));
        return;
      }
      try {
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
    } else if (isCommand(content, 'buy')) {
      const ticker = parseTickerFromMsg(content);
      const desiredStockUnits = Number(content.split(' ')[2]);
      if (!ticker || Number.isNaN(desiredStockUnits)) {
        warnChannel(Messages.invalidCommandSyntax('$buy AMD 100'));
        return;
      }

      const priceReturn = await IEXCloudApis.getPrice(ticker);
      if (priceReturn.hasOwnProperty('error')) {
        warnChannel((<ErrorType>priceReturn).reason);
        return;
      }

      const { price } = <GetPriceReturnType>priceReturn;

      const requiredAmount = desiredStockUnits * price;
      const usersBalance = await this._userManager.getBalance(msg.author);

      if (usersBalance < requiredAmount) {
        OutgoingMessageHandler.sendToTrading(
          Messages.notEnoughMoneyForBuy(
            formatAmountToReadable(usersBalance),
            ticker.toUpperCase(),
            formatAmountToReadable(price),
            formatAmountToReadable(requiredAmount)
          )
        );
        return;
      }

      // Remove the amount from the users balance
      const newBalance = await this._userManager.decreaseBalance(
        msg.author,
        requiredAmount
      );

      console.log(newBalance);
      // TODO: Upon successful completion of aforementioned, add stocks to users account.

      console.log(`Buying ${ticker} ${desiredStockUnits}`);
    }

    // TODO: Add command to get total value of users account.
  }
}

export default TradingMessageHandler;
