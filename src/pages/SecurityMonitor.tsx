import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Ban, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityLog {
  id: string;
  telegram_id: number;
  telegram_user_id: string;
  ip_address: string;
  user_agent: string;
  access_source: string;
  security_flags: string[];
  created_at: string;
  is_blocked: boolean;
}

interface UserSession {
  id: string;
  telegram_id: number;
  session_token: string;
  device_fingerprint: string;
  ip_address: string;
  is_active: boolean;
  created_at: string;
  last_activity: string;
  expires_at: string;
}

export default function SecurityMonitor() {
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // جلب السجلات الأمنية
      const { data: logs, error: logsError } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // جلب الجلسات النشطة
      const { data: sessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (sessionsError) throw sessionsError;

      setSecurityLogs(logs as SecurityLog[] || []);
      setActiveSessions(sessions as UserSession[] || []);
    } catch (error) {
      console.error('خطأ في جلب البيانات الأمنية:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب البيانات الأمنية",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const blockUser = async (telegramId: number) => {
    try {
      const { error } = await supabase
        .from('telegram_users')
        .update({ is_blocked: true })
        .eq('telegram_id', telegramId);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: `تم حظر المستخدم ${telegramId}`,
      });

      fetchSecurityData();
    } catch (error) {
      console.error('خطأ في حظر المستخدم:', error);
      toast({
        title: "خطأ",
        description: "فشل في حظر المستخدم",
        variant: "destructive"
      });
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم إنهاء الجلسة",
      });

      fetchSecurityData();
    } catch (error) {
      console.error('خطأ في إنهاء الجلسة:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنهاء الجلسة",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const getSeverityColor = (flags: string[]) => {
    if (flags.includes('USER_BLOCKED')) return 'destructive';
    if (flags.includes('INVALID_SESSION') || flags.includes('IP_CHANGED')) return 'secondary';
    if (flags.length > 0) return 'outline';
    return 'default';
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">مراقب الأمان</h1>
        </div>
        <Button onClick={fetchSecurityData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              الجلسات النشطة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              المحاولات المشبوهة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityLogs.filter(log => log.security_flags.length > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ban className="h-4 w-4" />
              المستخدمون المحظورون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityLogs.filter(log => log.is_blocked).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الجلسات النشطة */}
      <Card>
        <CardHeader>
          <CardTitle>الجلسات النشطة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">المستخدم: {session.telegram_id}</div>
                  <div className="text-sm text-muted-foreground">
                    IP: {session.ip_address} | آخر نشاط: {new Date(session.last_activity).toLocaleString('ar')}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => terminateSession(session.id)}
                >
                  إنهاء الجلسة
                </Button>
              </div>
            ))}
            {activeSessions.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                لا توجد جلسات نشطة
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* السجلات الأمنية */}
      <Card>
        <CardHeader>
          <CardTitle>السجلات الأمنية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {securityLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">المستخدم: {log.telegram_id}</span>
                    {log.security_flags.length > 0 && (
                      <div className="flex gap-1">
                        {log.security_flags.map((flag, index) => (
                          <Badge key={index} variant={getSeverityColor(log.security_flags)}>
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    IP: {log.ip_address} | المصدر: {log.access_source} | {new Date(log.created_at).toLocaleString('ar')}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!log.is_blocked && log.security_flags.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => blockUser(log.telegram_id)}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      حظر
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {securityLogs.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                لا توجد سجلات أمنية
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}