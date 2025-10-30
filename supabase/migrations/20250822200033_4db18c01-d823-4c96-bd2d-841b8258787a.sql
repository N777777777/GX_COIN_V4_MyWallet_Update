-- إنشاء bucket لصور شعارات الشركاء
INSERT INTO storage.buckets (id, name, public) VALUES ('partner-logos', 'partner-logos', true);

-- إنشاء سياسات لرفع وعرض الصور
CREATE POLICY "Partner logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'partner-logos');

CREATE POLICY "Users can upload partner logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'partner-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their partner logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'partner-logos' AND auth.role() = 'authenticated');