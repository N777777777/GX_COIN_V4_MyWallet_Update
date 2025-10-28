import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Brain, Star, AlertTriangle, ArrowLeft, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTelegramData } from "@/hooks/useTelegramData";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { supabase } from "@/integrations/supabase/client";
interface PuzzleQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}
interface PuzzleResponse {
  success: boolean;
  puzzle?: {
    id: string;
    question: string;
    options: string[];
    correct_answer: number;
  };
  message?: string;
}
interface AnswerCheckResponse {
  success: boolean;
  has_answered?: boolean;
  is_correct?: boolean;
  reward_earned?: number;
  message?: string;
}
interface SubmitAnswerResponse {
  success: boolean;
  is_correct?: boolean;
  reward_earned?: number;
  correct_answer?: number;
  correct_option?: string;
  message?: string;
}
export default function DailyPuzzle() {
  const {
    toast
  } = useToast();
  const {
    telegramUser,
    updateUserStats,
    loading
  } = useTelegramData();
  const {
    goBack
  } = useBackNavigation();
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [hasAnsweredToday, setHasAnsweredToday] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [correctOption, setCorrectOption] = useState<string>("");
  const [todaysPuzzle, setTodaysPuzzle] = useState<PuzzleQuestion | null>(null);
  const [puzzleLoading, setPuzzleLoading] = useState(true);

  // جلب الغز اليومي من قاعدة البيانات
  const fetchDailyPuzzle = async () => {
    try {
      setPuzzleLoading(true);
      const {
        data,
        error
      } = await supabase.rpc('get_daily_puzzle');
      if (error) {
        console.error('Error fetching daily puzzle:', error);
        toast({
          title: "خطأ",
          description: "فشل في تحميل الغز اليومي",
          variant: "destructive"
        });
        return;
      }
      const response = data as unknown as PuzzleResponse;
      if (response?.success && response?.puzzle) {
        setTodaysPuzzle({
          id: response.puzzle.id,
          question: response.puzzle.question,
          options: response.puzzle.options,
          correctAnswer: response.puzzle.correct_answer
        });
      }
    } catch (error) {
      console.error('Error fetching daily puzzle:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الغز",
        variant: "destructive"
      });
    } finally {
      setPuzzleLoading(false);
    }
  };

  // التحقق من إجابة المستخدم اليوم
  const checkUserAnswer = async () => {
    if (!telegramUser) return;
    try {
      const {
        data,
        error
      } = await supabase.rpc('check_user_puzzle_answer', {
        p_telegram_id: telegramUser.telegram_id
      });
      if (error) {
        console.error('Error checking user answer:', error);
        return;
      }
      const response = data as unknown as AnswerCheckResponse;
      if (response?.success && response?.has_answered) {
        setHasAnsweredToday(true);
        setShowResult(true);
        setWasCorrect(response.is_correct || false);
      }
    } catch (error) {
      console.error('Error checking user answer:', error);
    }
  };
  useEffect(() => {
    console.log('DailyPuzzle: Component mounted');
    fetchDailyPuzzle();
  }, []);
  useEffect(() => {
    console.log('DailyPuzzle: telegramUser changed:', telegramUser);
    console.log('DailyPuzzle: todaysPuzzle changed:', todaysPuzzle);
    if (telegramUser && todaysPuzzle) {
      checkUserAnswer();
    }
  }, [telegramUser, todaysPuzzle]);
  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !telegramUser || !todaysPuzzle) return;

    // Check if user has enough coins (10 Alpha coins required)
    if (telegramUser.coins < 10) {
      toast({
        title: "رصيد غير كافي",
        description: "تحتاج إلى 10 نقاط ألفا للمشاركة في اللغز اليومي",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const {
        data,
        error
      } = await supabase.rpc('submit_puzzle_answer', {
        p_telegram_id: telegramUser.telegram_id,
        p_puzzle_id: todaysPuzzle.id,
        p_user_answer: parseInt(selectedAnswer)
      });
      if (error) {
        console.error('Error submitting answer:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء إرسال الإجابة",
          variant: "destructive"
        });
        return;
      }
      const response = data as unknown as SubmitAnswerResponse;
      if (response?.success) {
        const isCorrect = response.is_correct || false;
        setHasAnsweredToday(true);
        setShowResult(true);
        setWasCorrect(isCorrect);
        
        // إعداد الإجابة الصحيحة للعرض
        if (!isCorrect && response.correct_option) {
          setCorrectOption(response.correct_option);
        }
        
        // عرض النتيجة بدون إعادة تحميل الصفحة
        if (isCorrect) {
          toast({
            title: "إجابة صحيحة! 🎉",
            description: "لقد حصلت على مكافأة في رصيد منصة الألفا!"
          });
        } else {
          toast({
            title: "إجابة خاطئة 😅", 
            description: `الإجابة الصحيحة كانت: ${response.correct_option}`
          });
        }

        // تحديث رصيد المستخدم دون إعادة تحميل
        if (updateUserStats && telegramUser) {
          // خصم 10 عملات ألفا من الرصيد
          telegramUser.coins = Math.max(0, telegramUser.coins - 10);
          // إضافة مكافأة إذا كانت الإجابة صحيحة
          if (isCorrect && response.reward_earned) {
            // يتم إضافة المكافأة في قاعدة البيانات
          }
        }
      } else {
        toast({
          title: "خطأ",
          description: response?.message || "حدث خطأ أثناء إرسال الإجابة",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting puzzle answer:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال الإجابة",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  if (loading || puzzleLoading) {
    return <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={goBack} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">الغز اليومي</h1>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <div className="space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">جاري تحميل الغز اليومي...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  if (!telegramUser || !todaysPuzzle) {
    return <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={goBack} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">الغز اليومي</h1>
          </div>

          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-muted-foreground">
                {!telegramUser ? "فشل في تحميل بيانات المستخدم" : "لا يوجد غز متاح اليوم"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={goBack} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">الغز اليومي</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              لغز اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasAnsweredToday ? <div className="text-center space-y-4">
                {showResult && <div className={`p-4 rounded-lg ${wasCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {wasCorrect ? <Star className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                      <span className={`font-semibold ${wasCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {wasCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة'}
                      </span>
                    </div>
                    
                    {/* عرض السؤال والخيارات بدون تمييز النتائج */}
                    <div className="bg-muted/30 p-3 rounded-lg mt-3">
                      <h4 className="font-medium mb-3 text-foreground">{todaysPuzzle?.question}</h4>
                      <div className="space-y-2">
                        {todaysPuzzle?.options.map((option, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded bg-background border border-border">
                            <span className="text-sm text-foreground">{option}</span>
                            {index === todaysPuzzle.correctAnswer && (
                              <Check className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        ))}
                      </div>
                      {!wasCorrect && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-600">
                            اخترت: {todaysPuzzle?.options[parseInt(selectedAnswer || "0")]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>}
                <p className="text-muted-foreground">
                  لقد شاركت في لغز اليوم بالفعل. عد غداً للغز جديد!
                </p>
              </div> : <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">{todaysPuzzle.question}</h3>
                  
                  <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                    {todaysPuzzle.options.map((option, index) => <div key={index} className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>)}
                  </RadioGroup>
                </div>

                

                <div className="text-sm text-muted-foreground">
                  رصيدك الحالي: {telegramUser?.coins?.toFixed(2) || '0.00'} نقطة ألفا
                </div>

                <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer || isSubmitting || telegramUser.coins < 10} className="w-full">
                  {isSubmitting ? "جاري الإرسال..." : "إرسال الإجابة (10 نقاط ألفا)"}
                </Button>
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>;
}