import { Message } from 'discord.js';

class TradingMessageHandler {
  public onMessage(msg: Message): void {
    console.log(msg.content);
  }
}

export default TradingMessageHandler;
