import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { TelegramWebApp } from "@/components/TelegramWebApp";
import { SecurityAlert } from "@/components/SecurityAlert";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import Swap from "./pages/Swap";

import Qualification from "./pages/Qualification";
import Airdrop from "./pages/Airdrop";
import TasksOverview from "./pages/TasksOverview";
import BotAdmin from "./pages/BotAdmin";
import BotSetup from "./pages/BotSetup";
import BotDiagnostic from "./pages/BotDiagnostic";
import WithdrawalsAdmin from "./pages/WithdrawalsAdmin";
import TestBalance from "./pages/TestBalance";
import AddTonToUser from "./pages/AddTonToUser";
import QuickAddTon from "./pages/QuickAddTon";
import QuickBotSetup from "./pages/QuickBotSetup";
import QuickBotRestart from "./pages/QuickBotRestart";
import DEX from "./pages/DEX";
import Maintenance from "./pages/Maintenance";
import LuckyDraws from "./pages/LuckyDraws";
import CreateLuckyDraw from "./pages/CreateLuckyDraw";
import LuckyDrawDetails from "./pages/LuckyDrawDetails";
import LuckyDrawJoin from "./pages/LuckyDrawJoin";
import AddKucoinTask from "./pages/AddKucoinTask";
import AutoCompleteKucoin from "./pages/AutoCompleteKucoin";
import Leaderboard from "./pages/Leaderboard";
import UserBalanceManager from "./pages/UserBalanceManager";
import NotifyPreviousWinners from "./pages/NotifyPreviousWinners";
import Offers from "./pages/Offers";
import DeleteMessages from "./pages/DeleteMessages";
import SendSecurityMessage from "./pages/SendSecurityMessage";
import PremiumPurchase from "./pages/PremiumPurchase";
import CreateCampaign from "./pages/CreateCampaign";
import CampaignDetails from "./pages/CampaignDetails";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import DailyPuzzle from "./pages/DailyPuzzle";
import PuzzleAdmin from "./pages/PuzzleAdmin";
import Mining from "./pages/Mining";
import NotFound from "./pages/NotFound";
import PepeToGCoinSwap from "./pages/PepeToGCoinSwap";
import PartnershipInvitation from "./pages/PartnershipInvitation";
import PartnershipRequests from "./pages/PartnershipRequests";
import PartnershipRequest from "./pages/PartnershipRequest";
import UserManagement from "./pages/UserManagement";
import Blocked from "./pages/Blocked";
import ResetAllBalances from "./pages/ResetAllBalances";
import TelegramOnly from "./pages/TelegramOnly";
import NewTask from "./pages/NewTask";
import MyWallet from "./pages/MyWallet";



const queryClient = new QueryClient();

// 🔧 وضع الصيانة - غيّر إلى false لإيقاف الصيانة
const MAINTENANCE_MODE = false;

const App = () => {
  // استخدام النظام الأمني
  const { isAuthenticated, securityFlags, error: securityError } = useSecureAuth();
  
  // التحقق من وضع المطور - إضافة ?dev=true للـ URL للوصول كمطور
  const urlParams = new URLSearchParams(window.location.search);
  const isDeveloper = urlParams.get('dev') === 'true';
  
  // إذا كان وضع الصيانة مفعل وليس مطور، اعرض صفحة الصيانة فقط
  if (MAINTENANCE_MODE && !isDeveloper) {
    return (
      <QueryClientProvider client={queryClient}>
        <TonConnectUIProvider 
          manifestUrl={
          window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.endsWith('.manusvm.computer')
            ? 'https://ton-connect.github.io/demo-dapp-with-wallet/tonconnect-manifest.json' // استخدام Manifest عام للاختبار في البيئات المؤقتة
            : `https://gxcoinv4mywalletupdate-hitgn.sevalla.page/ton-connect-manifest.json`
        }
          actionsConfiguration={{
            twaReturnUrl: 'https://t.me/G3_COIN_V3_BOT'
          }}
        >
          <TooltipProvider>
            <TelegramWebApp>
              <Toaster />
              <Sonner />
              <Maintenance />
            </TelegramWebApp>
          </TooltipProvider>
        </TonConnectUIProvider>
      </QueryClientProvider>
    );
  }

  // التطبيق العادي عندما لا يكون في وضع الصيانة
  return (
    <QueryClientProvider client={queryClient}>
      <TonConnectUIProvider 
        manifestUrl={
          window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.endsWith('.manusvm.computer')
            ? 'https://ton-connect.github.io/demo-dapp-with-wallet/tonconnect-manifest.json' // استخدام Manifest عام للاختبار في البيئات المؤقتة
            : `https://gxcoinv4mywalletupdate-hitgn.sevalla.page/ton-connect-manifest.json`
        }
        actionsConfiguration={{
          twaReturnUrl: 'https://t.me/G3_COIN_V3_BOT'
        }}
      >
        <TooltipProvider>
          <TelegramWebApp>
            <Toaster />
            <Sonner />
            
            {/* عرض تحذيرات الأمان - فقط للحالات الخطيرة */}
            {securityFlags.length > 0 && securityFlags.includes('USER_BLOCKED') && (
              <SecurityAlert 
                securityFlags={securityFlags.filter(flag => flag === 'USER_BLOCKED')} 
                onRetry={() => window.location.reload()} 
              />
            )}
            
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/settings" element={<Settings />} />
        <Route path="/daily-puzzle" element={<DailyPuzzle />} />
        <Route path="/puzzle-admin" element={<PuzzleAdmin />} />
                <Route path="/qualification" element={<Qualification />} />
                <Route path="/airdrop" element={<Airdrop />} />
                <Route path="/tasks-overview" element={<TasksOverview />} />
            <Route path="/quick-bot-restart" element={<QuickBotRestart />} />
            <Route path="/bot-admin" element={<BotAdmin />} />
                <Route path="/bot-setup" element={<BotSetup />} />
                <Route path="/bot-diagnostic" element={<BotDiagnostic />} />
                <Route path="/withdrawals-admin" element={<WithdrawalsAdmin />} />
                <Route path="/test-balance" element={<TestBalance />} />
                <Route path="/add-ton-user" element={<AddTonToUser />} />
                <Route path="/quick-add-ton" element={<QuickAddTon />} />
                <Route path="/quick-bot-setup" element={<QuickBotSetup />} />
                <Route path="/restart-bot" element={<QuickBotRestart />} />
                <Route path="/swap" element={<Swap />} />
                <Route path="/dex" element={<DEX />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="/lucky-draws" element={<LuckyDraws />} />
                <Route path="/lucky-draws/create" element={<CreateLuckyDraw />} />
                <Route path="/lucky-draws/:id" element={<LuckyDrawDetails />} />
                <Route path="/lucky-draws/:id/join" element={<LuckyDrawJoin />} />
                <Route path="/add-kucoin-task" element={<AddKucoinTask />} />
                <Route path="/auto-complete-kucoin" element={<AutoCompleteKucoin />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/user-balance-manager" element={<UserBalanceManager />} />
                <Route path="/notify-previous-winners" element={<NotifyPreviousWinners />} />
                <Route path="/offers" element={<Offers />} />
                <Route path="/delete-messages" element={<DeleteMessages />} />
                <Route path="/send-security-message" element={<SendSecurityMessage />} />
                <Route path="/premium" element={<PremiumPurchase />} />
                <Route path="/campaigns/create" element={<CreateCampaign />} />
                <Route path="/campaign/:id" element={<CampaignDetails />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-cancel" element={<PaymentCancel />} />
                <Route path="/mining" element={<Mining />} />
                <Route path="/pepe-to-gcoin" element={<PepeToGCoinSwap />} />
                <Route path="/partnership-invitation" element={<PartnershipInvitation />} />
                <Route path="/partnership-requests" element={<PartnershipRequests />} />
                <Route path="/partnership-request" element={<PartnershipRequest />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/blocked" element={<Blocked />} />
                <Route path="/reset-all-balances" element={<ResetAllBalances />} />
                <Route path="/telegram-only" element={<TelegramOnly />} />
                <Route path="/new-task" element={<NewTask />} />
                <Route path="/my-wallet" element={<MyWallet />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TelegramWebApp>
        </TooltipProvider>
      </TonConnectUIProvider>
    </QueryClientProvider>
  );
};

export default App;
