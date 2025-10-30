import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Wallet, ArrowDownToLine, ArrowUpFromLine, Info } from "lucide-react";
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramData } from "@/hooks/useTelegramData";
export default function TonWalletConnect() {
  const navigate = useNavigate();
  const [tonConnectUI] = useTonConnectUI();
  const [isConnecting, setIsConnecting] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    toast
  } = useToast();
  const {
    telegramUser
  } = useTelegramData();
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };
  const handleDisconnect = async () => {
    try {
      await tonConnectUI.disconnect();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };
  const walletAddress = tonConnectUI.wallet?.account?.address;
  const isConnected = !!walletAddress;
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }
    if (!telegramUser?.id) {
      toast({
        title: "User Error",
        description: "User not identified",
        variant: "destructive"
      });
      return;
    }
    setIsProcessing(true);
    try {
      const nanoAmount = (parseFloat(depositAmount) * 1_000_000_000).toString();
      const recipientAddress = "UQC4lt5vMjeAVhUIrg0JQqqnd0yuDJeyV_5AZTNx9yl7mRkz";
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{
          address: recipientAddress,
          amount: nanoAmount
        }]
      };
      console.log('Sending transaction:', transaction);
      const result = await tonConnectUI.sendTransaction(transaction);
      console.log('Transaction result:', result);
      if (result) {
        toast({
          title: "Deposit Sent",
          description: "Saving deposit for automatic verification...",
          duration: 3000
        });
        try {
          const {
            error: pendingError
          } = await supabase.from('pending_ton_deposits').insert({
            telegram_user_id: telegramUser.id,
            transaction_hash: result.boc,
            wallet_address: walletAddress || '',
            amount: parseFloat(depositAmount),
            status: 'pending_verification'
          });
          if (pendingError) {
            console.error('Error saving pending deposit:', pendingError);
            throw pendingError;
          }
          toast({
            title: "✅ Deposit Saved",
            description: `Your ${depositAmount} TON deposit will be verified and credited within 24 hours`,
            duration: 7000
          });
        } catch (error) {
          console.error('Error saving deposit:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toast({
            title: "Error Saving Deposit",
            description: `Failed to save deposit request: ${errorMessage}`,
            variant: "destructive"
          });
        }
        setDepositAmount('');
      }
    } catch (error) {
      console.error('Error sending transaction:', error);
      let errorMessage = "An error occurred while processing the transaction";
      if (error instanceof Error) {
        if (error.message.includes("Transaction was not sent")) {
          errorMessage = "Transaction was cancelled by user or rejected by wallet";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds in wallet";
        } else if (error.message.includes("invalid address")) {
          errorMessage = "Invalid wallet address";
        }
      }
      toast({
        title: "Deposit Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  return <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="bg-card/50 border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Wallet className="w-6 h-6 text-primary" />
              TON Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="font-medium">
                  {isConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {isConnected && <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>}
            </div>

            {/* Wallet Address */}
            {isConnected && walletAddress && <div className="p-4 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                <p className="font-mono text-sm break-all">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                </p>
              </div>}

            {/* Connect Button */}
            {!isConnected && <Button onClick={handleConnect} disabled={isConnecting} className="w-full" size="lg">
                <Wallet className="w-5 h-5 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>}

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-500 mb-1">Supported Wallets</p>
                <p className="text-muted-foreground">
                  Tonkeeper, MyTonWallet, and other TON-compatible wallets
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deposit Section */}
        <Card className="bg-card/50 border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-green-500" />
              Deposit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Deposit TON directly from your connected wallet to your account balance.
            </p>

            {isConnected ? <>
                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (TON)</label>
                  <Input type="number" placeholder="0.00" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="text-center text-lg" min="0" step="0.01" />
                  <p className="text-xs text-muted-foreground text-center">
                    1 TON = 1 TON balance
                  </p>
                </div>

                {/* Deposit Button */}
                <Button onClick={handleDeposit} disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isProcessing} className="w-full bg-green-500 hover:bg-green-600">
                  {isProcessing ? <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </div> : <>
                      <ArrowDownToLine className="w-4 h-4 mr-2" />
                      Deposit {depositAmount || '0'} TON
                    </>}
                </Button>

                {/* Info Box */}
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <h4 className="text-sm font-medium mb-2 text-blue-500">🔄 Automatic Verification:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Instant record saving</li>
                    <li>• Automatic verification within 24 hours</li>
                    <li>• Balance credited upon confirmation</li>
                    <li>• Exchange rate: 1 TON = 1 TON balance</li>
                    <li>• No deposit fees</li>
                    <li>• Advanced security system</li>
                  </ul>
                </div>
              </> : <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <p className="text-sm text-muted-foreground">
                  Please connect your wallet first to make a deposit
                </p>
              </div>}
          </CardContent>
        </Card>

        {/* Withdrawal Section */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ArrowUpFromLine className="w-5 h-5 text-orange-500" />
                Withdraw
              </CardTitle>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Withdraw TON from your account balance directly to your connected wallet.
            </p>
            <Button className="w-full" disabled variant="outline">
              <ArrowUpFromLine className="w-4 h-4 mr-2" />
              Withdraw TON
            </Button>
          </CardContent>
        </Card>

        {/* Security Notice */}
        
      </div>
    </div>;
}