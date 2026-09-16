import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'كيف ترتب ميزانية راتب 800 دينار كويتي؟ | THE SFM',
  description: 'مثال تعليمي لبناء ميزانية شهرية مرنة لراتب 800 د.ك مع فصل الأساسيات والالتزامات والادخار والمصاريف المتغيرة دون افتراض أن توزيعاً واحداً يناسب الجميع.',
  path: '/guides/budget-800-kwd',
});

export default function Budget800KwdGuidePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:py-16" dir="rtl">
      <article className="prose prose-neutral max-w-none dark:prose-invert">
        <p className="text-sm font-semibold text-primary">دليل تعليمي</p>
        <h1>كيف ترتب ميزانية راتب 800 دينار كويتي؟</h1>
        <p>راتب 800 د.ك لا يعني أن هناك توزيعاً مثالياً واحداً. الإيجار، القروض، التزامات الأسرة، وهدف الادخار تغير الصورة بالكامل. الأفضل أن تبدأ بالأرقام الحقيقية ثم تبني حدوداً مرنة لكل فئة.</p>
        <h2>1. ابدأ بالالتزامات الثابتة</h2>
        <p>اجمع السكن، الأقساط، الاتصالات، الاشتراكات والالتزامات العائلية. هذه هي المصاريف التي يجب أن تعرفها قبل تحديد ميزانية الترفيه أو الادخار.</p>
        <h2>2. افصل الأساسيات عن المصروف المتغير</h2>
        <p>الغذاء، الوقود والمواصلات عادة أساسية، لكن قيمتها قابلة للتحسين. راقب متوسط ثلاثة أشهر بدلاً من الاعتماد على شهر واحد غير اعتيادي.</p>
        <h2>3. اجعل الادخار بنداً واضحاً</h2>
        <p>حدد مبلغاً يمكن الاستمرار عليه. إذا كانت الديون مرتفعة قد يكون تخفيضها أولوية قبل زيادة الاستثمار، بينما من لديه التزامات منخفضة قد يرفع الادخار تدريجياً.</p>
        <h2>4. راجع الميزانية كل شهر</h2>
        <p>الميزانية أداة قرار وليست عقوبة. قارن ما خططت له بما صرفته فعلاً، ثم عدّل الحدود للشهر التالي.</p>
      </article>
      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <strong>استخدم بياناتك الحقيقية داخل THE SFM</strong>
        <p className="mt-2 text-sm text-muted-foreground">سجل دخلك ومصروفاتك وشاهد الصورة بناءً على أرقامك أنت.</p>
        <Link href="/login?mode=register&next=%2Fdashboard" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground">ابدأ الآن</Link>
      </div>
    </main>
  );
}
