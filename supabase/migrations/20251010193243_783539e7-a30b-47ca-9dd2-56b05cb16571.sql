-- حذف الجداول القديمة إن وجدت
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.partnership_invitations CASCADE;
DROP TABLE IF EXISTS public.managers CASCADE;

-- إنشاء جدول المديرين
CREATE TABLE public.managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_username TEXT UNIQUE NOT NULL,
  telegram_user_id UUID REFERENCES public.telegram_users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول دعوات الشراكة
CREATE TABLE public.partnership_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_telegram_username TEXT NOT NULL,
  manager_user_id UUID REFERENCES public.telegram_users(id),
  invited_telegram_username TEXT NOT NULL,
  invited_user_id UUID,
  invited_telegram_id BIGINT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول الشركاء
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id UUID UNIQUE REFERENCES public.telegram_users(id) NOT NULL,
  telegram_id BIGINT UNIQUE NOT NULL,
  manager_telegram_username TEXT NOT NULL,
  manager_user_id UUID REFERENCES public.telegram_users(id),
  invitation_id UUID REFERENCES public.partnership_invitations(id),
  pepe_commission_rate NUMERIC DEFAULT 0.60,
  alpha_commission_rate NUMERIC DEFAULT 0.06,
  gcoin_v4_commission_rate NUMERIC DEFAULT 0.10,
  manager_pepe_commission_rate NUMERIC DEFAULT 0.40,
  manager_alpha_commission_rate NUMERIC DEFAULT 0.04,
  manager_gcoin_v4_commission_rate NUMERIC DEFAULT 0.05,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إدراج المديرين المحددين
INSERT INTO public.managers (telegram_username) VALUES 
  ('@Ammar_1011'),
  ('@G_COIN_help_Support'),
  ('@S9_P6'),
  ('@d8ded');

-- تفعيل RLS على الجداول
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للمديرين
CREATE POLICY "Anyone can view active managers"
ON public.managers FOR SELECT
USING (is_active = true);

CREATE POLICY "Service role can manage managers"
ON public.managers FOR ALL
USING (true) WITH CHECK (true);

-- سياسات RLS لدعوات الشراكة
CREATE POLICY "Service role can manage invitations"
ON public.partnership_invitations FOR ALL
USING (true) WITH CHECK (true);

-- سياسات RLS للشركاء
CREATE POLICY "Service role can manage partners"
ON public.partners FOR ALL
USING (true) WITH CHECK (true);

-- إنشاء indexes للأداء
CREATE INDEX idx_partnership_invitations_status ON public.partnership_invitations(status);
CREATE INDEX idx_partnership_invitations_invited_telegram_id ON public.partnership_invitations(invited_telegram_id);
CREATE INDEX idx_partners_telegram_id ON public.partners(telegram_id);
CREATE INDEX idx_partners_manager ON public.partners(manager_telegram_username);

-- دالة لإنشاء دعوة شراكة
CREATE OR REPLACE FUNCTION create_partnership_invitation(
  p_manager_username TEXT,
  p_invited_username TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manager_record RECORD;
  v_invited_record RECORD;
  v_invitation_id UUID;
BEGIN
  SELECT * INTO v_manager_record
  FROM public.managers
  WHERE telegram_username = p_manager_username
  AND is_active = true;
  
  IF v_manager_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المدير غير موجود أو غير نشط'
    );
  END IF;
  
  SELECT * INTO v_invited_record
  FROM public.telegram_users
  WHERE username = TRIM(LEADING '@' FROM p_invited_username);
  
  IF v_invited_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم المدعو غير موجود'
    );
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.partnership_invitations
    WHERE invited_telegram_id = v_invited_record.telegram_id
    AND status = 'pending'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يوجد دعوة معلقة بالفعل لهذا المستخدم'
    );
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.partners
    WHERE telegram_id = v_invited_record.telegram_id
    AND is_active = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم شريك بالفعل'
    );
  END IF;
  
  INSERT INTO public.partnership_invitations (
    manager_telegram_username,
    manager_user_id,
    invited_telegram_username,
    invited_user_id,
    invited_telegram_id
  ) VALUES (
    p_manager_username,
    v_manager_record.telegram_user_id,
    p_invited_username,
    v_invited_record.id,
    v_invited_record.telegram_id
  ) RETURNING id INTO v_invitation_id;
  
  RETURN json_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'invited_telegram_id', v_invited_record.telegram_id,
    'invited_first_name', v_invited_record.first_name,
    'message', 'تم إرسال الدعوة بنجاح'
  );
END;
$$;

-- دالة للرد على دعوة الشراكة
CREATE OR REPLACE FUNCTION respond_to_partnership_invitation(
  p_invitation_id UUID,
  p_accepted BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_partner_id UUID;
BEGIN
  SELECT * INTO v_invitation
  FROM public.partnership_invitations
  WHERE id = p_invitation_id;
  
  IF v_invitation IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الدعوة غير موجودة'
    );
  END IF;
  
  IF v_invitation.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'تم الرد على الدعوة مسبقاً'
    );
  END IF;
  
  UPDATE public.partnership_invitations
  SET 
    status = CASE WHEN p_accepted THEN 'accepted' ELSE 'rejected' END,
    responded_at = now(),
    updated_at = now()
  WHERE id = p_invitation_id;
  
  IF p_accepted THEN
    INSERT INTO public.partners (
      telegram_user_id,
      telegram_id,
      manager_telegram_username,
      manager_user_id,
      invitation_id
    ) VALUES (
      v_invitation.invited_user_id,
      v_invitation.invited_telegram_id,
      v_invitation.manager_telegram_username,
      v_invitation.manager_user_id,
      p_invitation_id
    ) RETURNING id INTO v_partner_id;
    
    RETURN json_build_object(
      'success', true,
      'accepted', true,
      'partner_id', v_partner_id,
      'message', 'تم قبول الدعوة وأصبحت شريكاً'
    );
  ELSE
    RETURN json_build_object(
      'success', true,
      'accepted', false,
      'message', 'تم رفض الدعوة'
    );
  END IF;
END;
$$;