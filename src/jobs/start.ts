import { Client } from 'discord.js';
import GameAdminHandler from '../command-handlers/GameAdminHandler';
import { leaderboardJob } from './leaderboard';
import Cron from 'croner';

function cronWrapper(
  when: string,
  handler: (client: Client, nextRun: Date) => void,
  client: Client,
  name: string
): Cron {
  const job = Cron(
    when,
    () => {
      const nextRun = job.nextRun();
      console.log(
        `Running cron job "${name}" at ${job
          .currentRun()
          .toLocaleDateString()}. My next run is at ${nextRun.toLocaleDateString()}}`
      );
      handler(client, nextRun);
    },
    {
      name,
      timezone: 'America/New_York',
    }
  );

  return job;
}

/* Handles starting cron jobs for regular events. All jobs are in NYC timezone */
export function startJobs(client: Client) {
  // Check every day at midnight to see if the season has changed
  const seasonChangeJob = cronWrapper(
    '0 0 0 * * *',
    GameAdminHandler.checkForSeasonChanges,
    client,
    'Season Change Check'
  );

  // Every day at noon NYC time post the leaderboard
  const postLeaderboard = cronWrapper(
    '0 12 * * *',
    leaderboardJob,
    client,
    'Leaderboard Posting'
  );

  leaderboardJob(client);

  const jobs = [seasonChangeJob, postLeaderboard];

  return jobs;
}
