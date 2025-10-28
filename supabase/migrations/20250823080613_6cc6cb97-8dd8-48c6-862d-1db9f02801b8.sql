-- إنشاء bucket للصور
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('campaign-images', 'campaign-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- سياسات الـ storage للكامبين
CREATE POLICY "Anyone can view campaign images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'campaign-images');

CREATE POLICY "Users can upload campaign images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'campaign-images');

CREATE POLICY "Users can update their campaign images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'campaign-images');

CREATE POLICY "Users can delete their campaign images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'campaign-images');