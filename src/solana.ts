import { Connection, PublicKey } from '@solana/web3.js';
import { BotService } from './telegram';
import { TradeManager } from './manager';

export class SolanaListener {
    private connection: Connection;
    private bot: BotService;
    private manager: TradeManager;
    private masterWallet: PublicKey;

    constructor(bot: BotService, manager: TradeManager) {
        this.connection = new Connection(process.env.RPC_HTTPS!, {
            wsEndpoint: process.env.QUICKNODE_WSS,
            commitment: 'processed' // Crucial pour la vitesse < 300ms
        });
        this.bot = bot;
        this.manager = manager;
        this.masterWallet = new PublicKey(process.env.MASTER_WALLET!);
    }

    start() {
        console.log("🎧 Écoute WSS active...");

        // 1. Écoute du Discovery Wallet (Transferts SOL)
        this.connection.onLogs(this.masterWallet, (logs, ctx) => {
            // Logique simplifiée : détection de transfert SOL
            // Dans une version prod, il faut parser la transaction complète via getTransaction
            // Ici, on simule une détection pour l'exemple
            if (logs.logs.some(l => l.includes('Transfer'))) {
                // Récupérer destinataire réel nécessiterait un fetch tx
                // Simulation :
                this.bot.sendDiscoveryAlert("Addresse_Destinataire_Detectee", 10); 
            }
        }, 'processed');

        // 2. Écoute des Wallets Suivis (Copy Trading)
        // Note: En prod, on utiliserait un stream geyser ou plusieurs listeners
        setInterval(() => {
            // Simulation de détection de trade pour la démo
            // Dans le vrai code: connexion.onLogs(watchedWallet...)
            const watched = this.manager.getWatchedWallets();
            if (watched.length > 0 && Math.random() > 0.95) {
                // Exemple de token détecté
                this.bot.sendTradeAlert("Token_Address_Exemple", watched[0], 'BUY');
            }
        }, 5000); 
    }
}
