'use client';
import { useState, useEffect } from 'react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

// نصائح من كتب مالية وفكرية وتسويقية عالمية
const BOOK_TIPS = [
  // 📚 أب غني أب فقير - روبرت كيوساكي
  { titleAr: 'أب غني أب فقير', contentAr: 'الأغنياء لا يعملون من أجل المال، بل يجعلون المال يعمل من أجلهم.', titleEn: 'Rich Dad Poor Dad', contentEn: 'The rich do not work for money. They make money work for them.' },
  { titleAr: 'أب غني أب فقير', contentAr: 'الأصول تضع المال في جيبك، والخصوم تأخذ المال منه.', titleEn: 'Rich Dad Poor Dad', contentEn: 'Assets put money in your pocket. Liabilities take money out.' },
  { titleAr: 'أب غني أب فقير', contentAr: 'التعليم المالي هو الاستثمار الأهم في حياتك.', titleEn: 'Rich Dad Poor Dad', contentEn: 'Financial education is the most important investment you can make.' },

  // 📚 فكر وازدد ثراءً - نابليون هيل
  { titleAr: 'فكر وازدد ثراءً', contentAr: 'كل إنجاز وكل ثروة مكتسبة تبدأ بفكرة.', titleEn: 'Think and Grow Rich', contentEn: 'Every achievement and all earned riches begin with an idea.' },
  { titleAr: 'فكر وازدد ثراءً', contentAr: 'الإصرار هو الجهد المستمر الضروري لتحويل الإيمان إلى ثروة.', titleEn: 'Think and Grow Rich', contentEn: 'Persistence is the sustained effort necessary to induce faith.' },

  // 📚 المستثمر الذكي - بنيامين غراهام
  { titleAr: 'المستثمر الذكي', contentAr: 'السوق في المدى القصير آلة تصويت، وفي المدى الطويل آلة وزن.', titleEn: 'The Intelligent Investor', contentEn: 'In the short run, the market is a voting machine. In the long run, it is a weighing machine.' },
  { titleAr: 'المستثمر الذكي', contentAr: 'الهامش الأمني هو أهم مفهوم في الاستثمار.', titleEn: 'The Intelligent Investor', contentEn: 'The margin of safety is the central concept of investment.' },

  // 📚 أغنى رجل في بابل - جورج كلاسون
  { titleAr: 'أغنى رجل في بابل', contentAr: 'ابدأ بادخار 10% من كل دخار تكسبه.', titleEn: 'Richest Man in Babylon', contentEn: 'Start thy purse to fattening by saving 10% of what you earn.' },
  { titleAr: 'أغنى رجل في بابل', contentAr: 'التدرب على الادخار يعلمك كيف تمنح المال قيمته الحقيقية.', titleEn: 'Richest Man in Babylon', contentEn: 'Practicing thrift will teach you to give money its true value.' },
  { titleAr: 'أغنى رجل في بابل', contentAr: 'اجعل مسكنك أصلاً بدلاً من أن يكون عبئاً عليك.', titleEn: 'Richest Man in Babylon', contentEn: 'Own thy own home to make it an asset, not a burden.' },

  // 📚 سيكولوجية المال - مورغان هاوسل
  { titleAr: 'سيكولوجية المال', contentAr: 'التواضع والخوف والشك أكثر نفعاً لمحفظتك من الثقة المفرطة.', titleEn: 'Psychology of Money', contentEn: 'Humility, fear, and doubt are better for your wallet than confidence.' },
  { titleAr: 'سيكولوجية المال', contentAr: 'المال الكافي أكثر قيمة من المال الأكثر.', titleEn: 'Psychology of Money', contentEn: 'Enough money is worth more than more money.' },
  { titleAr: 'سيكولوجية المال', contentAr: 'الوقت هو أقوى قوة في الاستثمار.', titleEn: 'Psychology of Money', contentEn: 'Time is the most powerful force in investing.' },

  // 📚 عادات ذرية - جيمس كلير
  { titleAr: 'العادات الذرية', contentAr: 'تحسين 1% يومياً يجعلك أفضل بـ 37 مرة خلال عام واحد.', titleEn: 'Atomic Habits', contentEn: 'Improving 1% daily makes you 37 times better in a year.' },
  { titleAr: 'العادات الذرية', contentAr: 'أنت لا ترتقي إلى مستوى أهدافك، بل تنحدر إلى مستوى أنظمتك.', titleEn: 'Atomic Habits', contentEn: 'You do not rise to the level of your goals, you fall to your systems.' },

  // 📚 التفكير السريع والبطيء - دانيال كانيمان
  { titleAr: 'التفكير السريع والبطيء', contentAr: 'خسارة شيء تؤلم ضعف مقدار الألم مقارنة بسعادة الحصول عليه.', titleEn: 'Thinking Fast and Slow', contentEn: 'Losing something hurts twice as much as gaining the same thing feels good.' },

  // 📚 الشريك الصامت - وارن بافيت (حكمه)
  { titleAr: 'وارن بافيت', contentAr: 'القاعدة الأولى: لا تخسر المال. القاعدة الثانية: لا تنس القاعدة الأولى.', titleEn: 'Warren Buffett', contentEn: 'Rule No.1: Never lose money. Rule No.2: Never forget rule No.1.' },
  { titleAr: 'وارن بافيت', contentAr: 'أفضل وقت لزراعة شجرة كان قبل 20 عاماً. أفضل وقت ثانٍ هو الآن.', titleEn: 'Warren Buffett', contentEn: 'The best time to plant a tree was 20 years ago. The second best is now.' },

  // 📚 كيف تكسب الأصدقاء - ديل كارنيجي
  { titleAr: 'كيف تكسب الأصدقاء', contentAr: 'الشخص الناجح في علاقاته هو من يرى منظور الآخرين.', titleEn: 'How to Win Friends', contentEn: 'Success in relationships comes from seeing the other person\'s perspective.' },

  // 📚 العقلية - كارول دويك
  { titleAr: 'العقلية', contentAr: 'الموهبة وحدها لا تكفي، المثابرة هي ما يحدد النجاح.', titleEn: 'Mindset', contentEn: 'Talent alone is not enough. Perseverance determines success.' },

  // 📚 ابدأ بالسؤال - سيمون سينك
  { titleAr: 'ابدأ بالسؤال لماذا', contentAr: 'الناس لا يشترون ما تفعله، بل يشترون لماذا تفعله.', titleEn: 'Start With Why', contentEn: 'People do not buy what you do, they buy why you do it.' },

  // 📚 نصائح عامة
  { titleAr: 'الحكمة المالية', contentAr: 'لا تنفق ما تبقى بعد الادخار، بل ادخر ما تبقى بعد الإنفاق.', titleEn: 'Financial Wisdom', contentEn: 'Do not save what is left after spending, spend what is left after saving.' },
  { titleAr: 'مبدأ باريتو', contentAr: '20% من جهودك تولد 80% من نتائجك. ركز على الأهم.', titleEn: 'Pareto Principle', contentEn: '20% of your efforts generate 80% of results. Focus on what matters.' },
  { titleAr: 'التنويع', contentAr: 'لا تضع كل بيضك في سلة واحدة - نوّع استثماراتك دائماً.', titleEn: 'Diversification', contentEn: 'Never put all your eggs in one basket. Always diversify your investments.' },
];

interface WisdomTickerProps {
  language: 'ar' | 'en' | 'fr';
  onLanguageChange?: (lang: 'ar' | 'en' | 'fr') => void;
  showLanguageSelector?: boolean;
}

export function WisdomTicker({ language, onLanguageChange, showLanguageSelector = true }: WisdomTickerProps) {
  const [tips, setTips] = useState(BOOK_TIPS);
  const [dailyTip, setDailyTip] = useState<{ titleAr: string; contentAr: string; titleEn: string; contentEn: string } | null>(null);
  const isArabic = language === 'ar';

  useEffect(() => {
    // جلب نصيحة يومية من الذكاء الاصطناعي
    const fetchDailyTip = async () => {
      try {
        const today = new Date().toDateString();
        const cached = localStorage.getItem('daily_tip_date');
        const cachedTip = localStorage.getItem('daily_tip');

        // استخدم الكاش إذا كان من نفس اليوم
        if (cached === today && cachedTip) {
          const parsed = JSON.parse(cachedTip);
          setDailyTip(parsed);
          setTips(prev => [parsed, ...prev]);
          return;
        }

        const res = await fetch('/api/daily-tip');
        if (res.ok) {
          const data = await res.json();
          if (data.tip) {
            localStorage.setItem('daily_tip_date', today);
            localStorage.setItem('daily_tip', JSON.stringify(data.tip));
            setDailyTip(data.tip);
            setTips(prev => [data.tip, ...prev]);
          }
        }
      } catch {
        // استمر بالنصائح الثابتة
      }
    };

    fetchDailyTip();
  }, []);

  const allTips = [...tips, ...tips]; // مضاعفة للتدوير

  return (
    <>
      <style>{`
        @keyframes wisdom-scroll-ltr{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes wisdom-scroll-rtl{from{transform:translateX(0)}to{transform:translateX(50%)}}
        .wisdom-layout{display:flex;flex-direction:column;gap:8px;margin-bottom:8px;font-family:var(--font-ui);color:var(--foreground)}
        .wisdom-panel{order:2;min-width:0;min-height:44px;flex:1;overflow:hidden;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted);padding:8px 12px}
        .wisdom-panel:focus-within{border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
        .wisdom-ticker{display:flex;align-items:center;gap:24px;width:max-content;white-space:nowrap;font-size:12px;animation:wisdom-scroll-ltr 120s linear infinite}
        .wisdom-layout[dir="rtl"] .wisdom-ticker{animation-name:wisdom-scroll-rtl}
        .wisdom-ticker:hover,.wisdom-ticker:focus-within{animation-play-state:paused}
        .wisdom-item{display:inline-flex;align-items:center;gap:8px;flex:0 0 auto;color:var(--foreground-secondary)}
        .wisdom-mark{color:var(--accent);font-size:12px}
        .wisdom-title{color:var(--foreground-muted);font-size:12px;font-style:italic}
        .wisdom-copy{font-weight:500}
        .wisdom-separator{margin:0 8px;color:var(--border-strong)}
        .wisdom-language{order:1;flex:0 0 auto}
        @media(min-width:640px){.wisdom-layout{flex-direction:row;align-items:center;justify-content:space-between}.wisdom-panel{order:1}.wisdom-language{order:2}}
        @media(prefers-reduced-motion:reduce){.wisdom-ticker{animation:none}}
      `}</style>

      <div className="wisdom-layout" dir={isArabic ? 'rtl' : 'ltr'}>
        {/* شريط النصائح */}
        <div className="wisdom-panel">
          <div className="wisdom-ticker">
            {allTips.map((tip, index) => (
              <span key={`${index}`} className="wisdom-item">
                <span className="wisdom-mark">✦</span>
                <span className="wisdom-title">
                  {isArabic ? tip.titleAr : tip.titleEn}:
                </span>
                <span className="wisdom-copy">
                  {isArabic ? tip.contentAr : tip.contentEn}
                </span>
                <span className="wisdom-separator" aria-hidden="true">|</span>
              </span>
            ))}
          </div>
        </div>

        {/* اختيار اللغة */}
        {showLanguageSelector && onLanguageChange && (
          <div className="wisdom-language">
            <LanguageSwitcher value={language} onChange={onLanguageChange} variant="light" compact />
          </div>
        )}
      </div>
    </>
  );
}
