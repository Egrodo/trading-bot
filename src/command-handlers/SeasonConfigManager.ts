import { CommandListType, SeasonDocument } from '../utils/types';
import ENV from '../../env.json';
import { CommandInteraction } from 'discord.js';
import BaseCommentHandler from './BaseCommandHandler';
import DatabaseManager from '../classes/DatabaseManager';
import ErrorReporter from '../utils/ErrorReporter';
import cron from 'node-cron';

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
      allowedChannel: ENV.debugInfoChannelId,
      subCommands: {
        current: {
          description: 'Get information about the current season',
          handler: this.handleCurrentSeasonCommand.bind(this),
        },
        add: {
          description: 'Add a new season to the queue',
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
              description:
                'The date the season starts in a valid format like MM/DD/YYYY. At least one day in the future.',
              type: 'string',
              required: true,
            },
            {
              name: 'enddate',
              description:
                'The date the season ends in a valid format like MM/DD/YYYY. At least one day later than startdate',
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

    cron.schedule('0 0 0 * * *', () => {
      console.log('Updating seasons if necessary');
      this.fetchSeasonInfo();
    });
  }

  private async fetchSeasonInfo(): Promise<void> {
    console.log('Fetching season info...');
    const allSeasons = await DatabaseManager.getAllSeasons();
    if (allSeasons.length === 0) return;
    this.seasons = allSeasons.reduce((acc, season) => {
      acc[season.name] = season;
      return acc;
    }, {});
    console.log(`Found ${Object.keys(this.seasons).length} seasons.`);

    // Select which season is active based on the current date
    const now = new Date().getTime();
    const activeSeason = allSeasons.find(
      (season) => season.start < now && season.end > now
    );
    if (activeSeason) {
      this.activeSeason = activeSeason;
      // TODO: This might also need to trigger some other things,
      // like announcement messages in the server
      console.log(`Active season is "${this.activeSeason.name}"`);
    } else {
      console.log(`There is currently no active season.`);
    }
  }

  public handleCurrentSeasonCommand(interaction: CommandInteraction) {
    if (this.activeSeason) {
      interaction.reply(
        `Currently in season "${
          this.activeSeason.name
        }". The season ends ${new Date(
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
    const name = interaction.options.get('name')?.value as string;
    const startDateStr = interaction.options.get('startdate')?.value as string;
    const endDateStr = interaction.options.get('enddate')?.value as string;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (
      startDate.toString() === 'Invalid Date' ||
      endDate.toString() === 'Invalid Date'
    ) {
      interaction.reply({
        content:
          'Invalid date format. Please use a valid date format like YYYY-MM-DD',
        ephemeral: true,
      });
      return;
    }

    // Start date must be at least 1 day in the future
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    if (startDate < tomorrow) {
      interaction.reply({
        content: `Your start date must be in the future, you passed in "${startDate.toDateString()}".`,
        ephemeral: true,
      });
      return;
    }

    // Start date must be before end date
    if (startDate > endDate) {
      interaction.reply({
        content: `Your start date must be before your end date, you passed in "${startDate.toDateString()}" and "${endDate.toDateString()}".`,
        ephemeral: true,
      });
      return;
    }

    // Make sure that this season doesn't overlap with an existing one
    for (const season of Object.values(this.seasons)) {
      if (
        (startDate.getTime() >= season.start &&
          startDate.getTime() <= season.end) ||
        (endDate.getTime() >= season.start && endDate.getTime() <= season.end)
      ) {
        interaction.reply({
          content: `Your season overlaps with an existing season, ${
            season.name
          } which runs from ${new Date(
            season.start
          ).toDateString()} to ${new Date(season.end).toDateString()}`,
          ephemeral: true,
        });
        return;
      }
    }

    try {
      await DatabaseManager.addSeason(name, startDate, endDate);
    } catch (err) {
      interaction.reply({
        content: `There was a database error adding your season. Please try again later.`,
        ephemeral: true,
      });
      ErrorReporter.reportErrorInDebugChannel(
        `Error adding season to the database`,
        err
      );
      return;
    }
    interaction.reply(
      `Successfully added season ${name} from ${startDate.toDateString()} to ${endDate.toDateString()}`
    );

    // Then update the seasons in memory
    await this.fetchSeasonInfo();
  }
}

export default new Season();
