import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Rocket, Coins, Droplets, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTonConnectUI } from '@tonconnect/ui-react';

interface TokenCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenCreated: () => void;
}

const TokenCreationDialog = ({ open, onOpenChange, onTokenCreated }: TokenCreationDialogProps) => {
  const [tonConnectUI] = useTonConnectUI();
  const [loading, setLoading] = useState(false);
  
  // Token creation form
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [description, setDescription] = useState('');
  
  // Liquidity form
  const [liquidityTON, setLiquidityTON] = useState('');
  
  const handleCreateTokenWithLiquidity = async () => {
    if (!tonConnectUI.connected) {
      toast.error('يرجى ربط المحفظة أولاً');
      return;
    }

    if (!tokenName || !tokenSymbol || !totalSupply || !liquidityTON) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const supplyNum = parseFloat(totalSupply);
    const liquidityNum = parseFloat(liquidityTON);

    if (supplyNum <= 0 || liquidityNum <= 0) {
      toast.error('يجب أن تكون القيم أكبر من صفر');
      return;
    }

    if (liquidityNum < 0.1) {
      toast.error('الحد الأدنى للسيولة هو 0.1 TON');
      return;
    }

    setLoading(true);
    
    try {
      // Step 1: Create the token
      toast.info('🚀 جاري إنشاء التوكن...');
      
      const tokenResponse = await supabase.functions.invoke('deploy-jetton', {
        body: {
          name: tokenName.trim(),
          symbol: tokenSymbol.trim().toUpperCase(),
          supply: supplyNum,
          description: description.trim(),
          creatorId: tonConnectUI.account?.address,
          withLiquidity: true,
          liquidityTON: liquidityNum
        }
      });

      if (tokenResponse.error) {
        throw new Error(tokenResponse.error.message || 'فشل في إنشاء التوكن');
      }

      if (!tokenResponse.data?.success) {
        throw new Error(tokenResponse.data?.error || 'فشل في إنشاء التوكن');
      }

      // Step 2: Add initial liquidity automatically
      toast.info('💧 جاري إضافة السيولة الأولية...');
      
      const liquidityResponse = await supabase.functions.invoke('dex-liquidity', {
        body: {
          action: 'add',
          tokenAddress: tokenResponse.data.contractAddress,
          token0Symbol: 'TON',
          token1Symbol: tokenSymbol.trim().toUpperCase(),
          token0Amount: liquidityNum,
          token1Amount: supplyNum * 0.1, // 10% of total supply as initial liquidity
          userAddress: tonConnectUI.account?.address
        }
      });

      if (liquidityResponse.error) {
        console.error('Liquidity error:', liquidityResponse.error);
        // Don't fail the whole process if liquidity fails
        toast.warning('تم إنشاء التوكن ولكن فشل في إضافة السيولة');
      } else {
        toast.success('✅ تم إضافة السيولة الأولية بنجاح!');
      }

      toast.success(`🎉 تم إنشاء ${tokenName} (${tokenSymbol}) بنجاح!`);
      
      // Reset form
      setTokenName('');
      setTokenSymbol('');
      setTotalSupply('');
      setDescription('');
      setLiquidityTON('');
      
      onTokenCreated();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Token creation error:', error);
      toast.error(error.message || 'فشل في إنشاء التوكن');
    }
    
    setLoading(false);
  };

  const calculateTokensForLiquidity = () => {
    const supply = parseFloat(totalSupply);
    if (isNaN(supply) || supply <= 0) return '0';
    return (supply * 0.1).toLocaleString(); // 10% of total supply
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="w-6 h-6 text-primary" />
            🚀 إطلاق عملة ميم جديدة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Token Information */}
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">معلومات التوكن</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tokenName">اسم العملة *</Label>
                  <Input
                    id="tokenName"
                    placeholder="مثال: Doge Coin"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tokenSymbol">الرمز *</Label>
                  <Input
                    id="tokenSymbol"
                    placeholder="مثال: DOGE"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalSupply">العرض الكلي *</Label>
                <Input
                  id="totalSupply"
                  placeholder="مثال: 1000000"
                  type="number"
                  value={totalSupply}
                  onChange={(e) => setTotalSupply(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">الوصف (اختياري)</Label>
                <Input
                  id="description"
                  placeholder="وصف مختصر للعملة..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Liquidity Information */}
          <Card className="border-accent/20">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="w-5 h-5 text-accent" />
                <h3 className="font-semibold">السيولة الأولية</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="liquidityTON">كمية TON للسيولة *</Label>
                  <div className="relative">
                    <Input
                      id="liquidityTON"
                      placeholder="مثال: 10"
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={liquidityTON}
                      onChange={(e) => setLiquidityTON(e.target.value)}
                    />
                    <Badge variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2">
                      TON
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">الحد الأدنى: 0.1 TON</p>
                </div>

                {totalSupply && liquidityTON && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <h4 className="font-medium text-sm">معاينة السيولة:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span>{liquidityTON} TON</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-accent" />
                        <span>{calculateTokensForLiquidity()} {tokenSymbol || 'TOKEN'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      سيتم إضافة 10% من العرض الكلي كسيولة أولية
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleCreateTokenWithLiquidity}
              disabled={loading || !tonConnectUI.connected || !tokenName || !tokenSymbol || !totalSupply || !liquidityTON}
              className="flex-1"
              size="lg"
            >
              {loading ? (
                '🚀 جاري الإطلاق...'
              ) : !tonConnectUI.connected ? (
                'يرجى ربط المحفظة'
              ) : (
                '🚀 إطلاق العملة الآن'
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
          </div>

          {loading && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span>جاري إنشاء التوكن وإضافة السيولة... قد يستغرق هذا بضع ثوانٍ</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TokenCreationDialog;