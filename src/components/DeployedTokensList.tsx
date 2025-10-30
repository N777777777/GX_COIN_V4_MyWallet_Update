import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Clock, CheckCircle, XCircle, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface DeployedToken {
  id: string;
  token_name: string;
  token_symbol: string;
  token_supply: number;
  token_description?: string;
  contract_address?: string;
  deployment_hash?: string;
  status: 'pending' | 'deployed' | 'failed';
  created_at: string;
  deployed_at?: string;
  error_message?: string;
}

const DeployedTokensList: React.FC = () => {
  const [tokens, setTokens] = useState<DeployedToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeployedTokens();
  }, []);

  const fetchDeployedTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('deployed_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching deployed tokens:', error);
        toast.error('فشل في تحميل العقود المنشورة');
        return;
      }

      setTokens((data || []) as DeployedToken[]);
    } catch (error) {
      console.error('Error fetching deployed tokens:', error);
      toast.error('فشل في تحميل العقود المنشورة');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'deployed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'قيد النشر';
      case 'deployed':
        return 'تم النشر';
      case 'failed':
        return 'فشل النشر';
      default:
        return 'غير معروف';
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🏗️ العقود المنشورة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل العقود...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏗️ العقود المنشورة
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لا توجد عقود منشورة بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tokens.map((token) => (
              <div key={token.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{token.token_symbol}</h3>
                      <Badge 
                        variant={
                          token.status === 'deployed' ? 'default' : 
                          token.status === 'failed' ? 'destructive' : 'secondary'
                        }
                        className="flex items-center gap-1"
                      >
                        {getStatusIcon(token.status)}
                        {getStatusLabel(token.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{token.token_name}</p>
                    {token.token_description && (
                      <p className="text-xs text-muted-foreground mt-1">{token.token_description}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>العرض: {token.token_supply.toLocaleString()}</div>
                    <div>{formatDate(token.created_at)}</div>
                  </div>
                </div>

                {token.status === 'deployed' && token.contract_address && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border">
                      <span className="text-xs text-muted-foreground">عنوان العقد:</span>
                      <code className="text-xs font-mono flex-1">{token.contract_address}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(token.contract_address!, 'عنوان العقد')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    {token.deployment_hash && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border">
                        <span className="text-xs text-muted-foreground">hash المعاملة:</span>
                        <code className="text-xs font-mono flex-1">{token.deployment_hash}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(token.deployment_hash!, 'hash المعاملة')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => window.open(`https://testnet.tonscan.org/address/${token.contract_address}`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                        عرض في المستكشف
                      </Button>
                    </div>
                  </div>
                )}

                {token.status === 'failed' && token.error_message && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-700 dark:text-red-300">
                      خطأ: {token.error_message}
                    </p>
                  </div>
                )}

                {token.status === 'pending' && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border">
                    <div className="animate-spin w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-yellow-700 dark:text-yellow-300">
                      جاري نشر العقد على شبكة TON...
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeployedTokensList;