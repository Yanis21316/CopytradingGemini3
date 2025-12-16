import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

interface Position {
    token: string;
    entryPrice: number;
    amount: number;
    tp: number; // Prix TP
    sl: number; // Prix SL
    txId?: string;
}

export class TradeManager {
    private positions: Position[] = [];
    private watchedWallets: string[] = [];
    private pnl: number = 0;
    
    constructor() {
        // Charger wallets depuis DB/Json si besoin
    }

    addWallet(wallet: string) {
        if (!this.watchedWallets.includes(wallet)) this.watchedWallets.push(wallet);
    }

    getWatchedWallets() { return this.watchedWallets; }
    getStats() { return { pnl: this.pnl.toFixed(4), winRate: 65 }; }

    async executeBuy(token: string, chatId: number, bot: TelegramBot) {
        const mode = process.env.MODE;
        bot.sendMessage(chatId, `⏳ Exécution BUY sur ${token} (${mode})...`);

        // 1. Obtenir le prix actuel via Jupiter API
        const price = await this.getPrice(token);
        
        if (!price) {
            bot.sendMessage(chatId, "❌ Erreur: Impossible de récupérer le prix.");
            return;
        }

        // 2. Calculer TP/SL
        const tpPercent = parseFloat(process.env.DEFAULT_TP_PERCENT || "50") / 100;
        const slPercent = parseFloat(process.env.DEFAULT_SL_PERCENT || "20") / 100;

        const entryPrice = price;
        const targetTP = entryPrice * (1 + tpPercent);
        const targetSL = entryPrice * (1 - slPercent);

        // 3. Exécution (Mock ou Réelle)
        if (mode === 'REAL') {
            // ICI: Intégration Jupiter Swap SDK pour transaction on-chain
            // const tx = await jupiter.exchange(...)
        }

        // 4. Enregistrer la position
        this.positions.push({
            token,
            entryPrice,
            amount: 0.1, // Montant SOL
            tp: targetTP,
            sl: targetSL
        });

        bot.sendMessage(chatId, `✅ **Ordre Ouvert**\n\nEntrée: $${entryPrice.toFixed(6)}\nTP: $${targetTP.toFixed(6)} (+${tpPercent*100}%)\nSL: $${targetSL.toFixed(6)} (-${slPercent*100}%)`, { parse_mode: 'Markdown' });
    }

    // Fonction critique : Boucle de vérification
    async checkOpenPositions() {
        if (this.positions.length === 0) return;

        // Récupérer les prix actuels de tous les tokens suivis
        const ids = this.positions.map(p => p.token).join(',');
        // Appel API Jupiter Pricing (batch)
        // const prices = await axios.get(`https://price.jup.ag/v4/price?ids=${ids}`);
        
        // Simulation pour l'exemple
        for (let i = this.positions.length - 1; i >= 0; i--) {
            const pos = this.positions[i];
            const currentPrice = await this.getPrice(pos.token); // Utiliser cache en prod
            
            if (!currentPrice) continue;

            if (currentPrice >= pos.tp) {
                this.executeSell(pos, 'TP', currentPrice);
                this.positions.splice(i, 1);
            } else if (currentPrice <= pos.sl) {
                this.executeSell(pos, 'SL', currentPrice);
                this.positions.splice(i, 1);
            }
        }
    }

    async executeSell(pos: Position, reason: 'TP' | 'SL', price: number) {
        const profit = (price - pos.entryPrice) * pos.amount; // Simplifié
        this.pnl += profit; // Mise à jour PNL fictif ou réel

        const emoji = reason === 'TP' ? '🚀' : '🛑';
        const msg = `${emoji} **VENTE AUTOMATIQUE (${reason})**\n\nToken: ${pos.token}\nPrix Sortie: ${price}\nProfit: ${profit}`;
        
        // Envoyer notif via bot (nécessiterait de passer l'instance bot ou utiliser event emitter)
        console.log(msg); 
        // En prod: bot.sendMessage(chatId, msg...)
        
        if (process.env.MODE === 'REAL') {
            // Logique de vente Jupiter
        }
    }

    async getPrice(tokenMint: string): Promise<number | null> {
        try {
            const response = await axios.get(`https://price.jup.ag/v4/price?ids=${tokenMint}`);
            return response.data.data[tokenMint]?.price || null;
        } catch (e) {
            return null;
        }
    }
}
