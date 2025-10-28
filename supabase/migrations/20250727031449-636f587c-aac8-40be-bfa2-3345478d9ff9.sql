-- إرجاع العملات المشتراة من P2P للمستخدمين المتضررين
-- إضافة العملات المشتراة من P2P إلى الرصيد الحالي

DO $$
DECLARE
    buyer_record RECORD;
    affected_count INTEGER := 0;
BEGIN
    -- إنشاء نسخة احتياطية قبل التعديل
    CREATE TABLE IF NOT EXISTS p2p_buyers_restoration_backup (
        buyer_telegram_id BIGINT,
        buyer_name TEXT,
        coins_before_restoration NUMERIC,
        total_coins_bought_p2p NUMERIC,
        coins_after_restoration NUMERIC,
        total_purchases INTEGER,
        restoration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- إرجاع العملات المشتراة من P2P لكل مشتري
    FOR buyer_record IN 
        SELECT 
            buyer_id,
            bu.telegram_id as buyer_telegram_id,
            bu.first_name as buyer_name,
            bu.coins as current_coins,
            SUM(pt.coin_amount) as total_coins_bought,
            COUNT(*) as total_purchases
        FROM p2p_trades pt
        JOIN telegram_users bu ON pt.buyer_id = bu.id
        WHERE pt.status = 'completed'
        GROUP BY buyer_id, bu.telegram_id, bu.first_name, bu.coins
    LOOP
        -- حفظ النسخة الاحتياطية
        INSERT INTO p2p_buyers_restoration_backup (
            buyer_telegram_id, buyer_name, coins_before_restoration,
            total_coins_bought_p2p, coins_after_restoration, total_purchases
        ) VALUES (
            buyer_record.buyer_telegram_id, buyer_record.buyer_name, buyer_record.current_coins,
            buyer_record.total_coins_bought, 
            buyer_record.current_coins + buyer_record.total_coins_bought,
            buyer_record.total_purchases
        );
        
        -- إضافة العملات المشتراة من P2P إلى الرصيد الحالي
        UPDATE telegram_users 
        SET 
            coins = coins + buyer_record.total_coins_bought,
            updated_at = NOW()
        WHERE id = buyer_record.buyer_id;
        
        affected_count := affected_count + 1;
    END LOOP;
    
    -- رسالة نهائية
    RAISE NOTICE 'تم إرجاع عملات P2P لـ % مشتري', affected_count;
    
END $$;