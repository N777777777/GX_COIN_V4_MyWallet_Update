import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { supabase } from "@/integrations/supabase/client";

interface Puzzle {
  id: string;
  question: string;
  option_1: string;
  option_2: string;
  option_3: string;
  correct_answer: number;
  is_active: boolean;
  created_at: string;
}

export default function PuzzleAdmin() {
  const { toast } = useToast();
  const { goBack } = useBackNavigation();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPuzzle, setEditingPuzzle] = useState<Puzzle | null>(null);
  
  // نموذج الإضافة/التعديل
  const [formData, setFormData] = useState({
    question: '',
    option_1: '',
    option_2: '',
    option_3: '',
    correct_answer: 0
  });

  // جلب جميع الألغاز
  const fetchPuzzles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_puzzles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching puzzles:', error);
        toast({
          title: "خطأ",
          description: "فشل في تحميل الألغاز",
          variant: "destructive"
        });
        return;
      }

      setPuzzles(data || []);
    } catch (error) {
      console.error('Error fetching puzzles:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الألغاز",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPuzzles();
  }, []);

  // إعادة تعيين النموذج
  const resetForm = () => {
    setFormData({
      question: '',
      option_1: '',
      option_2: '',
      option_3: '',
      correct_answer: 0
    });
    setEditingPuzzle(null);
  };

  // إضافة أو تحديث غز
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question.trim() || !formData.option_1.trim() || 
        !formData.option_2.trim() || !formData.option_3.trim()) {
      toast({
        title: "خطأ",
        description: "جميع الحقول مطلوبة",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingPuzzle) {
        // تحديث
        const { error } = await supabase
          .from('daily_puzzles')
          .update({
            question: formData.question,
            option_1: formData.option_1,
            option_2: formData.option_2,
            option_3: formData.option_3,
            correct_answer: formData.correct_answer,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPuzzle.id);

        if (error) throw error;

        toast({
          title: "تم التحديث",
          description: "تم تحديث الغز بنجاح",
        });
      } else {
        // إضافة
        const { error } = await supabase
          .from('daily_puzzles')
          .insert([{
            question: formData.question,
            option_1: formData.option_1,
            option_2: formData.option_2,
            option_3: formData.option_3,
            correct_answer: formData.correct_answer
          }]);

        if (error) throw error;

        toast({
          title: "تم الإضافة",
          description: "تم إضافة الغز بنجاح",
        });
      }

      resetForm();
      fetchPuzzles();
    } catch (error) {
      console.error('Error saving puzzle:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الغز",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // تحديد غز للتعديل
  const handleEdit = (puzzle: Puzzle) => {
    setFormData({
      question: puzzle.question,
      option_1: puzzle.option_1,
      option_2: puzzle.option_2,
      option_3: puzzle.option_3,
      correct_answer: puzzle.correct_answer
    });
    setEditingPuzzle(puzzle);
  };

  // تفعيل/إلغاء تفعيل غز
  const togglePuzzleStatus = async (puzzle: Puzzle) => {
    try {
      const { error } = await supabase
        .from('daily_puzzles')
        .update({
          is_active: !puzzle.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', puzzle.id);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: `تم ${puzzle.is_active ? 'إلغاء تفعيل' : 'تفعيل'} الغز`,
      });

      fetchPuzzles();
    } catch (error) {
      console.error('Error toggling puzzle status:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة الغز",
        variant: "destructive"
      });
    }
  };

  // حذف غز
  const handleDelete = async (puzzleId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الغز؟')) return;

    try {
      const { error } = await supabase
        .from('daily_puzzles')
        .delete()
        .eq('id', puzzleId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الغز بنجاح",
      });

      fetchPuzzles();
    } catch (error) {
      console.error('Error deleting puzzle:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الغز",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={goBack} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">إدارة الألغاز اليومية</h1>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <div className="space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">جاري تحميل الألغاز...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={goBack} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">إدارة الألغاز اليومية</h1>
        </div>

        {/* نموذج الإضافة/التعديل */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editingPuzzle ? 'تعديل الغز' : 'إضافة غز جديد'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="question">السؤال</Label>
                <Textarea
                  id="question"
                  placeholder="اكتب السؤال هنا..."
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="option_1">الخيار الأول</Label>
                  <Input
                    id="option_1"
                    placeholder="الخيار الأول"
                    value={formData.option_1}
                    onChange={(e) => setFormData({ ...formData, option_1: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="option_2">الخيار الثاني</Label>
                  <Input
                    id="option_2"
                    placeholder="الخيار الثاني"
                    value={formData.option_2}
                    onChange={(e) => setFormData({ ...formData, option_2: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="option_3">الخيار الثالث</Label>
                  <Input
                    id="option_3"
                    placeholder="الخيار الثالث"
                    value={formData.option_3}
                    onChange={(e) => setFormData({ ...formData, option_3: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>الإجابة الصحيحة</Label>
                <RadioGroup 
                  value={formData.correct_answer.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, correct_answer: parseInt(value) })}
                  className="flex gap-6 mt-2"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="0" id="correct-0" />
                    <Label htmlFor="correct-0">الخيار الأول</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="1" id="correct-1" />
                    <Label htmlFor="correct-1">الخيار الثاني</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="2" id="correct-2" />
                    <Label htmlFor="correct-2">الخيار الثالث</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'جاري الحفظ...' : (editingPuzzle ? 'تحديث' : 'إضافة')}
                </Button>
                {editingPuzzle && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    إلغاء
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* قائمة الألغاز */}
        <Card>
          <CardHeader>
            <CardTitle>الألغاز المحفوظة ({puzzles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {puzzles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد ألغاز محفوظة</p>
            ) : (
              <div className="space-y-4">
                {puzzles.map((puzzle) => (
                  <div
                    key={puzzle.id}
                    className={`border rounded-lg p-4 ${
                      puzzle.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{puzzle.question}</h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(puzzle)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={puzzle.is_active ? "default" : "secondary"}
                          onClick={() => togglePuzzleStatus(puzzle)}
                        >
                          {puzzle.is_active ? 'نشط' : 'غير نشط'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(puzzle.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div className={`p-2 rounded ${puzzle.correct_answer === 0 ? 'bg-green-100 border border-green-300' : 'bg-white border'}`}>
                        1. {puzzle.option_1}
                      </div>
                      <div className={`p-2 rounded ${puzzle.correct_answer === 1 ? 'bg-green-100 border border-green-300' : 'bg-white border'}`}>
                        2. {puzzle.option_2}
                      </div>
                      <div className={`p-2 rounded ${puzzle.correct_answer === 2 ? 'bg-green-100 border border-green-300' : 'bg-white border'}`}>
                        3. {puzzle.option_3}
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      تم الإنشاء: {new Date(puzzle.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}