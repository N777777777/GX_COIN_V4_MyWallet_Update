import { useState, useEffect } from "react";
import { ArrowLeft, Users, CheckCircle, Crown, Trophy, Medal, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface QualifiedUser {
  id: string;
  telegram_id: number;
  telegram_user_id: string;
  first_name: string;
  username: string;
  qualification_date: string;
  qualification_type: string;
  is_active: boolean;
}

export default function QualifiedUsers() {
  const [qualifiedUsers, setQualifiedUsers] = useState<QualifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchQualifiedUsers = async () => {
    try {
      setLoading(true);
      
      // Use raw SQL query to get qualified users data
      const { data, error } = await supabase
        .rpc('get_qualified_users_list') as any;

      if (error) {
        console.error('Error fetching qualified users:', error);
        return;
      }

      setQualifiedUsers(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualifiedUsers();
  }, []);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <Award className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRankBadge = (position: number) => {
    if (position <= 3) return "default";
    if (position <= 10) return "secondary";
    return "outline";
  };

  const getCardStyle = (position: number) => {
    if (position === 1) return "border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50";
    if (position === 2) return "border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50";
    if (position === 3) return "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50";
    return "";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold">المستخدمين المؤهلين</h1>
          </div>
        </div>

        {/* Stats */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-medium">إجمالي المؤهلين</span>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {qualifiedUsers.length}
            </Badge>
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">جاري تحميل المؤهلين...</p>
          </div>
        ) : qualifiedUsers.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد مؤهلين حتى الآن</h3>
            <p className="text-muted-foreground">سيظهر المستخدمون هنا بعد إكمال مهمة KuCoin</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {qualifiedUsers.map((user, index) => (
              <Card 
                key={user.id} 
                className={`p-4 transition-all duration-200 hover:shadow-md ${getCardStyle(index + 1)}`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex items-center gap-2">
                    <Badge variant={getRankBadge(index + 1)} className="text-lg px-3 py-2 min-w-[3rem] justify-center">
                      #{index + 1}
                    </Badge>
                    {getRankIcon(index + 1)}
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold text-base truncate">
                        {user.first_name || user.username || `مستخدم ${user.telegram_id}`}
                      </div>
                      {user.username && (
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      تاريخ التأهيل: {formatDate(user.qualification_date)}
                    </div>
                  </div>
                  
                  {/* Qualification Badge */}
                  <div className="text-center">
                    <Badge 
                      variant="secondary"
                      className="bg-green-100 text-green-700 border-green-200"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      مؤهل
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
            
            {/* Refresh Button */}
            <div className="text-center pt-6">
              <Button onClick={fetchQualifiedUsers} variant="outline">
                تحديث القائمة
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}