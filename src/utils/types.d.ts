import { CommandInteraction } from 'discord.js';

export interface IAggsResults {
  T?: string;
  c?: number;
  h?: number;
  l?: number;
  n?: number;
  o?: number;
  t?: number;
  v?: number;
  vw?: number;
}

export interface CommandType {
  description: string;
  allowedChannel: string;
  handler?: (interaction: CommandInteraction) => Promise<void>; // undefined if subcommands are present
}

export interface CommandWithOptionsType extends CommandType {
  options: {
    name: string;
    description: string; // 100 character max length
    type: 'string' | 'number' | 'boolean' | 'integer';
    required: boolean;
    maxLength?: number; // Enforced for `string` types
    minLength?: number; // Enforced for `string` types
  }[];
}

export type SubcommandType = Omit<CommandType, 'allowedChannel'>;

export type SubcommandWithOptionsType = Omit<
  CommandWithOptionsType,
  'allowedChannel'
>;

export interface CommandWithSubCommandsType extends CommandType {
  subCommands: {
    // Subcommands use the same allowedChannel as their parent command
    [commandName: string]: SubcommandType | SubcommandWithOptionsType;
  };
}

export interface CommandListType {
  [commandName: string]:
    | CommandType
    | CommandWithOptionsType
    | CommandWithSubCommandsType;
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

export interface SeasonDocument {
  name: string;
  start: number;
  end: number;
}
