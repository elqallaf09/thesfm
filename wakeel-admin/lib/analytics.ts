// lib/analytics.ts
// تجميع تحليلات الموقع عبر دالة Postgres واحدة (get_site_analytics).

import { createAdminClient } from "@/lib/supabase/admin";

export type SiteAnalytics = {
  visitors_total: number;    // إجمالي الزوار (جلسات/مستخدمين مميّزين)
  visitors_30d: number;      // زوار آخر 30 يوم
  buyers_total: number;      // عدد المشترين (طلبات مدفوعة)
  top_page: string | null;   // أكثر صفحة زيارة
  top_page_views: number;
  top_feature: string | null;// أكثر ميزة استُخدمت
  top_feature_uses: number;
};

export async function getSiteAnalytics(): Promise<SiteAnalytics | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_site_analytics");
  if (error || !data) return null;
  return data as SiteAnalytics;

  // ── للتجربة بدون بيانات حقيقية، علّق ما فوق وارجع أرقام تجريبية:
  // return { visitors_total: 8421, visitors_30d: 1930, buyers_total: 137,
  //   top_page: "/trading/forex", top_page_views: 2210,
  //   top_feature: "حاسبة الزكاة", top_feature_uses: 1540 };
}
