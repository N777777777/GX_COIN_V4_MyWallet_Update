import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== Task Manager function called ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Reading request body...');
    const requestBody = await req.text();
    console.log('Raw request body:', requestBody);
    
    const { action, telegram_user_id, task_data } = JSON.parse(requestBody);
    console.log('Parsed data:', { action, telegram_user_id, task_data });

    switch (action) {
      case 'get_user_tasks': {
        console.log('Getting user tasks for user:', telegram_user_id);
        
        // الحصول على المهام المكتملة
        const { data: completedTasks, error: completedError } = await supabaseClient
          .from('completed_tasks')
          .select('*')
          .eq('telegram_user_id', telegram_user_id)
          .order('completed_at', { ascending: false });

        if (completedError) {
          console.error('Error fetching completed tasks:', completedError);
        }

        // الحصول على المهام المعلقة
        const { data: pendingTasks, error: pendingError } = await supabaseClient
          .from('pending_tasks')
          .select('*')
          .eq('telegram_user_id', telegram_user_id)
          .order('submitted_at', { ascending: false });

        if (pendingError) {
          console.error('Error fetching pending tasks:', pendingError);
        }

        console.log('Found completed tasks:', completedTasks?.length || 0);
        console.log('Found pending tasks:', pendingTasks?.length || 0);

        return new Response(
          JSON.stringify({
            completed: completedTasks || [],
            pending: pendingTasks || []
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            }
          }
        );
      }

      case 'submit_task': {
        const { task_id, task_title, uid, campaign_link } = task_data;
        
        console.log('=== SUBMITTING TASK ===');
        console.log('Task ID:', task_id);
        console.log('Task Title:', task_title);
        console.log('UID:', uid);
        console.log('User ID:', telegram_user_id);
        console.log('Campaign Link:', campaign_link);

        // التحقق من عدم وجود مهمة مكتملة أو معلقة مسبقاً
        console.log('Checking for existing completed tasks...');
        const { data: existingCompleted, error: completedError } = await supabaseClient
          .from('completed_tasks')
          .select('id')
          .eq('telegram_user_id', telegram_user_id)
          .eq('task_id', task_id)
          .maybeSingle();

        if (completedError) {
          console.error('Error checking completed tasks:', completedError);
        }

        if (existingCompleted) {
          console.log('Task already completed:', existingCompleted);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'تم إكمال هذه المهمة مسبقاً' 
            }),
            { 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              },
              status: 400
            }
          );
        }

        console.log('Checking for existing pending tasks...');
        const { data: existingPending, error: pendingError } = await supabaseClient
          .from('pending_tasks')
          .select('id')
          .eq('telegram_user_id', telegram_user_id)
          .eq('task_id', task_id)
          .maybeSingle();

        if (pendingError) {
          console.error('Error checking pending tasks:', pendingError);
        }

        if (existingPending) {
          console.log('Task already pending:', existingPending);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'تم تقديم هذه المهمة مسبقاً وهي قيد المراجعة' 
            }),
            { 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              },
              status: 400
            }
          );
        }

        // إدراج المهمة في جدول المهام المعلقة
        console.log('Inserting task into pending_tasks...');
        const insertData = {
          telegram_user_id,
          task_id,
          task_title,
          uid,
          campaign_link,
          status: 'pending'
        };
        console.log('Insert data:', insertData);
        
        const { data, error } = await supabaseClient
          .from('pending_tasks')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('=== INSERT ERROR ===');
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          console.error('Error hint:', error.hint);
          
          // التحقق من نوع الخطأ
          if (error.code === '23505') { // unique_violation
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'تم تقديم هذه المهمة مسبقاً أو تم إكمالها' 
              }),
              { 
                headers: { 
                  ...corsHeaders, 
                  'Content-Type': 'application/json' 
                },
                status: 400
              }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'فشل في إرسال المهمة: ' + (error.message || 'خطأ غير معروف')
            }),
            { 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              },
              status: 400
            }
          );
        }

        console.log('=== TASK SUBMITTED SUCCESSFULLY ===');
        console.log('Inserted data:', data);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'تم إرسال المهمة بنجاح',
            data: data 
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
            status: 200
          }
        );
      }

      case 'approve_task': {
        const { task_id, reviewer_notes } = task_data;
        
        console.log('Approving task:', task_id);

        // تحديث حالة المهمة إلى approved
        const { data, error } = await supabaseClient
          .from('pending_tasks')
          .update({
            status: 'approved',
            reviewer_notes,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', task_id)
          .select()
          .single();

        if (error) {
          console.error('Error approving task:', error);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'فشل في الموافقة على المهمة' 
            }),
            { 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              },
              status: 400
            }
          );
        }

        console.log('Task approved successfully:', data);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'تم الموافقة على المهمة بنجاح'
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            }
          }
        );
      }

      case 'reject_task': {
        const { task_id, reviewer_notes } = task_data;
        
        console.log('Rejecting task:', task_id);

        // تحديث حالة المهمة إلى rejected
        const { data, error } = await supabaseClient
          .from('pending_tasks')
          .update({
            status: 'rejected',
            reviewer_notes,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', task_id)
          .select()
          .single();

        if (error) {
          console.error('Error rejecting task:', error);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'فشل في رفض المهمة' 
            }),
            { 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              },
              status: 400
            }
          );
        }

        console.log('Task rejected successfully:', data);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'تم رفض المهمة بنجاح'
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            }
          }
        );
      }

      default:
        console.log('Unknown action:', action);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'إجراء غير معروف: ' + action
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
            status: 400
          }
        );
    }
  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'خطأ في الخادم: ' + error.message
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
})