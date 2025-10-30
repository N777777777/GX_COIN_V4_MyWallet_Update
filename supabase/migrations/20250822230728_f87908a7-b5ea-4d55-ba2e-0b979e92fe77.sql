-- إنشاء storage bucket للصور
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-images', 'task-images', true)
ON CONFLICT (id) DO NOTHING;

-- سياسات للوصول للصور
CREATE POLICY "Task images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'task-images');

CREATE POLICY "Users can upload task images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'task-images');