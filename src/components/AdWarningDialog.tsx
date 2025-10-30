import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Eye, Clock } from 'lucide-react';

interface AdWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

export function AdWarningDialog({ open, onOpenChange, onContinue }: AdWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md mx-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            ⚠️ تنبيه مهم
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
              <Eye className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">
                  يجب مشاهدة الإعلان كاملاً
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  لاستلام المكافأة، يجب مشاهدة الإعلان حتى النهاية وعدم إغلاقه مبكراً
                </p>
              </div>
            </div>
          </div>


          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300 text-center font-medium">
              ⚠️ إذا لم تتبع هذه التعليمات، لن تحصل على أي مكافأة
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2">
          <Button 
            onClick={onContinue} 
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            فهمت، متابعة مشاهدة الإعلان
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}