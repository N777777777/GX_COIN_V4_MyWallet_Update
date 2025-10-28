-- إضافة سياسة للسماح لغير المسجلين بالإدراج
CREATE POLICY "Allow anonymous inserts" 
ON public.uid_submissions 
FOR INSERT 
TO anon
WITH CHECK (true);

-- إضافة سياسة للسماح لغير المسجلين بالقراءة  
CREATE POLICY "Allow anonymous selects" 
ON public.uid_submissions 
FOR SELECT 
TO anon
USING (true);

-- إضافة سياسة للسماح لغير المسجلين بالتحديث
CREATE POLICY "Allow anonymous updates" 
ON public.uid_submissions 
FOR UPDATE 
TO anon
USING (true);