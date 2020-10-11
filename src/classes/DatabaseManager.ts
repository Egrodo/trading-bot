import { User, MessageEmbed } from 'discord.js';
import Nano, {
  ServerScope,
  DocumentScope,
  DocumentInsertResponse,
  DocumentGetResponse,
} from 'nano';
import { dbUser, dbPass } from '../../auth.json';
import OutgoingMessageHandler from '../stateful/OutgoingMessageHandler';
import { warnChannel, errorReportToCreator } from '../stateful/ErrorReporter';
import helpers from '../helpers';
const { formatAmountToReadable } = helpers;
import Messages from '../static/messages';

const DB_URL = `http://${dbUser}:${dbPass}@174.138.58.238:5984`;

// Don't include a price attribute because it will fluctuate
interface StockHolding {
  ticker: string;
  buyTimestamp: Date;
  amountOwned: number;
}

interface PastTrade {
  ticker: string;
  timestamp: Date;
  price: string;
  transactionType: 'buy' | 'sell';
  amountTraded: number;
}

interface UserDocument {
  _id: string;
  _rev?: string;
  balance: number; // Total balance represented in cents
  tradeHistory: PastTrade[];
  currentHoldings: StockHolding[];
  deleted: boolean;
}

interface UserDocReturnType {
  error?: string;
  userDoc?: UserDocument & DocumentGetResponse;
}

class DatabaseManager {
  _dbConnection: ServerScope;
  _userDb: DocumentScope<any>;
  constructor() {
    this._dbConnection = Nano(DB_URL);
  }

  private connectToUsersDb() {
    this._userDb = this._dbConnection.use('users');
  }

  private async getUserDocument(user: User): Promise<UserDocReturnType> {
    if (!this._userDb) this.connectToUsersDb();

    const response: UserDocReturnType = {};
    try {
      response.userDoc = await this._userDb.get(user.id);
    } catch (err) {
      response.error = err.reason;
    }
    return response;
  }

  public async removeUserAccount(user: User): Promise<void> {
    const userDocResult = await this.getUserDocument(user);

    if (
      userDocResult?.userDoc.deleted === true ||
      userDocResult?.error === 'deleted'
    ) {
      warnChannel(Messages.noAccount);
      return;
    } else if (userDocResult?.error === 'failed') {
      warnChannel(Messages.failedToDelete);
      errorReportToCreator(
        'User document creation failed? ',
        userDocResult.error,
        user
      );
      return;
    }

    const updatedUser = {
      ...userDocResult.userDoc,
      currentHoldings: [],
      deleted: true,
    };

    // Insert at the revision with the modified property to indicate that the account is "deleted".
    const result = await this._userDb.insert(updatedUser);
    if (result.ok) {
      OutgoingMessageHandler.sendToTrading(Messages.deleteSuccess);
    } else {
      warnChannel(Messages.failedToDelete);
      errorReportToCreator('User document update failed? ', result, user);
    }
  }

  public async createNewUser(user: User): Promise<void> {
    const userDocResult = await this.getUserDocument(user);

    if (userDocResult?.error === 'failed') {
      warnChannel(Messages.failedToDelete);
      errorReportToCreator(
        'User document creation failed? ',
        userDocResult,
        user
      );
      return;
    }

    if (!userDocResult.userDoc) {
      try {
        const NewUser: UserDocument = {
          _id: user.id,
          balance: 10000 * 100, // $1000.00 represented in cents
          tradeHistory: [],
          currentHoldings: [],
          deleted: false,
        };

        const result = await this._userDb.insert(NewUser);
        if (result.ok === true) {
          OutgoingMessageHandler.sendToTrading(Messages.signupSuccess);
        } else {
          warnChannel(Messages.signupFailure);
          errorReportToCreator('User document creation failed? ', result, user);
        }
      } catch (err) {
        warnChannel(Messages.failedToDelete);
        errorReportToCreator('User document creation failed? ', err, user);
        return;
      }
    } else if (userDocResult.userDoc.deleted === true) {
      // Perhaps their account exists but is "deleted". Update that.
      // Re-create it
      const updatedUser = {
        ...userDocResult.userDoc,
        deleted: false,
      };
      const result = await this._userDb.insert(updatedUser);
      if (result.ok === true) {
        OutgoingMessageHandler.sendToTrading(
          Messages.signupAgainSuccess(
            formatAmountToReadable(userDocResult.userDoc.balance)
          )
        );
      } else {
        warnChannel(Messages.signupFailure);
        errorReportToCreator('User document update failed? ', result, user);
      }
    } else if (userDocResult.userDoc) {
      // They trippin'
      warnChannel(`You already have an account.`);
      return;
    }
  }

  public async getBalance(user: User): Promise<string> {
    const userDocResult = await this.getUserDocument(user);
    if (
      userDocResult?.userDoc.deleted === true ||
      userDocResult?.error === 'deleted'
    ) {
      warnChannel(Messages.noAccount);
    } else if (userDocResult?.error === 'missing') {
      warnChannel(Messages.noAccount);
    } else if (userDocResult?.error === 'failed') {
      warnChannel(Messages.failedToGetAccount);
    } else if (userDocResult.userDoc) {
      return formatAmountToReadable(userDocResult.userDoc.balance);
    } else {
      warnChannel(Messages.failedToGetAccount);
      errorReportToCreator(
        'UserDocResult returned unrecognized data?',
        userDocResult
      );
    }
  }

  // ADMIN ONLY -- Magically makes money appear in the users account.
  public async grantFunds(toUser: User, grantAmount: number) {
    // Get toUser doc
    let userDocResult: UserDocReturnType;
    try {
      userDocResult = await this.getUserDocument(toUser);
    } catch (err) {
      console.log('ERROR');
      console.log(err);
      return;
    }

    if (userDocResult?.error) {
      if (userDocResult?.error === 'missing') {
        warnChannel(Messages.noAccountForUser(toUser.username));
        return;
      } else {
        warnChannel(Messages.failedToGetAccount);
        errorReportToCreator(
          'UserDocResult returned unrecognized data?',
          userDocResult
        );
        return;
      }
    }

    const toUserDoc = userDocResult.userDoc;

    const existingBalance = toUserDoc.balance;
    const updatedUserDoc = {
      ...toUserDoc,
      balance: existingBalance + grantAmount,
    };

    const result = await this._userDb.insert(updatedUserDoc);
    if (result.ok === true) {
      OutgoingMessageHandler.sendToTrading(
        Messages.moneyGranted(
          toUser,
          formatAmountToReadable(grantAmount),
          formatAmountToReadable(updatedUserDoc.balance)
        )
      );
    } else {
      warnChannel(Messages.signupFailure);
      errorReportToCreator('User document update failed? ', result, toUserDoc);
    }
  }
}

export default DatabaseManager;
