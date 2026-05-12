'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calculator, PiggyBank, TrendingUp, Heart, Lightbulb, Printer, RefreshCw, Coins, Wallet, Sparkles } from 'lucide-react';

interface SalaryBreakdown {
  expenses: number;
  savings: number;
  investment: number;
  charity: number;
}

interface Advice {
  category: string;
  tip: string;
  icon: string;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

const ARABIC_ADVICE: Advice[] = [
  { category: 'المصروفات', tip: 'حاول الالتزام بـ 70% من راتبك للمصروفات الأساسية. قلل من المصاريف غير الضرورية', icon: '💰' },
  { category: 'المدخرات', tip: 'لا تلمس مدخراتك في الطوارئ. اجعلها في حساب منفصل يصعب الوصول إليه', icon: '🏦' },
  { category: 'الاستثمار', tip: 'ابدأ بالاستثمار مبكراً حتى لو بمبالغ صغيرة. الفائدة المركبة تعمل لصالحك', icon: '📈' },
  { category: 'الصدقة', tip: 'الصدقة تطفئ غضب الرب وتبارك في الرزق. حتى المبلغ الصغير له قيمة', icon: '🤲' },
  { category: 'الدين', tip: 'إذا كنت مديناً، اعمل على سداد الديون أولاً قبل التفكير في الاستثمار', icon: '⚖️' },
  { category: 'التأمين', tip: 'تأكد من وجود تأمين صحي وتأمين حياة يحميك وعائلتك', icon: '🛡️' },
  { category: 'التقاعد', tip: 'خصص نسبة من دخلك للتقاعد مبكراً. كلما بدأت أبكر كلما كان أفضل', icon: '🌴' },
  { category: 'التعليم', tip: 'استثمر في تطوير مهاراتك التعليمية. المعرفة أفضل استثمار', icon: '📚' },
];

export default function SalaryManager() {
  const [salary, setSalary] = useState<string>('');
  const [salaryNumber, setSalaryNumber] = useState<number>(0);
  const [charityPercentage, setCharityPercentage] = useState<number>(0);
  const [includeCharity, setIncludeCharity] = useState<boolean>(false);
  const [userNotes, setUserNotes] = useState<string>('');
  const [showAdvice, setShowAdvice] = useState<boolean>(false);
  const [breakdown, setBreakdown] = useState<SalaryBreakdown>({
    expenses: 0,
    savings: 0,
    investment: 0,
    charity: 0,
  });
  const [randomAdvice, setRandomAdvice] = useState<Advice | null>(null);

  const calculateBreakdown = useCallback(() => {
    const baseAmount = salaryNumber;
    if (baseAmount <= 0) {
      setBreakdown({ expenses: 0, savings: 0, investment: 0, charity: 0 });
      return;
    }

    let expenses = baseAmount * 0.7;
    let savings = baseAmount * 0.2;
    let investment = baseAmount * 0.1;
    let charity = 0;

    if (includeCharity && charityPercentage > 0) {
      charity = baseAmount * (charityPercentage / 100);
      expenses = expenses * (1 - charityPercentage / 100);
      savings = savings * (1 - charityPercentage / 100);
      investment = investment * (1 - charityPercentage / 100);
    }

    setBreakdown({
      expenses: Math.round(expenses * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      investment: Math.round(investment * 100) / 100,
      charity: Math.round(charity * 100) / 100,
    });
  }, [salaryNumber, includeCharity, charityPercentage]);

  useEffect(() => {
    calculateBreakdown();
  }, [calculateBreakdown]);

  useEffect(() => {
    const num = parseFloat(salary.replace(/[^\d.]/g, ''));
    setSalaryNumber(isNaN(num) ? 0 : num);
  }, [salary]);

  const getRandomAdvice = () => {
    const randomIndex = Math.floor(Math.random() * ARABIC_ADVICE.length);
    setRandomAdvice(ARABIC_ADVICE[randomIndex]);
    setShowAdvice(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getChartData = () => {
    const data = [
      { name: 'المصروفات', value: breakdown.expenses, color: COLORS[0] },
      { name: 'المدخرات', value: breakdown.savings, color: COLORS[1] },
      { name: 'الاستثمار', value: breakdown.investment, color: COLORS[2] },
    ];
    if (includeCharity && breakdown.charity > 0) {
      data.push({ name: 'الصدقة', value: breakdown.charity, color: COLORS[3] });
    }
    return data;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setSalary('');
    setSalaryNumber(0);
    setCharityPercentage(0);
    setIncludeCharity(false);
    setUserNotes('');
    setShowAdvice(false);
    setRandomAdvice(null);
  };

  const getAIAdvice = (): string => {
    if (salaryNumber === 0) return 'أدخل راتبك للحصول على نصائح مالية مخصصة';

    if (salaryNumber < 2000) {
      return 'مع راتبك الحالي، ركز على تقليل المصاريف قدر الإمكان. حاول توفير 20% على الأقل وتجنب الديون. ابحث عن مصادر دخل إضافية.';
    } else if (salaryNumber < 5000) {
      return 'راتبك جيد. ابدأ صندوق طوارئ يسد 3-6 أشهر من مصاريفك. استثمر في تطوير مهاراتك لزيادة دخلك.';
    } else if (salaryNumber < 10000) {
      return 'لديك مرونة جيدة. نوّع استثماراتك بين صناديق الاستثمار وشهادات الادخار. فكر في التأمين الصحي الشامل.';
    } else {
      return 'ممتاز! فكر في استشارة مالية متخصصة. وزّع استثماراتك في عدة فئات. تبرع بنسبة من دخلك للأعمال الخيرية.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-3">
            <Calculator className="w-10 h-10" />
            مدير الراتب الذكي
          </h1>
          <p className="text-muted-foreground text-lg">
            قسّم راتبك بذكاء: 70% مصروفات | 20% مدخرات | 10% استثمار
          </p>
        </div>

        {/* Salary Input Card */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="bg-emerald-50 dark:bg-emerald-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Coins className="w-6 h-6" />
              أدخل راتبك الشهري
            </CardTitle>
            <CardDescription>سيتم تقسيم الراتب تلقائياً حسب النسب المحددة</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salary" className="text-lg font-medium">الراتب الشهري</Label>
              <div className="relative">
                <Input
                  id="salary"
                  type="text"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="مثال: 5000"
                  className="text-xl font-bold text-center h-14 text-input text-lg"
                  dir="ltr"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  ر.س
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charity Section */}
        <Card className="border-rose-200 dark:border-rose-800">
          <CardHeader className="bg-rose-50 dark:bg-rose-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <Heart className="w-6 h-6" />
              التبرع والصدقة
            </CardTitle>
            <CardDescription>خصص نسبة من راتبك للتبرع والصدقة</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="charity-toggle" className="text-lg font-medium cursor-pointer">
                تفعيل التبرع من الراتب
              </Label>
              <Switch
                id="charity-toggle"
                checked={includeCharity}
                onCheckedChange={setIncludeCharity}
              />
            </div>
            {includeCharity && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center">
                  <Label className="font-medium">نسبة التبرع: {charityPercentage}%</Label>
                </div>
                <Slider
                  value={[charityPercentage]}
                  onValueChange={(value) => setCharityPercentage(value[0])}
                  max={20}
                  min={0}
                  step={1}
                  className="py-2"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>0%</span>
                  <span>5%</span>
                  <span>10%</span>
                  <span>15%</span>
                  <span>20%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Chart */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader className="bg-emerald-50 dark:bg-emerald-900/30 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <PieChart className="w-6 h-6" />
                التوزيع البياني
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {salaryNumber > 0 ? (
                <div className="space-y-4">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getChartData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={true}
                        >
                          {getChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value) + ' ر.س'}
                          contentStyle={{ direction: 'rtl' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    {getChartData().map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <PieChart className="w-16 h-16 mx-auto opacity-50" />
                    <p>أدخل الراتب لرؤية التوزيع</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Breakdown Cards */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader className="bg-emerald-50 dark:bg-emerald-900/30 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Wallet className="w-6 h-6" />
                تفاصيل التقسيم
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Expenses */}
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="font-semibold text-green-700 dark:text-green-400">المصروفات</span>
                  </div>
                  <span className="font-bold text-lg text-green-600 dark:text-green-400">
                    70%
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                  {formatCurrency(breakdown.expenses)} ر.س
                </p>
              </div>

              {/* Savings */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="font-semibold text-blue-700 dark:text-blue-400">المدخرات</span>
                  </div>
                  <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    20%
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                  {formatCurrency(breakdown.savings)} ر.س
                </p>
              </div>

              {/* Investment */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="font-semibold text-amber-700 dark:text-amber-400">الاستثمار</span>
                  </div>
                  <span className="font-bold text-lg text-amber-600 dark:text-amber-400">
                    10%
                  </span>
                </div>
                <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                  {formatCurrency(breakdown.investment)} ر.س
                </p>
              </div>

              {/* Charity */}
              {includeCharity && breakdown.charity > 0 && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/30 rounded-xl border border-rose-200 dark:border-rose-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="font-semibold text-rose-700 dark:text-rose-400">الصدقة</span>
                    </div>
                    <span className="font-bold text-lg text-rose-600 dark:text-rose-400">
                      {charityPercentage}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-rose-800 dark:text-rose-300">
                    {formatCurrency(breakdown.charity)} ر.س
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Advice Section */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-purple-50 dark:bg-purple-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Sparkles className="w-6 h-6" />
              نصائح الذكاء الاصطناعي
            </CardTitle>
            <CardDescription>نصائح مالية مخصصة بناءً على راتبك</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl border border-purple-200 dark:border-purple-800">
              <p className="text-lg leading-relaxed text-purple-900 dark:text-purple-100">
                {getAIAdvice()}
              </p>
            </div>
            <Button
              onClick={getRandomAdvice}
              variant="outline"
              className="w-full border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900"
            >
              <Lightbulb className="w-5 h-5 ms-2" />
              احصل على نصيحة عشوائية
            </Button>
            {showAdvice && randomAdvice && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{randomAdvice.icon}</span>
                  <div>
                    <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-1">
                      {randomAdvice.category}
                    </h4>
                    <p className="text-amber-900 dark:text-amber-100">
                      {randomAdvice.tip}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-400">
              <Lightbulb className="w-6 h-6" />
              ملاحظاتك الشخصية
            </CardTitle>
            <CardDescription>أضف ملاحظاتك أو أهدافك المالية</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="مثال: أريد توفير مبلغ لشراء سيارة خلال 6 أشهر..."
              className="min-h-[120px] text-base"
              dir="rtl"
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            onClick={handlePrint}
            variant="outline"
            size="lg"
            className="border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900"
          >
            <Printer className="w-5 h-5 ms-2" />
            طباعة / تصدير
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            className="border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className="w-5 h-5 ms-2" />
            إعادة تعيين
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>مدير الراتب الذكي - ساعدك على تحقيق أهدافك المالية</p>
        </div>
      </div>
    </div>
  );
}
