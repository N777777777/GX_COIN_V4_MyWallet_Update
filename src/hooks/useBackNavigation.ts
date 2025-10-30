import { useNavigate } from "react-router-dom";
import { useClickSound } from "./useClickSound";

export function useBackNavigation() {
  const navigate = useNavigate();
  const { playSound } = useClickSound();

  const goBack = () => {
    playSound(); // تشغيل الصوت عند النقر
    // التحقق من وجود تاريخ للتنقل
    if (window.history.length > 1 && window.history.state) {
      navigate(-1);
    } else {
      // الذهاب للصفحة الرئيسية إذا لم يكن هناك تاريخ
      navigate('/');
    }
  };

  return { goBack };
}