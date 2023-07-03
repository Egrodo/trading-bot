"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ENV = __importStar(require("../../env.json"));
const discord_js_1 = require("discord.js");
const helpers_1 = require("./helpers");
class ErrorReporter {
    init(client) {
        if (!client)
            throw new Error("Client is undefined");
        this._client = client;
        this.fetchDebugChannel();
    }
    async fetchDebugChannel() {
        const channel = await this._client.channels.cache.get(ENV.debugInfoChannelId);
        if (channel.type === discord_js_1.ChannelType.GuildText) {
            this._debugInfoChannel = channel;
        }
    }
    async reportToCreator(msg, ...errorInformation) {
        console.error(`ERROR REPORTED TO CREATOR WITH MSG: ${msg}}`);
        console.error(errorInformation);
        const errorMsg = new discord_js_1.EmbedBuilder()
            .setColor("#ff0000")
            .setTitle("Trading Bot Error Report")
            .setDescription(msg);
        this._debugInfoChannel.send({ embeds: [errorMsg] });
    }
}
__decorate([
    (0, helpers_1.Guard)()
], ErrorReporter.prototype, "reportToCreator", null);
exports.default = new ErrorReporter();
//# sourceMappingURL=ErrorReporter.js.map