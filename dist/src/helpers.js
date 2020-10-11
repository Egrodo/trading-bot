"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const SERVER_ID = '482608530105434112';
exports.default = {
    rateLimiter: (delay, fn) => {
        const userMap = new Map();
        return (msg) => {
            if (msg.author.bot) {
                return;
            }
            if (userMap.has(msg.author.id)) {
                clearTimeout(userMap.get(msg.author.id));
            }
            userMap.set(msg.author.id, setTimeout(() => {
                fn(msg);
                userMap.delete(msg.author.id);
            }, delay));
        };
    },
    isCommand: (msgContent, ...commandTypes) => {
        const message = msgContent.trim();
        if (message.charAt(0) === '$') {
            const commandSubStr = message.split(/\s+/)[0];
            const command = commandSubStr
                .substring(1, message.length)
                .trim()
                .toLowerCase();
            return commandTypes.includes(command);
        }
    },
    formatAmountToReadable: (balance) => {
        if (balance < 0) {
            return `-$${Math.abs(balance / 100).toLocaleString()}`;
        }
        return `$${(balance / 100).toLocaleString()}`;
    },
    getUserFromMention: (client, mention) => {
        if (!mention)
            return;
        if (mention.startsWith('<@') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);
            if (mention.startsWith('!')) {
                mention = mention.slice(1);
            }
            return client.users.fetch(mention);
        }
        else if (!isNaN(Number(mention))) {
            return client.users.fetch(mention);
        }
        return null;
    },
    isUserAdminOrMod: (client, user) => __awaiter(void 0, void 0, void 0, function* () {
        const guild = yield client.guilds.fetch(SERVER_ID);
        const member = yield guild.members.fetch(user);
        return member.hasPermission('ADMINISTRATOR');
    }),
    composeHelpCommand: () => {
        const message = new discord_js_1.MessageEmbed();
        const commands = [
            {
                name: '$signup',
                value: 'Use this to create a new account if you do not already have one',
            },
            {
                name: '$deleteAccount',
                value: "Deletes your account. Careful though, you'll lose all your stocks and your balance won't change if you recreate your account in the future.",
            },
            {
                name: '$getCashBalance \\|| $balance |\\| $checkBalance',
                value: 'Retrieves the current cash balance in your account',
            },
            {
                name: '$help',
                value: 'Shows this menu!',
            },
            {
                name: '$priceCheck TICKER || $p TICKER',
                value: 'Checks the real-time price of a stock by ticker. Example: "$priceCheck TSLA" or "$p $FB".',
            },
        ];
        message
            .setTitle('Bearcat Trading Game Commands')
            .setDescription('Use these to interact with the Trading Bot and manage your portfolio')
            .setColor('#823CD6')
            .addFields({ name: '\u200B', value: '\u200B' }, ...commands, {
            name: '\u200B',
            value: '\u200B',
        })
            .setFooter('Anything missing or out of place? Message my creator, @egrodo#5991');
        return message;
    },
    composePriceCheckMessage: (ticker, price, companyName, priceChange, percentChange) => {
        const message = new discord_js_1.MessageEmbed();
        if (priceChange < 0) {
            message.setColor('#ff0033');
        }
        else if (priceChange > 0) {
            message.setColor('#00ce00');
        }
        else
            message.setColor('#823CD6');
        if (companyName)
            message.addField('Company:', companyName);
        if (!companyName && ticker)
            message.addField('Company:', ticker);
        if (price)
            message.addField('Price:', `$${price}`);
        if (priceChange)
            message.addField('Price Change Today:', `$${priceChange}`);
        if (percentChange)
            message.addField('Percent Change Today:', `${percentChange * 100}%`);
        return message;
    },
};
//# sourceMappingURL=helpers.js.map