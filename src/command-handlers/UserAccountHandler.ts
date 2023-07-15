import { CommandListType } from '../types/types';
import ENV from '../../env.json';
import messages from '../static/messages';
import { CommandInteraction } from 'discord.js';
import DatabaseManager from '../classes/DatabaseManager';
import BaseCommentHandler from './BaseCommandHandler';
import SeasonConfigManager from './SeasonConfigManager';

const STARTING_BALANCE = 1000.0; // $1,000 TODO: This will be different per season in future

/* Handles operations to user account information */
class UserAccountManager extends BaseCommentHandler {
  public commands: CommandListType = {
    signup: {
      description: "Sign up for the current season's trading competition",
      allowedChannel: ENV.tradingChannelId,
      handler: this.handleSignupCommand.bind(this),
    },
    balance: {
      description: 'Check how much you have in cash',
      allowedChannel: ENV.tradingChannelId,
      handler: this.handleBalanceCommand.bind(this),
    },
  };

  public async handleSignupCommand(interaction: CommandInteraction) {
    const user = interaction.user;
    const currentSeason = SeasonConfigManager.activeSeason;
    if (!currentSeason) {
      interaction.reply({
        content: messages.signupFailureNoSeason,
        ephemeral: true,
      });
      return;
    }
    const seasonName = currentSeason.name;
    try {
      const existingUser = await DatabaseManager.getAccount(
        user.id,
        seasonName
      );

      if (existingUser) {
        interaction.reply({
          content: `${messages.dupAccount} ${messages.checkBalance(
            existingUser.balance
          )}`,
          ephemeral: true,
        });
        return;
      }

      await DatabaseManager.registerAccount(
        user.id,
        STARTING_BALANCE,
        seasonName
      );
      interaction.reply({
        content: messages.signupSuccess(STARTING_BALANCE),
        ephemeral: true,
      });
    } catch (err) {
      interaction.reply({ content: messages.signupFailure, ephemeral: true });
      return;
    }
  }

  public async handleBalanceCommand(interaction: CommandInteraction) {
    const user = interaction.user;
    const activeSeason = SeasonConfigManager.activeSeason;
    if (!activeSeason) {
      interaction.reply({
        content: messages.noActiveSeason,
        ephemeral: true,
      });
      return;
    }
    const account = await DatabaseManager.getAccount(
      user.id,
      activeSeason.name
    );
    if (!account) {
      interaction.reply({ content: messages.noAccount, ephemeral: true });
      return;
    }

    interaction.reply(messages.checkBalance(account.balance));
  }
}

export default new UserAccountManager();
