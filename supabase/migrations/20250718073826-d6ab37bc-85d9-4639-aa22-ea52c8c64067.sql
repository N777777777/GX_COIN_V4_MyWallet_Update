-- تحديث سياسات RLS لجدول uid_submissions لتسمح بالإدراج للجميع
DROP POLICY IF EXISTS "Users can create their own submissions" ON public.uid_submissions;

CREATE POLICY "Anyone can create submissions" 
ON public.uid_submissions 
FOR INSERT 
WITH CHECK (true);

-- تحديث سياسة القراءة لتسمح للجميع بالقراءة
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.uid_submissions;

CREATE POLICY "Anyone can view submissions" 
ON public.uid_submissions 
FOR SELECT 
USING (true);

-- تحديث سياسة التحديث لتسمح للجميع بالتحديث
DROP POLICY IF EXISTS "Users can update their own submissions" ON public.uid_submissions;

CREATE POLICY "Anyone can update submissions" 
ON public.uid_submissions 
FOR UPDATE 
USING (true);