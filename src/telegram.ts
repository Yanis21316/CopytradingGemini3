import TelegramBot from 'node-telegram-bot-api';
import { TradeManager } from './manager';

export class BotService {
    private bot: TelegramBot;
    private manager: TradeManager;

    constructor(manager: TradeManager) {
        this.bot = new TelegramBot(process.env.TG_TOKEN!, { polling: true });
        this.manager = manager;
    }

    init() {
        // Menu Principal
        this.bot.onText(/\/start/, (msg) => {
            this.showMainMenu(msg.chat.id);
        });

        // Gestion des clics sur les boutons
        this.bot.on('callback_query', async (query) => {
            const chatId = query.message!.chat.id;
            const data = query.data;

            if (data === 'check_pnl') {
                const stats = this.manager.getStats();
                this.bot.sendMessage(chatId, `📊 *Performance*\n\nPNL: ${stats.pnl} SOL\nWin Rate: ${stats.winRate}%`, { parse_mode: 'Markdown' });
            } else if (data === 'wallets') {
                this.bot.sendMessage(chatId, `👀 *Wallets Suivis*\n\n${this.manager.getWatchedWallets().join('\n')}`, { parse_mode: 'Markdown' });
            } else if (data?.startsWith('buy_')) {
                // Format: buy_TOKENADDRESS
                const token = data.split('_')[1];
                await this.manager.executeBuy(token, chatId, this.bot);
            } else if (data?.startsWith('add_wallet_')) {
                const wallet = data.split('_')[2];
                this.manager.addWallet(wallet);
                this.bot.sendMessage(chatId, `✅ Wallet ajouté: \`${wallet}\``, { parse_mode: 'Markdown' });
            }
            
            // Réponse pour arrêter le chargement du bouton
            this.bot.answerCallbackQuery(query.id);
        });
    }

    showMainMenu(chatId: number) {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📊 Vérifier PNL', callback_data: 'check_pnl' }, { text: '👀 Wallets Suivis', callback_data: 'wallets' }],
                    [{ text: '⚙️ Config TP/SL', callback_data: 'config' }, { text: '🔴 Arrêter Bot', callback_data: 'stop' }]
                ]
            }
        };
        this.bot.sendMessage(chatId, "🤖 **GMINI Solana CopyBot**\nQue voulez-vous faire ?", { parse_mode: 'Markdown', ...opts });
    }

    // Appelée quand un trade est détecté
    async sendTradeAlert(tokenAddress: string, wallet: string, type: 'BUY' | 'SELL') {
        const chatId = process.env.CHAT_ID!;
        if (type === 'BUY') {
            const opts = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ COPIER LE TRADE', callback_data: `buy_${tokenAddress}` }],
                        [{ text: '❌ Ignorer', callback_data: 'ignore' }]
                    ]
                }
            };
            await this.bot.sendMessage(chatId, `🚨 **Signal Détecté**\n\nWallet: \`${wallet.slice(0,6)}...${wallet.slice(-4)}\`\nAction: BUY\nToken: \`${tokenAddress}\``, { parse_mode: 'Markdown', ...opts });
        }
    }

    // Appelée par le Discovery Wallet
    async sendDiscoveryAlert(newWallet: string, amount: number) {
        const chatId = process.env.CHAT_ID!;
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ Ajouter ce wallet', callback_data: `add_wallet_${newWallet}` }]
                ]
            }
        };
        await this.bot.sendMessage(chatId, `🕵️ **Discovery Wallet**\n\nGros transfert détecté: ${amount} SOL\nVers: \`${newWallet}\``, { parse_mode: 'Markdown', ...opts });
    }
}
