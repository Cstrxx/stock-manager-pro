
REVOKE EXECUTE ON FUNCTION public.check_low_stock_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_stock_movement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
