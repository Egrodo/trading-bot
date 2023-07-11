import { CommandListType, SeasonDocument } from '../utils/types';
import ENV from '../../env.json';
import { CommandInteraction } from 'discord.js';
import BaseCommentHandler from './BaseCommandHandler';
import DatabaseManager from '../classes/DatabaseManager';

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
class Season extends BaseCommentHandler {
  public commands: CommandListType = {
    season: {
      description: 'Get or set trading game seasons',
      allowedChannel: ENV.tradingChannelId,
      subCommands: {
        current: {
          description: 'Get information about the current season',
          allowedChannel: ENV.tradingChannelId,
          handler: this.handleCurrentSeasonCommand.bind(this),
        },
        add: {
          description: 'Add a new season to the queue',
          allowedChannel: ENV.tradingChannelId,
          handler: this.addNewSeason.bind(this),
          options: [
            {
              name: 'name',
              description: 'The name of the season',
              type: 'string',
              required: true,
            },
            {
              name: 'startdate',
              description: 'The date the season starts, in YYYY-MM-DD format',
              type: 'string',
              required: true,
            },
            {
              name: 'enddate',
              description: 'The date the season starts, in YYYY-MM-DD format',
              type: 'string',
              required: true,
            },
          ],
        },
      },
    },
  };

  public seasons: { [seasonName: string]: SeasonDocument } = {};

  public activeSeason?: SeasonDocument;

  public init(client) {
    super.init(client);
    this.fetchSeasonInfo();
  }

  private async fetchSeasonInfo(): Promise<void> {
    this.seasons = await DatabaseManager.getAllSeasons();
    if (Object.keys(this.seasons.length).length === 0) return;
    // TODO: Select which season is active based on the current date
    this.activeSeason = Object.values(this.seasons)[0];
  }

  public handleCurrentSeasonCommand(interaction: CommandInteraction) {
    if (this.activeSeason) {
      interaction.reply(
        `Currently in season ${
          this.activeSeason.name
        }. The season ends ${new Date(
          this.activeSeason.end
        ).toDateString()} and started ${new Date(
          this.activeSeason.start
        ).toDateString()}`
      );
    } else {
      interaction.reply('There is no active season');
    }
  }

  public async addNewSeason(interaction: CommandInteraction) {
    // TODO:
    console.log(interaction);
  }
}

export default new Season();
