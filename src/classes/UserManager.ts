import { Message, User } from 'discord.js';

import DatabaseManager from './DatabaseManager';
import OutgoingMessageHandler from './OutgoingMessageHandler';

import Messages from '../static/messages';

// This class will handle getting and setting user information
// - signups
// - balance checks
// - balance transfers?
class UserManager {
  _db?: DatabaseManager;
  constructor() {
    this._db = new DatabaseManager();
  }

  public async deleteUserAccount(user: User): Promise<void> {
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
}

export default UserManager;
