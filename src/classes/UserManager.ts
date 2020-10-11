import { Message, User, Client } from 'discord.js';

import helpers from '../helpers';
const { getUserFromMention } = helpers;
import DatabaseManager from './DatabaseManager';
import OutgoingMessageHandler from '../stateful/OutgoingMessageHandler';
import { warnChannel } from '../stateful/ErrorReporter';

import Messages from '../static/messages';

// This class handles all operations relating directly to the modification of user accounts.
class UserManager {
  _db?: DatabaseManager;
  _client: Client;
  constructor(client: Client) {
    this._db = new DatabaseManager();
    this._client = client;
  }

  public async deleteUserAccount(user: User): Promise<void> {
    // TODO: Confirm this with the user.
    await this._db.removeUserAccount(user);
  }

  public async signupNewUser(msg: Message): Promise<void> {
    await this._db.createNewUser(msg.author);
  }

  public async checkBalance(user: User): Promise<void> {
    const balance = await this._db.getBalance(user);
    if (balance != null) {
      OutgoingMessageHandler.sendToTrading(Messages.checkBalance(balance));
    }
  }

  // ADMIN ONLY COMMAND -- Grants free money to anyone of our choosing!
  public async grantMoney(msg: Message): Promise<void> {
    const splitMsg = msg.content.split(/\s+/);
    if (splitMsg.length < 3) {
      warnChannel(
        Messages.invalidCommandSyntax('!grantMoney @userMention $69.42')
      );
      return;
    }

    let toUser;
    try {
      toUser = await getUserFromMention(this._client, splitMsg[1]);
    } catch (err) {
      warnChannel(
        Messages.invalidCommandSyntax('!grantMoney @userMention $69.42')
      );
      return;
    }

    // Parse string for total cents requested
    let dollarAmount = splitMsg[2];
    let centAmount;
    if (dollarAmount.includes('.')) {
      const decimalSplit = dollarAmount.split('.');
      if (decimalSplit.length > 2) {
        warnChannel(
          Messages.invalidCommandSyntax('!sendMoney @userMention $69.42')
        );
        return;
      }

      centAmount = decimalSplit[1];

      if (centAmount.length === 1) centAmount += '0';
      if (centAmount.length > 2) {
        warnChannel(
          Messages.invalidCommandSyntax('!sendMoney @userMention $69.42')
        );
        return;
      }

      dollarAmount = decimalSplit[0];
    } else centAmount = '0';

    if (dollarAmount[0] === '$' || dollarAmount[1] === '$') {
      dollarAmount = dollarAmount.replace(/\$+/, '');
    }

    let totalAmount: number;
    if (dollarAmount[0] === '-') {
      totalAmount = Number(dollarAmount) * 100 - Number(centAmount);
    } else {
      totalAmount = Number(dollarAmount) * 100 + Number(centAmount);
    }

    if (isNaN(totalAmount)) {
      warnChannel(
        Messages.invalidCommandSyntax('!sendMoney @userMention $69.42')
      );
      return;
    }

    try {
      this._db.grantFunds(toUser, totalAmount);
    } catch (err) {
      warnChannel(err);
    }
  }
}

export default UserManager;
