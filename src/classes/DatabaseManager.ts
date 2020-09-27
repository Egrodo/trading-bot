import { User } from 'discord.js';
import Nano, {
  ServerScope,
  DocumentScope,
  DocumentInsertResponse,
  DocumentGetResponse,
  DocumentViewResponse,
} from 'nano';
import { dbUser, dbPass } from '../../auth.json';
import OutgoingMessageHandler from './OutgoingMessageHandler';
import { warnChannel, errorReportToCreator } from './ErrorReporter';
import Messages from '../static/messages';
const { signupSuccess, signupFailure } = Messages;

const DB_URL = `http://${dbUser}:${dbPass}@174.138.58.238:5984`;

interface Trade {
  ticker: string;
  timestamp: Date;
  price: string;
  transactionType: 'buy' | 'sell';
  amountTraded: number;
}

interface UserDocument {
  _id: string;
  _rev?: string;
  balance: number; // Total balance represented in cents by a BigInt
  tradeHistory: Trade[];
}

class DatabaseManager {
  _dbConnection: ServerScope;
  _userDb: DocumentScope<any>;
  constructor() {
    this._dbConnection = Nano(DB_URL);
  }

  private async createUserDocument(user: User): Promise<DocumentInsertResponse> {
    const NewUser = {
      _id: user.id,
      balance: 1000 * 100, // $1000.00 represented in cents
      tradeHistory: [],
    };

    return this._userDb.insert(NewUser);
  }

  public connectToUsersDb() {
    this._userDb = this._dbConnection.use('users');
  }

  private async getExistingUser(user: User): Promise<DocumentGetResponse> {
    try {
      const userDoc = await this._userDb.get(user.id);
      console.log(userDoc);
      return userDoc;
    } catch (err) {
      warnChannel("Failed to get your account. I'll PM my creator to report this :(");
      errorReportToCreator('User getting failed? ', err, user);
    }
  }

  // TODO: Don't *actually* delete the user's account, just mark it deleted that way they can't abuse this to get infinite money.
  // TODO: Accurately report the starting balance in this case.
  // TODO: Move the strings to the messages file
  // TODO: Intro tutorial PM to them
  public async removeUserAccount(user: User): Promise<void> {
    if (!this._userDb) this.connectToUsersDb();

    let userDoc: DocumentGetResponse;
    try {
      userDoc = await this._userDb.get(user.id);
    } catch (err) {
      if (err.reason === 'deleted') {
        warnChannel(`You do not have an account with us. Create one with "!signup".`);
        return;
      } else {
        warnChannel("Failed to delete account.  I'll PM my creator to report this :(");
        errorReportToCreator('User document creation failed? ', err, user);
        return;
      }
    }

    // TODO: Don't do this.
    const result = await this._userDb.destroy(user.id, userDoc._rev);
    if (result.ok) {
      OutgoingMessageHandler.sendToTrading(
        `Successfully deleted your account. If you'd like to recreate it at any point use the "!signup" command.`,
      );
    } else {
      warnChannel("Failed to delete account.  I'll PM my creator to report this :(");
      errorReportToCreator('User document creation failed? ', result, user);
    }
  }

  public async createNewUser(user: User): Promise<void> {
    if (!this._userDb) this.connectToUsersDb();
    let result: DocumentInsertResponse;
    try {
      result = await this.createUserDocument(user);
    } catch (err) {
      if (err.reason === 'Document update conflict.') {
        warnChannel(`You already have an account.`);
      } else {
        warnChannel("Failed to create account.  I'll PM my creator to report this :(");
        errorReportToCreator('User document creation failed? ', err, user);
      }
      return;
    }

    if (result.ok === true) {
      OutgoingMessageHandler.sendToTrading(signupSuccess);
    } else {
      warnChannel(signupFailure);
      errorReportToCreator('User document creation failed? ', result, user);
      console.error(result);
    }
  }
}

export default DatabaseManager;
