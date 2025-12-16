import dotenv from 'dotenv';
import { BotService } from './telegram';
import { SolanaListener } from './solana';
import { TradeManager } from './manager';

dotenv.config();

console.log(`🚀 Démarrage du Bot GMINI CopyTrading [Mode: ${process.env.MODE}]`);

const tradeManager = new TradeManager();
const botService = new BotService(tradeManager);
const solanaListener = new SolanaListener(botService, tradeManager);

// Lancement des services
botService.init();
solanaListener.start();

// Boucle de surveillance des prix pour TP/SL automatique
setInterval(() => {
    tradeManager.checkOpenPositions();
}, 2000); // Vérifie les prix toutes les 2 secondes
