"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = void 0;
const helpers_1 = require("../utils/helpers");
exports.commands = [
    {
        name: 'price',
        description: 'Check the price of a stock',
    },
];
class TradingCommandHandler {
    init(client) {
        if (!client)
            throw new Error('Client is undefined');
        this._client = client;
    }
    async onMessage(interaction) {
    }
}
__decorate([
    (0, helpers_1.Guard)()
], TradingCommandHandler.prototype, "onMessage", null);
exports.default = new TradingCommandHandler();
//# sourceMappingURL=TradingCommandHandler.js.map