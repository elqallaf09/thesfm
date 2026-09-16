import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'كيف تحسب زكاة الأسهم في الكويت؟ | THE SFM',
  description: 'دليل تعليمي مبسط لفهم البيانات التي تحتاجها عند حساب زكاة الأسهم، مع تنبيه إلى اختلاف المعالجة الشرعية بحسب نية التملك وطبيعة الأصل والمرجع المتبع.',
  path: '/guides/zakat-kuwait-stocks',
});

export default function ZakatKuwaitStocksGuidePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:py-16" dir="rtl">
      <article className="prose prose-neutral max-w-none dark:prose-invert">
        <p className="text-sm font-semibold text-primary">دليل تعليمي</p>
        <h1>كيف تحسب زكاة الأسهم في الكويت؟</h1>
        <p>حساب زكاة الأسهم لا يبدأ بنسبة واحدة تطبق على كل محفظة. أول خطوة هي تحديد طبيعة ملكيتك للأسهم والبيانات المتوفرة لديك، لأن المعالجة قد تختلف بحسب نية الاقتناء، نشاط الشركة، وطريقة الحساب الشرعية التي تتبعها.</p>
        <h2>البيانات التي تحتاجها</h2>
        <ul>
          <li>عدد الأسهم والقيمة الحالية للمحفظة.</li>
          <li>تاريخ التملك أو بداية الحول الذي تعتمد عليه.</li>
          <li>هل الأسهم مملوكة للتداول أم للاحتفاظ والاستثمار طويل الأجل.</li>
          <li>أي بيانات منشورة عن الأصول والالتزامات إذا كانت طريقة الحساب التي تتبعها تحتاجها.</li>
        </ul>
        <h2>لا تخلط بين السعر السوقي والحكم الشرعي</h2>
        <p>السعر السوقي معلومة مالية، أما تحديد الوعاء الزكوي وطريقة احتسابه فهو مسألة شرعية قد تختلف تفاصيلها. لذلك صمم THE SFM أدواته للفصل بين الحساب الرقمي وبين الحكم الشرعي، مع إبقاء القرار النهائي للمستخدم والمرجع الذي يتبعه.</p>
        <h2>خطوة عملية</h2>
        <p>اجمع بيانات محفظتك أولاً، ثم استخدم الحاسبة كأداة تقديرية، وبعدها راجع النتيجة وفق الطريقة الشرعية التي تعتمدها. لا تعتبر ناتج الحاسبة فتوى.</p>
      </article>
      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <strong>جرّب الحاسبة العامة</strong>
        <p className="mt-2 text-sm text-muted-foreground">بدون تسجيل دخول وبدون حفظ القيم المدخلة.</p>
        <Link href="/zakat-calculator" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground">حاسبة الزكاة</Link>
      </div>
    </main>
  );
}
