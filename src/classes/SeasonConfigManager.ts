import { CommandListType } from '../utils/types';
import ENV from '../../env.json';
import { CommandInteraction } from 'discord.js';

/**
 * Handles configuration of the current season that is in play. Will include commands
 * for admins to configure the length, starting balance, rules, etc, of the seasons.
 *
 * Admins can queue up a new season to start when the current season ends, and determine
 * what rewards (or punishments) are given to the winners of the season.
 *
 * This information needs to be stored in the database so it can persist, keyed on the
 * guild id.
 */
class Season {
  public commands: CommandListType = {
    currentSeason: {
      description: 'Get information about the current season',
      allowedChannel: ENV.tradingChannelId,
      handler: this.handleCurrentSeasonCommand.bind(this),
    },
  };
  public seasonName: 'season1';
  public seasonStart: Date;
  public seasonEnd: Date;

  handleCurrentSeasonCommand(interaction: CommandInteraction) {
    interaction.reply(
      `Currently in season ${
        this.seasonName
      }. The season ends ${this.seasonEnd.toDateString()}`
    );
  }
}

export default new Season();
