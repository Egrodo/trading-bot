"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const helpers_1 = require("../utils/helpers");
const env_json_1 = __importDefault(require("../../env.json"));
const ErrorReporter_1 = __importDefault(require("../utils/ErrorReporter"));
const PolygonApi_1 = __importDefault(require("../classes/PolygonApi"));
class TradingCommandHandler {
    constructor() {
        this.commands = {
            price: {
                description: 'Check the price of a stock',
                allowedChannel: env_json_1.default.tradingChannelId,
                options: [
                    {
                        name: 'ticker',
                        description: 'The ticker of the stock to check',
                        type: 'string',
                        required: true,
                        maxLength: 5,
                        minLength: 1,
                    },
                ],
            },
        };
    }
    init(client) {
        if (!client)
            throw new Error('Client is undefined');
        this._client = client;
        this.fetchTradingChannel();
    }
    async fetchTradingChannel() {
        const channel = await this._client.channels.cache.get(env_json_1.default.tradingChannelId);
        if (channel.type === discord_js_1.ChannelType.GuildText) {
            this._tradingChannel = channel;
        }
        else {
            ErrorReporter_1.default.reportErrorInDebugChannel('Trading channel is not a text channel');
        }
    }
    async onMessage(interaction) {
        const { commandName } = interaction;
        if (!this.commands[commandName].allowedChannel.includes(interaction.channelId)) {
            interaction.reply({
                content: `This command is only available in <#${this.commands[commandName].allowedChannel.toString()}>`,
                ephemeral: true,
            });
            return;
        }
        switch (commandName) {
            case 'price':
                return this.handlePriceCommand(interaction);
            default:
                interaction.reply('No command with that name found?');
        }
    }
    async handlePriceCommand(interaction) {
        const ticker = (interaction.options.get('ticker')?.value).toUpperCase();
        if (!ticker) {
            ErrorReporter_1.default.reportErrorInDebugChannel('Price command received with no ticker', interaction);
            return;
        }
        const quote = await PolygonApi_1.default.getPrevClosePriceData(ticker);
        if (quote.status !== 'OK') {
            ErrorReporter_1.default.reportErrorInDebugChannel(`Error fetching price data for ${ticker}`, interaction);
            interaction.reply({
                content: `Error fetching price data, try again in a few minutes.`,
                ephemeral: true,
            });
            return;
        }
        if (quote.resultsCount === 0) {
            interaction.reply({
                content: `No stock found with ticker ${ticker}.`,
                ephemeral: true,
            });
            return;
        }
        const prevClose = quote.results[0];
        const companyInfoReq = await PolygonApi_1.default.getTickerInfo(ticker);
        const { results: companyInfo } = companyInfoReq;
        const companyName = companyInfo.name ?? ticker;
        const logoUrl = `${companyInfo.branding.icon_url}?apiKey=${env_json_1.default.polygonKey}`;
        const logoAttachment = new discord_js_1.AttachmentBuilder(logoUrl, {
            name: `${ticker}-logo.png`,
        });
        const color = prevClose.c > prevClose.o ? '#00FF00' : '#FF0000';
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(color)
            .setTitle(companyName)
            .setURL(companyInfo.homepage_url)
            .setAuthor({
            name: env_json_1.default.botName,
            iconURL: env_json_1.default.botIconUrl,
        })
            .setThumbnail(`attachment://${logoAttachment.name}`)
            .setDescription(`Market close data from the last trading day`)
            .addFields([
            {
                name: 'Close price',
                value: `$${prevClose.c}`,
                inline: true,
            },
            {
                name: prevClose.c > prevClose.o ? 'Increase of' : 'Decrease of',
                value: `$${(prevClose.c - prevClose.o).toFixed(2)}`,
                inline: true,
            },
            {
                name: '\u200B',
                value: '\u200B',
                inline: true,
            },
            {
                name: 'Open price',
                value: `$${prevClose.o}`,
                inline: true,
            },
            {
                name: 'High price',
                value: `$${prevClose.h}`,
                inline: true,
            },
            {
                name: 'Low price',
                value: `$${prevClose.l}`,
                inline: true,
            },
            {
                name: 'Volume',
                value: `${prevClose.v.toLocaleString()} shares traded`,
            },
        ])
            .setTimestamp();
        interaction.reply({ embeds: [embed], files: [logoAttachment] });
    }
}
__decorate([
    (0, helpers_1.Guard)()
], TradingCommandHandler.prototype, "onMessage", null);
exports.default = new TradingCommandHandler();
//# sourceMappingURL=TradingCommandHandler.js.map