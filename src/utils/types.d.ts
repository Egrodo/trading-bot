import { CommandInteraction } from 'discord.js';

declare interface CommandListType {
  [commandName: string]: {
    description: string;
    allowedChannel: string;
    handler: (interaction: CommandInteraction) => Promise<void>;
    options?: {
      name: string;
      description: string;
      type: 'string' | 'number' | 'boolean' | 'integer';
      required: boolean;
      maxLength?: number; // Enforced for `string` types
      minLength?: number; // Enforced for `string` types
    }[];
  };
}

export interface UserAccount {
  balance: number; // Total balance represented in cents
  currentHoldings: { [tickerKey: string]: StockHolding };
  tradeHistory: PastTrade[];
  signupTs: number;
}

/* Information about a single stock that a user owns */
export interface StockHolding {
  companyName?: string;
  amountOwned: number;
}

export interface PastTrade {
  ticker: string;
  timestamp: number;
  price: number;
  transactionType: 'buy' | 'sell';
  amountTraded: number;
}
