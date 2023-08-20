import { CommandListType } from '../types';
import ENV from '../../env.json';
import { richStrings, strings } from '../static/strings';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
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
    portfolio: {
      description: 'Check the current stock holdings on your account',
      allowedChannel: ENV.tradingChannelId,
      handler: this.handlePortfolioCommand.bind(this),
    },
  };

  public async handleSignupCommand(interaction: CommandInteraction) {
    const user = interaction.user;
    const currentSeason = SeasonConfigManager.activeSeason;
    if (!currentSeason) {
      interaction.reply({
        content: strings.signupFailureNoSeason,
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
          content: `${strings.dupAccount} ${richStrings.checkBalance(
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
        content: richStrings.signupSuccess(STARTING_BALANCE),
        ephemeral: true,
      });
    } catch (err) {
      interaction.reply({ content: strings.signupFailure, ephemeral: true });
      return;
    }
  }

  public async handleBalanceCommand(interaction: CommandInteraction) {
    const user = interaction.user;
    const activeSeason = SeasonConfigManager.activeSeason;
    if (!activeSeason) {
      interaction.reply({
        content: strings.noActiveSeason,
        ephemeral: true,
      });
      return;
    }
    const account = await DatabaseManager.getAccount(
      user.id,
      activeSeason.name
    );
    if (!account) {
      interaction.reply({ content: strings.noAccount, ephemeral: true });
      return;
    }

    interaction.reply(richStrings.checkBalance(account.balance));
  }

  public async handlePortfolioCommand(interaction: CommandInteraction) {
    const user = interaction.user;
    const activeSeason = SeasonConfigManager.activeSeason;
    if (!activeSeason) {
      interaction.reply({
        content: strings.noActiveSeason,
        ephemeral: true,
      });
      return;
    }
    const account = await DatabaseManager.getAccount(
      user.id,
      activeSeason.name
    );
    if (!account) {
      interaction.reply({ content: strings.noAccount, ephemeral: true });
      return;
    }

    const currentHoldings = account.currentHoldings;

    const firstEmbed = new EmbedBuilder()
      .setTitle(`Portfolio for ${user.username}`)
      .setDescription(
        `Your current holdings for ${activeSeason.name} are as follows:`
      )
      .setColor('#663399');

    const allEmbeds = [firstEmbed];

    const holdingEntriesZeroesRemoved = Object.entries(currentHoldings).filter(
      ([, quantity]) => quantity > 0
    );

    // Do the first up to 25 holdings
    const firstLoopLength =
      holdingEntriesZeroesRemoved.length > 25
        ? 25
        : holdingEntriesZeroesRemoved.length;
    const firstEmbedFields = [];
    for (let i = 0; i < firstLoopLength; ++i) {
      const [ticker, quantity] = holdingEntriesZeroesRemoved[i];
      firstEmbedFields.push({
        name: ticker,
        value: quantity.toLocaleString(),
        inline: true,
      });
    }

    firstEmbed.addFields(firstEmbedFields);
    if (holdingEntriesZeroesRemoved.length > 25) {
      for (let i = 25; i < holdingEntriesZeroesRemoved.length; i += 25) {
        const embed = new EmbedBuilder()
          .setDescription(
            'a continued display of your stock holdings are below:'
          )
          .setColor('#663399')
          .setTimestamp();
        const fields = [];
        const loopLength =
          i + 25 > holdingEntriesZeroesRemoved.length
            ? holdingEntriesZeroesRemoved.length
            : i + 25;
        for (let j = i; j < loopLength; ++j) {
          const [ticker, quantity] = holdingEntriesZeroesRemoved[j];
          fields.push({
            name: ticker,
            value: quantity.toLocaleString(),
            inline: true,
          });
        }
        embed.addFields(fields);
        allEmbeds.push(embed);
      }
    }

    allEmbeds.at(-1).setTimestamp();

    interaction.reply({ embeds: allEmbeds });
  }
}

export default new UserAccountManager();
