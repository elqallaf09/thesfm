const params = new URLSearchParams(window.location.search);
const rawSymbolParam = params.get("symbol") || "";
const symbol = normalizeDetailSymbol(rawSymbolParam);
const NUMBER_LOCALE = "ar-KW-u-nu-latn";
const NUMBER_OPTIONS = { numberingSystem: "latn" };
const APP_SETTINGS_STORAGE_KEY = "the-sfm-trader-settings";
const DETAIL_TEXT_TRANSLATIONS = {
  "تفاصيل السهم - the-sfm trader": "Stock details - the-sfm trader",
  "صفحة تحليل السهم": "Stock analysis page",
  "رجوع للأسواق": "Back to markets",
  "تحميل التحليل": "Loading analysis",
  "تنبيه لحظي": "Live alert",
  "يتم تجهيز التوصية.": "Preparing the recommendation.",
  "السعر الحالي": "Current price",
  "السعر المتوقع": "Expected price",
  "هدف 1": "Target 1",
  "هدف 2": "Target 2",
  "وقف الخسارة": "Stop loss",
  "الدعم": "Support",
  "المقاومة": "Resistance",
  "الحركة المتوقعة": "Expected move",
  "المدة": "Duration",
  "السكور": "Score",
  "المخاطرة": "Risk",
  "جودة التحليل": "Analysis quality",
  "صحة البيانات": "Data health",
  "معلومات عامة": "General information",
  "ما هو السهم؟": "What is this stock?",
  "الشرعية": "Sharia",
  "التوافق الشرعي": "Sharia compliance",
  "من دقيقة إلى شهر": "From 1 minute to 1 month",
  "تحليل الفريمات": "Timeframe analysis",
  "تجميع سريع يوضح هل الفريمات القصيرة والطويلة متفقة أو متضاربة.": "A quick summary showing whether short and long timeframes agree or conflict.",
  "التوقعات": "Outlook",
  "الأهداف القادمة": "Upcoming targets",
  "الأسباب": "Reasons",
  "لماذا هذه التوصية؟": "Why this recommendation?",
  "الرسم المختصر": "Mini chart",
  "حركة السعر الأخيرة": "Recent price action",
  "رسم حركة السعر": "Price movement chart",
  "اختبار خلفي": "Backtest",
  "جودة الإشارة": "Signal quality",
  "\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062f \u0631\u0645\u0632 \u0627\u0644\u0633\u0647\u0645.": "No stock symbol was selected.",
  "\u062c\u0627\u0631\u064a \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0633\u0647\u0645": "Analyzing the stock",
  "تعذر تحميل تفاصيل السهم": "Could not load stock details",
  "\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062e\u0632\u0646\u0629 \u0644\u062d\u0638\u064a\u0627\u064b": "Live cached data",
  "تحليل جديد": "Fresh analysis",
  "لا تتوفر معلومات وصفية كافية لهذا الرمز.": "Not enough descriptive information is available for this symbol.",
  "ثقة": "confidence",
  "توافق الفريمات": "Timeframe agreement",
  "تغطية": "coverage",
  "الاختصاص": "Specialty",
  "السوق": "Market",
  "المنطقة": "Region",
  "البورصة": "Exchange",
  "العملة": "Currency",
  "حالة السوق": "Market status",
  "ملاحظة المزود": "Provider note",
  "حجم التداول النسبي": "Relative volume",
  "غير معروف": "Unknown",
  "لا يوجد تصنيف شرعي مؤكد.": "No confirmed Sharia rating is available.",
  "مطابق للشريعة": "Sharia compliant",
  "غير مطابق للشريعة": "Not Sharia compliant",
  "مختلف عليه شرعياً": "Sharia status is disputed",
  "المصدر": "Source",
  "تصنيف داخلي قابل للتحديث": "Internal rating, subject to updates",
  "آخر مراجعة": "Last review",
  "الفريمات غير مكتملة لهذا الرمز حالياً.": "Timeframes are currently incomplete for this symbol.",
  "الثقة": "Confidence",
  "الزخم": "Momentum",
  "الاتجاه": "Trend",
  "لا توجد أهداف شهرية متاحة لهذا الرمز.": "No monthly targets are available for this symbol.",
  "لا توجد أسباب كافية لهذا الرمز حالياً.": "No sufficient reasons are available for this symbol right now.",
  "معدل النجاح": "Win rate",
  "عدد العينات": "Samples",
  "أفق الاختبار": "Test horizon",
  "يوم": "days",
  "متوسط العائد": "Average return",
  "خطة التنفيذ": "Execution plan",
  "ملاحظات المخاطرة": "Risk notes",
  "اشتر الآن": "Buy now",
  "إشارة شراء قوية": "Strong buy signal",
  "الفريمات متوافقة بنسبة": "Timeframes agree by",
  "والثقة": "and confidence",
  "راقب السعر والهدف قبل التنفيذ.": "Watch price and target before execution.",
  "بيع الآن": "Sell now",
  "إشارة بيع واضحة": "Clear sell signal",
  "الاتجاه يميل للبيع بثقة": "The trend leans sell with confidence",
  "تجنب الدخول الشرائي حتى تتغير الفريمات.": "Avoid long entry until the timeframes change.",
  "انتظر": "Wait",
  "لا تتداول هذا السهم الآن": "Do not trade this stock now",
  "الإشارات غير كافية أو متضاربة. الأفضل الانتظار حتى تتوافق فريمات الدخول مع اليومي.": "Signals are insufficient or conflicting. It is better to wait until entry timeframes align with the daily.",
  "تعذر التحميل": "Loading failed",
  "قوي جداً": "Very strong",
  "قوي": "Strong",
  "متوسط": "Medium",
  "ضعيف": "Weak"
};
const DETAIL_EXTRA_TEXT_TRANSLATIONS = {
  "تحديث الصفحة الآن": "Refresh page now",
  "النفط والطاقة": "Oil and energy",
  "يحتاج تدقيق شرعي": "Requires Sharia review",
  "يحتاج مراجعة شرعية": "Requires Sharia review",
  "عقد سلعي يحتاج تحقق شرعي": "Commodity contract requires Sharia review",
  "لا يوجد تصنيف شرعي مؤكد لهذا الرمز داخل التطبيق حالياً": "No confirmed Sharia classification is available for this symbol in the app right now",
  "لا يوجد تصنيف شرعي مؤكد لهذا الرمز داخل التطبيق حالياً.": "No confirmed Sharia classification is available for this symbol in the app right now.",
  "التصنيف الداخلي قابل للتحديث": "Internal classification may be updated",
  "تصنيف داخلي قابل للتحديث": "Internal classification may be updated",
  "تصنيف محلي مبني على مراجع فحص شرعي عامة، ويحتاج تحديث دوري": "Local classification based on general Sharia screening references and requiring periodic updates",
  "مصنف داخلياً كمتوافق مع الشريعة حسب البيانات المتاحة في التطبيق.": "Internally classified as Sharia compliant based on the data available in the app.",
  "مصنف داخلياً كغير متوافق مع الشريعة، ويفضل تجنبه إذا كان شرطك الالتزام الشرعي.": "Internally classified as not Sharia compliant; it is better to avoid it if Sharia compliance is required.",
  "التصنيف الشرعي غير محسوم في بيانات التطبيق ويحتاج مراجعة جهة فحص شرعي.": "The Sharia classification is not conclusive in the app data and requires review by a Sharia screening provider.",
  "مختلف عليه": "Disputed",
  "مختلف عليه شرعياً": "Disputed Sharia status",
  "مخاطرة مرتفعة": "High risk",
  "مخاطرة عالية": "High risk",
  "مخاطرة متوسطة": "Medium risk",
  "مخاطرة منخفضة": "Low risk",
  "صاعد": "Bullish",
  "صاعدة": "Bullish",
  "هابط": "Bearish",
  "هابطة": "Bearish",
  "مختلط": "Mixed",
  "عرضي": "Sideways",
  "محايد": "Neutral",
  "ممتازة": "Excellent",
  "قوية": "Strong",
  "متوسطة": "Medium",
  "طبيعية": "Normal",
  "طبيعي": "Normal",
  "مرتفع": "High",
  "منخفض": "Low",
  "منخفضة": "Low",
  "ضعيفة": "Weak",
  "بيانات غير كافية": "Insufficient data",
  "تجنب الصفقة الآن": "Avoid this trade now",
  "فرصة شراء مشروطة": "Conditional buy opportunity",
  "ضغط بيعي واضح": "Clear selling pressure",
  "انتظار تأكيد": "Wait for confirmation",
  "اشتر": "Buy",
  "لا تتداول": "Do not trade",
  "لا توجد صفقة واضحة؛ انتظار توافق الفريمات.": "No clear trade is available; wait for timeframe agreement.",
  "لا توجد صفقة واضحة؛ انتظار توافق الفريمات": "No clear trade is available; wait for timeframe agreement",
  "الإشارة غير كافية للدخول. الأفضل انتظار توافق الفريمات السريعة مع اليومي.": "The signal is not strong enough for entry. It is better to wait for the fast timeframes to align with the daily.",
  "المخاطرة عالية مقارنة بجودة الإشارة.": "Risk is high compared with signal quality.",
  "المخاطرة عالية مقارنة بجودة الإشارة": "Risk is high compared with signal quality",
  "انتظار حتى يتوافق 15 دقيقة + الساعة + اليوم": "Wait until the 15-minute, hourly, and daily timeframes align",
  "15 دقيقة إلى 4 أسابيع": "15 minutes to 4 weeks",
  "1 يوم إلى 6 أسابيع": "1 day to 6 weeks",
  "3 إلى 10 أيام": "3 to 10 days",
  "العائد إلى المخاطرة غير مكتمل": "Risk/reward ratio is incomplete",
  "لا توجد أخبار اقتصادية مؤثرة قريبة على هذا الرمز.": "No nearby high-impact economic events are affecting this symbol.",
  "انتظار حتى يهدأ تأثير الخبر ثم إعادة قراءة الشارت": "Wait until the news impact settles, then reread the chart",
  "انتظار حتى تتحسن جودة البيانات ويتوافق اليومي مع الفريمات السريعة": "Wait until data quality improves and the daily timeframe aligns with the fast timeframes",
  "خطة الصفقة غير مكتملة لأن العائد مقابل المخاطرة غير واضح.": "The trade plan is incomplete because the risk/reward ratio is unclear.",
  "العائد مقابل المخاطرة ضعيف؛ تم إلغاء إشارة الدخول.": "The risk/reward ratio is weak, so the entry signal was cancelled.",
  "العائد مقابل المخاطرة مقبول بصعوبة، لذلك الثقة محدودة.": "The risk/reward ratio is barely acceptable, so confidence is limited.",
  "تفاوت السعر بين الفريمات مرتفع؛ تم تحويل القرار إلى انتظار حتى تتطابق البيانات.": "Price variance across timeframes is high, so the decision was changed to wait until the data aligns.",
  "جودة البيانات منخفضة؛ لا توجد ثقة كافية لإصدار شراء أو بيع الآن.": "Data quality is low; there is not enough confidence to issue a buy or sell signal now.",
  "الفريم اليومي يعاكس قرار الفريمات الأخرى؛ الأفضل انتظار تأكيد أوضح.": "The daily timeframe conflicts with the other timeframes, so it is better to wait for clearer confirmation.",
  "السعر أعلى من متوسط 20 يوم": "Price is above the 20-day average",
  "السعر أدنى من متوسط 20 يوم": "Price is below the 20-day average",
  "الاتجاه فوق متوسط 50 يوم": "Trend is above the 50-day average",
  "الاتجاه تحت متوسط 50 يوم": "Trend is below the 50-day average",
  "متوسط 20 يوم أعلى من متوسط 50 يوم": "The 20-day average is above the 50-day average",
  "متوسط 20 يوم أقل من متوسط 50 يوم": "The 20-day average is below the 50-day average",
  "MACD إيجابي": "MACD is positive",
  "MACD سلبي": "MACD is negative",
  "السعر فوق VWAP: المشترون أقوى": "Price is above VWAP: buyers are stronger",
  "السعر تحت VWAP: ضغط بيعي": "Price is below VWAP: selling pressure",
  "زخم شهر إيجابي": "One-month momentum is positive",
  "زخم شهر سلبي": "One-month momentum is negative",
  "RSI منخفض: احتمال ارتداد": "RSI is low: possible rebound",
  "RSI مرتفع: احتمال جني أرباح": "RSI is high: possible profit-taking",
  "RSI في نطاق محايد": "RSI is in a neutral range",
  "النشاط أعلى من المعتاد": "Activity is above normal",
  "حجم تداول لحظي أعلى من المتوسط": "Intraday volume is above average",
  "حجم التداول ضعيف": "Trading volume is weak",
  "التذبذب مرتفع نسبيا": "Volatility is relatively high",
  "الإشارات متقاربة ولا تعطي أفضلية واضحة": "Signals are close and do not provide a clear edge",
  "لا يوجد تضارب قوي بين الفريمات الأساسية والسريعة": "No strong conflict between core and fast timeframes",
  "فريمات الدخول تدعم القرار": "Entry timeframes support the decision",
  "تذبذب منخفض": "Low volatility",
  "تذبذب متوسط": "Medium volatility",
  "تذبذب مرتفع": "High volatility",
  "الإشارة ليست حادة": "The signal is not sharp",
  "توافق الفريمات متوسط": "Medium timeframe agreement",
  "النشاط أقل من المعتاد": "Activity is below normal",
  "RSI عند طرف قوي": "RSI is at a strong edge",
  "الفريمات السريعة": "Fast timeframes",
  "الفريمات الطويلة": "Long timeframes",
  "يوجد تضارب": "Conflict detected",
  "دقيقة": "1 minute",
  "15 دقيقة": "15 minutes",
  "30 دقيقة": "30 minutes",
  "ساعة": "1 hour",
  "يومي": "Daily",
  "أسبوعي": "Weekly",
  "شهري": "Monthly",
  "سنوي": "Yearly",
  "زوج عملات فوركس": "Forex currency pair",
  "أصل رقمي مشفر": "Crypto asset",
  "سلعة أو عقد آجل": "Commodity or futures contract",
  "مؤشر سوق": "Market index",
  "أداة مالية مدرجة": "Listed financial instrument",
  "عملة رقمية ومخزن قيمة رقمي": "Digital currency and digital store of value",
  "شبكة عقود ذكية وتطبيقات لامركزية": "Smart-contract network and decentralized applications",
  "أصل رقمي لمنظومة تداول وبلوكتشين": "Digital asset for a trading and blockchain ecosystem",
  "شبكة بلوك تشين عالية السرعة": "High-speed blockchain network",
  "مدفوعات وتحويلات رقمية": "Digital payments and transfers",
  "شبكة عقود ذكية": "Smart-contract network",
  "شبكة تطبيقات لامركزية": "Decentralized applications network",
  "أوراكل بيانات للبلوكتشين": "Blockchain data oracle",
  "شبكة ربط بين سلاسل البلوكتشين": "Interoperability network for blockchains",
  "ذهب - عقد آجل": "Gold futures",
  "فضة - عقد آجل": "Silver futures",
  "نفط خام WTI - عقد آجل": "WTI crude oil futures",
  "نفط برنت - عقد آجل": "Brent crude oil futures",
  "غاز طبيعي - عقد آجل": "Natural gas futures",
  "نحاس - عقد آجل": "Copper futures",
  "تقنية استهلاكية وأجهزة ذكية": "Consumer technology and smart devices",
  "برمجيات وحوسبة سحابية وذكاء اصطناعي": "Software, cloud computing, and AI",
  "رقائق رسومية وذكاء اصطناعي": "Graphics chips and AI",
  "معالجات ورقائق حوسبة": "Processors and computing chips",
  "إعلانات رقمية وبحث وسحابة": "Digital advertising, search, and cloud",
  "تجارة إلكترونية وحوسبة سحابية": "E-commerce and cloud computing",
  "سيارات كهربائية وطاقة": "Electric vehicles and energy",
  "شبكات اجتماعية وإعلانات رقمية": "Social networks and digital advertising",
  "مصرفية إسلامية": "Islamic banking",
  "مصرفية تقليدية": "Traditional banking",
  "اتصالات وخدمات رقمية": "Telecom and digital services",
  "أزواج عملات رئيسية. أسعار Yahoo قد تكون متأخرة حسب الزوج.": "Major currency pairs. Yahoo prices may be delayed depending on the pair.",
  "ذهب وفضة ونفط وغاز ونحاس. رموز العقود الآجلة قد تكون متأخرة حسب المزود.": "Gold, silver, oil, gas, and copper. Futures symbols may be delayed depending on the provider.",
  "أسهم أمريكية عالية السيولة من قطاعات التقنية والاستهلاك والصحة والبنوك.": "Highly liquid US stocks from technology, consumer, healthcare, and banking sectors.",
  "Alphabet / Google تعمل في البحث، الإعلانات، YouTube، Android، Google Cloud، وتقنيات الذكاء الاصطناعي.": "Alphabet / Google operates in search, advertising, YouTube, Android, Google Cloud, and AI technologies.",
  "Apple تعمل في iPhone وMac وiPad والخدمات الرقمية ومتجر التطبيقات، وتتداول في السوق الأمريكي.": "Apple operates in iPhone, Mac, iPad, digital services, and the App Store, and trades in the US market.",
  "Microsoft تعمل في أنظمة التشغيل، Azure، Office، الألعاب، وخدمات الذكاء الاصطناعي، وتتداول في السوق الأمريكي.": "Microsoft operates in operating systems, Azure, Office, gaming, and AI services, and trades in the US market.",
  "NVIDIA تقود سوق معالجات الرسوم ومسرعات الذكاء الاصطناعي ومراكز البيانات، وتتداول في السوق الأمريكي.": "NVIDIA leads graphics processors, AI accelerators, and data centers, and trades in the US market.",
  "AMD تعمل في معالجات الحواسيب والخوادم والبطاقات الرسومية ومسرعات الذكاء الاصطناعي، وتتداول في السوق الأمريكي.": "AMD operates in PC and server processors, graphics cards, and AI accelerators, and trades in the US market.",
  "الأسهم الأمريكية": "US stocks",
  "الفوركس": "Forex",
  "العملات الرقمية": "Crypto",
  "السلع": "Commodities",
  "أسواق الخليج": "Gulf country markets",
  "السوق السعودي": "Saudi market",
  "بورصة الكويت": "Kuwait market",
  "السوق الإماراتي": "UAE market",
  "السوق القطري": "Qatar market",
  "السوق البحريني": "Bahrain market",
  "السوق العماني": "Oman market",
  "الأسهم الأوروبية": "European stocks",
  "الأسهم الآسيوية": "Asian stocks",
  "أسهم التقنية": "Technology stocks",
  "الأسهم الغذائية": "Food / consumer staples",
  "الأسهم الدوائية": "Pharmaceutical / healthcare",
  "أسهم البنوك": "Banking stocks",
  "أسهم الطاقة": "Energy stocks",
  "أسهم الذكاء الاصطناعي": "AI stocks",
  "أسهم أشباه الموصلات": "Semiconductor stocks",
  "قائمة مخصصة": "Custom list",
  "رمز مضاف من قائمة المراقبة، وقد يحتاج مزود بيانات يدعمه بشكل مباشر.": "A watchlist symbol that may require a provider with direct support.",
  "السوق مغلق الآن؛ راقب الإشارة عند الافتتاح ولا تدخل قبل ظهور أسعار حية.": "The market is closed now; monitor the signal at the open and do not enter before live prices appear."
};
const detailOriginalTextByNode = new WeakMap();
const DETAIL_TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label"];
const DETAIL_TEXT_TRANSLATION_ENTRIES = Object.entries({ ...DETAIL_TEXT_TRANSLATIONS, ...DETAIL_EXTRA_TEXT_TRANSLATIONS })
  .sort((a, b) => b[0].length - a[0].length);
const DETAIL_COMMON_TERM_TRANSLATIONS = [
  ["غير مطابق", "Not compliant"],
  ["مختلف عليه", "Doubtful"],
  ["مطابق", "Compliant"],
  ["شراء", "Buy"],
  ["بيع", "Sell"],
  ["انتظار", "Wait"],
  ["اشتر الآن", "Buy now"],
  ["بيع الآن", "Sell now"],
  ["ثقة", "confidence"],
  ["تغطية", "coverage"],
  ["الفريمات", "timeframes"],
  ["الأهداف", "targets"],
  ["الهدف", "target"],
  ["السعر", "price"],
  ["السوق", "market"],
  ["التحليل", "analysis"],
  ["المخاطرة", "risk"],
  ["منخفضة", "low"],
  ["متوسطة", "medium"],
  ["عالية", "high"],
  ["قوي جداً", "very strong"],
  ["قوي", "strong"],
  ["متوسط", "medium"],
  ["ضعيف", "weak"],
  ["يوم", "days"],
  ["شهر", "month"],
  ["شهرين", "2 months"],
  ["3 شهور", "3 months"]
].sort((a, b) => b[0].length - a[0].length);
const DETAIL_ENGLISH_PHRASE_TO_ARABIC = [
  [/\bCompliant\s+للشريعة/gi, "مطابق للشريعة"],
  [/\bNot\s+compliant\s+للشريعة/gi, "غير مطابق للشريعة"],
  [/\bDoubtful\s+للشريعة/gi, "مختلف عليه شرعياً"],
  [/\blow\s+مخاطرة/gi, "مخاطرة منخفضة"],
  [/\bmedium\s+مخاطرة/gi, "مخاطرة متوسطة"],
  [/\bhigh\s+مخاطرة/gi, "مخاطرة مرتفعة"],
  [/\bMarket\s+الأمريكي/gi, "السوق الأمريكي"],
  [/\bmarket\s+الأمريكي/gi, "السوق الأمريكي"],
  [/ضغط\s*Sell\s*ي/gi, "ضغط بيعي"],
  [/زخم\s*Sell\s*ي/gi, "زخم بيعي"],
  [/اتجاه\s*Sell\s*ي/gi, "اتجاه بيعي"],
  [/ضغط\s*Buy\s*ي/gi, "ضغط شرائي"],
  [/زخم\s*Buy\s*ي/gi, "زخم شرائي"],
  [/اتجاه\s*Buy\s*ي/gi, "اتجاه شرائي"],
  [/\bSell\s*ي/gi, "بيعي"],
  [/\bBuy\s*ي/gi, "شرائي"]
];
const DETAIL_ENGLISH_TERM_TO_ARABIC = [
  ["Strong sell signal", "إشارة بيع قوية"],
  ["Strong buy signal", "إشارة شراء قوية"],
  ["Clear sell signal", "إشارة بيع واضحة"],
  ["Do not trade this stock now", "لا تتداول هذا السهم الآن"],
  ["Timeframe agreement", "توافق الفريمات"],
  ["Risk notes", "ملاحظات المخاطرة"],
  ["Provider note", "ملاحظة المزود"],
  ["Market status", "حالة السوق"],
  ["Relative volume", "حجم التداول النسبي"],
  ["Analysis quality", "جودة التحليل"],
  ["Data health", "صحة البيانات"],
  ["Execution plan", "خطة التنفيذ"],
  ["Average return", "متوسط العائد"],
  ["Test horizon", "أفق الاختبار"],
  ["Win rate", "معدل النجاح"],
  ["Very strong", "قوي جداً"],
  ["Strong Sell", "بيع قوي"],
  ["Strong Buy", "شراء قوي"],
  ["Not compliant", "غير مطابق"],
  ["Compliant", "مطابق"],
  ["Doubtful", "مختلف عليه"],
  ["Sell now", "بيع الآن"],
  ["Buy now", "اشتر الآن"],
  ["Sideways", "عرضي"],
  ["Bullish", "صاعد"],
  ["Bearish", "هابط"],
  ["Neutral", "محايد"],
  ["Americas", "الأمريكيتان"],
  ["America", "أمريكا"],
  ["Europe", "أوروبا"],
  ["Asia", "آسيا"],
  ["Gulf", "الخليج"],
  ["Global", "عالمي"],
  ["Confidence", "الثقة"],
  ["confidence", "الثقة"],
  ["coverage", "التغطية"],
  ["timeframes", "الفريمات"],
  ["timeframe", "الفريم"],
  ["targets", "الأهداف"],
  ["target", "الهدف"],
  ["price", "السعر"],
  ["Market", "السوق"],
  ["market", "السوق"],
  ["Exchange", "البورصة"],
  ["Region", "المنطقة"],
  ["Currency", "العملة"],
  ["Source", "المصدر"],
  ["Risk", "المخاطرة"],
  ["risk", "المخاطرة"],
  ["Strong", "قوي"],
  ["strong", "قوي"],
  ["Medium", "متوسط"],
  ["medium", "متوسط"],
  ["Weak", "ضعيف"],
  ["weak", "ضعيف"],
  ["High", "مرتفع"],
  ["high", "مرتفع"],
  ["Low", "منخفض"],
  ["low", "منخفض"],
  ["Buy", "شراء"],
  ["buy", "شراء"],
  ["Sell", "بيع"],
  ["sell", "بيع"],
  ["Hold", "انتظار"],
  ["hold", "انتظار"],
  ["Wait", "انتظار"],
  ["wait", "انتظار"],
  ["Trend", "الاتجاه"],
  ["trend", "الاتجاه"]
].sort((a, b) => b[0].length - a[0].length);
const DETAIL_ACTION_LABELS = {
  buy: { ar: "شراء", en: "Buy" },
  sell: { ar: "بيع", en: "Sell" },
  hold: { ar: "انتظار", en: "Wait" }
};
const DETAIL_SHARIA_LABELS = {
  compliant: { ar: "متوافق شرعياً", en: "Sharia compliant" },
  non_compliant: { ar: "غير متوافق شرعياً", en: "Non-compliant" },
  not_compliant: { ar: "غير متوافق شرعياً", en: "Non-compliant" },
  review_required: { ar: "يحتاج مراجعة", en: "Review required" },
  doubtful: { ar: "يحتاج مراجعة", en: "Review required" },
  unknown: { ar: "يحتاج مراجعة", en: "Review required" },
  unsupported: { ar: "غير منطبق", en: "Not applicable" }
};
const DETAIL_SHARIA_DESCRIPTIONS = {
  compliant: {
    ar: "مصنف كمتوافق شرعياً حسب البيانات المتاحة في التطبيق.",
    en: "Internally classified as Sharia compliant based on the data available in the app."
  },
  non_compliant: {
    ar: "مصنف كغير متوافق شرعياً حسب البيانات المتاحة، ويحتاج إلى مراجعة قبل اتخاذ أي قرار.",
    en: "Classified as non-compliant based on available data and should be reviewed before any decision."
  },
  not_compliant: {
    ar: "مصنف كغير متوافق شرعياً حسب البيانات المتاحة، ويحتاج إلى مراجعة قبل اتخاذ أي قرار.",
    en: "Classified as non-compliant based on available data and should be reviewed before any decision."
  },
  review_required: {
    ar: "لا يوجد تصنيف شرعي موثق لهذا الرمز داخل التطبيق حالياً، لذلك يحتاج إلى مراجعة وفق المعايير الشرعية المعتمدة.",
    en: "No verified Sharia classification is available for this symbol in the app right now, so it requires review under approved Sharia standards."
  },
  doubtful: {
    ar: "لا يوجد تصنيف شرعي موثق لهذا الرمز داخل التطبيق حالياً، لذلك يحتاج إلى مراجعة وفق المعايير الشرعية المعتمدة.",
    en: "No verified Sharia classification is available for this symbol in the app right now, so it requires review under approved Sharia standards."
  },
  unknown: {
    ar: "لا يوجد تصنيف شرعي موثق لهذا الرمز داخل التطبيق حالياً، لذلك يحتاج إلى مراجعة وفق المعايير الشرعية المعتمدة.",
    en: "No verified Sharia classification is available for this symbol in the app right now, so it requires review under approved Sharia standards."
  },
  unsupported: {
    ar: "هذا النوع من الأدوات لا يملك تصنيف أسهم شرعي داخل التطبيق حالياً.",
    en: "This instrument type does not currently have stock Sharia screening in the app."
  }
};
const DETAIL_SHARIA_REASON_LABELS = {
  prohibited_business_activity: { ar: "نشاط رئيسي غير متوافق", en: "Core business activity is not compliant" },
  financial_ratio_threshold: { ar: "تجاوز النسب المالية المعتمدة", en: "Approved financial ratios were exceeded" },
  interest_bearing_debt_threshold: { ar: "ارتفاع الديون ذات الفائدة", en: "Interest-bearing debt threshold exceeded" },
  non_permissible_income_threshold: { ar: "تجاوز نسبة الإيرادات غير المتوافقة", en: "Non-permissible income threshold exceeded" },
  insufficient_financial_data: { ar: "بيانات غير مكتملة", en: "Incomplete financial data" },
  classification_expired: { ar: "التصنيف قديم ويحتاج إلى تحديث", en: "Classification is outdated and needs review" },
  source_unavailable: { ar: "المصدر غير متاح", en: "Source unavailable" },
  conflicting_sources: { ar: "توجد نتائج متعارضة", en: "Conflicting source results" },
  not_yet_reviewed: { ar: "لا يوجد تصنيف موثق", en: "No verified classification is available" },
  other_verified_reason: { ar: "سبب آخر موثق", en: "Other verified reason" }
};
const DETAIL_SHARIA_DISCLAIMER = {
  ar: "التصنيف الشرعي إرشادي وقد يتغير مع تحديث البيانات المالية أو اختلاف المعايير المعتمدة. يُنصح بالرجوع إلى جهة شرعية مختصة قبل اتخاذ القرار الاستثماري.",
  en: "The Sharia classification is indicative and may change with updated financial data or different standards. Consult a qualified Sharia authority before making an investment decision."
};
const DETAIL_RISK_LABELS = {
  low: { ar: "مخاطرة منخفضة", en: "Low risk" },
  medium: { ar: "مخاطرة متوسطة", en: "Medium risk" },
  high: { ar: "مخاطرة عالية", en: "High risk" }
};
const DETAIL_SCORE_LABELS = {
  veryStrong: { ar: "قوي جداً", en: "Very strong" },
  strong: { ar: "قوي", en: "Strong" },
  medium: { ar: "متوسط", en: "Medium" },
  weak: { ar: "ضعيف", en: "Weak" }
};
const DETAIL_TIMEFRAME_LABELS = {
  "1m": { ar: "دقيقة", en: "1 minute" },
  "15m": { ar: "15 دقيقة", en: "15 minutes" },
  "30m": { ar: "30 دقيقة", en: "30 minutes" },
  "1h": { ar: "ساعة", en: "1 hour" },
  "1d": { ar: "يومي", en: "Daily" },
  "1wk": { ar: "أسبوعي", en: "Weekly" },
  "1mo": { ar: "شهري", en: "Monthly" },
  "1y": { ar: "سنوي", en: "Yearly" }
};
const DETAIL_REGION_TRANSLATIONS = {
  Americas: "Americas",
  America: "America",
  Europe: "Europe",
  Asia: "Asia",
  GCC: "Gulf country markets",
  FX: "FX",
  Crypto: "Crypto",
  Commodities: "Commodities",
  Technology: "Technology",
  "Consumer Staples": "Consumer staples",
  Healthcare: "Healthcare",
  Financials: "Financials",
  Energy: "Energy",
  "AI / Cloud": "AI / Cloud",
  Semiconductors: "Semiconductors",
  Global: "Global",
  Custom: "Custom"
};
const DETAIL_ARABIC_PHRASE_PATTERNS = [
  [/راقب دخول قريب من\s+([\d.,]+)\.\s+الهدف الأول\s+([\d.,]+)\s+ووقف\s+(?:الخطر|الخسارة)\s+([\d.,]+)\./g, (_, entry, target, stop) => `Watch for an entry near ${entry}. First target ${target} and stop loss ${stop}.`],
  [/الإشارة تميل للبيع\. الهدف الأول\s+([\d.,]+)\s+ووقف الخطر\s+([\d.,]+)\./g, (_, target, stop) => `The signal leans sell. First target ${target} and risk stop ${stop}.`],
  [/^(.+?)\s+زوج عملات في سوق\s+(?:الفوركس|Forex)، ويتأثر بأسعار الفائدة، السيولة، وقوة العملات بين البلدين\.$/g, (_, name) => `${name} is a forex currency pair affected by interest rates, liquidity, and the relative strength of both currencies.`],
  [/^(.+?)\s+عقد آجل أو أصل سلعي يتداول في أسواق\s+(?:السلع|Commodities)\. يحتاج متابعة وقت الجلسة، السيولة، الأخبار الاقتصادية، وإدارة مخاطرة صارمة لأن الحركة قد تكون سريعة\.$/g, (_, name) => `${name} is a futures or commodity instrument traded in commodity markets. It requires monitoring session timing, liquidity, economic news, and strict risk management because moves can be fast.`],
  [/^(.+?)\s+أصل رقمي يتداول مقابل الدولار في سوق العملات الرقمية\. يتحرك عادة بتذبذب مرتفع ويتأثر بالسيولة، اتجاه Bitcoin، شهية المخاطرة، وأخبار التنظيم والمنصات\.$/g, (_, name) => `${name} is a digital asset traded against the US dollar in the crypto market. It usually moves with high volatility and is affected by liquidity, Bitcoin direction, risk appetite, and regulation or exchange news.`],
  [/^(.+?)\s+مؤشر يقيس حركة مجموعة من الأسهم داخل سوق أو قطاع محدد\. المؤشرات لا تمثل سهماً واحداً، لذلك تحليلها يعتمد على اتجاه السوق العام، السيولة، الأخبار الاقتصادية، وحركة الشركات القيادية داخل المؤشر\.$/g, (_, name) => `${name} is an index that tracks a group of stocks inside a market or sector. Index analysis depends on broad market direction, liquidity, economic news, and leading constituents.`],
  [/^(.+?)\s+رمز مالي يتداول في السوق المرتبط به\. للحصول على وصف تفصيلي أدق، اربطه بمزود بيانات أساسي أو ملف معلومات شركات\.$/g, (_, name) => `${name} is a listed financial instrument traded in its related market. For a more detailed description, connect it to a fundamental data provider or company profile source.`],
  [/القرار النهائي\s+(شراء|بيع|انتظار)\s+بعد دمج\s+(\d+)\s+فريمات من أصل\s+(\d+)/g, (_, action, used, total) => `Final decision: ${localizeActionLabel(action)} after combining ${used} of ${total} timeframes`],
  [/الفريمات السريعة:\s*([^؛.\n]+)/g, (_, value) => `Fast timeframes: ${localizeDetailText(value)}`],
  [/الفريمات الطويلة:\s*([^؛.\n]+)/g, (_, value) => `Long timeframes: ${localizeDetailText(value)}`],
  [/الأساسية:\s*([^.\n]+)/g, (_, value) => `Core timeframes: ${localizeDetailText(value).replaceAll("،", ",")}`],
  [/فريمات الدخول السريع:\s*([^.\n]+)/g, (_, value) => `Fast entry timeframes: ${localizeDetailText(value).replaceAll("،", ",")}`],
  [/يوجد تضارب:\s*([^؛.\n]+)/g, (_, value) => `Conflict detected: ${localizeDetailText(value)}`],
  [/تضارب بين\s+(?:الفريمات السريعة|Fast timeframes)\s+\(([\u0600-\u06ffA-Za-z]+)\)\s+و(?:الفريمات\s+)?الطويلة\s+\(([\u0600-\u06ffA-Za-z]+)\)/g, (_, fast, long) => `Conflict between fast timeframes (${localizeDetailText(fast)}) and long timeframes (${localizeDetailText(long)})`],
  [/نسبة\s+(?:توافق الفريمات|Timeframe agreement)\s+(\d+)%\s+و(?:الاتجاه|Trend)\s+العام\s+([\u0600-\u06ffA-Za-z]+)/g, (_, agreement, trend) => `Timeframe agreement is ${agreement}% and the overall trend is ${localizeDetailText(trend)}`],
  [/توافق الفريمات\s+(\d+)%\s+·\s+تغطية\s+(\d+)\/(\d+)/g, (_, agreement, coverage, total) => `Timeframe agreement ${agreement}% · coverage ${coverage}/${total}`],
  [/(\d+)%\s+ثقة/g, (_, confidence) => `${confidence}% confidence`],
  [/(\d+(?:\.\d+)?)%\s+نجاح/g, (_, winRate) => `${winRate}% win rate`],
  [/العائد إلى المخاطرة\s+([\d.]+)\.\s+انتظار تأكيد فريم 15 أو 30 دقيقة قبل الدخول\./g, (_, ratio) => `Risk/reward ratio ${ratio}. Wait for confirmation on the 15- or 30-minute timeframe before entry.`],
  [/العائد إلى المخاطرة\s+([\d.]+)\.\s+فريمات الدخول تدعم القرار\./g, (_, ratio) => `Risk/reward ratio ${ratio}. Entry timeframes support the decision.`],
  [/العائد إلى المخاطرة\s+([\d.]+)/g, (_, ratio) => `Risk/reward ratio ${ratio}`],
  [/خبر عالي التأثير على\s+([A-Z]{3}):\s+(.+?)\s+\((.+?)\)\. الأفضل انتظار ما بعد الخبر\./g, (_, currency, title, time) => `High-impact event on ${currency}: ${title} (${localizeDetailText(time)}). It is better to wait until after the event.`],
  [/يوجد خبر عالي على\s+([A-Z]{3}):\s+(.+?)\s+خلال\s+(.+?)؛ تم خفض الثقة ورفع الحذر\./g, (_, currency, title, time) => `High-impact event on ${currency}: ${title} in ${localizeDetailText(time)}; confidence was reduced and caution increased.`],
  [/يوجد خبر متوسط على\s+([A-Z]{3}):\s+(.+?)\s+خلال\s+(.+?)؛ راقب التذبذب\./g, (_, currency, title, time) => `Medium-impact event on ${currency}: ${title} in ${localizeDetailText(time)}; monitor volatility.`],
  [/(\d+)\s+إلى\s+(\d+)\s+أيام/g, (_, from, to) => `${from} to ${to} days`],
  [/(\d+)\s+إلى\s+(\d+)\s+أسابيع/g, (_, from, to) => `${from} to ${to} weeks`],
  [/(\d+)\s+يوم\s+إلى\s+(\d+)\s+أسابيع/g, (_, from, to) => `${from} day to ${to} weeks`],
  [/(\d+)\s+دقيقة\s+إلى\s+(\d+)\s+أسابيع/g, (_, from, to) => `${from} minutes to ${to} weeks`],
  [/خلال\s+(\d+)\s+دقيقة/g, (_, minutes) => `within ${minutes} minutes`],
  [/خلال\s+(\d+)\s+ساعة/g, (_, hours) => `within ${hours} hours`],
  [/خلال\s+(\d+)\s+يوم/g, (_, days) => `within ${days} days`]
];

const elements = {
  status: document.querySelector("#detail-status"),
  symbol: document.querySelector("#detail-symbol"),
  name: document.querySelector("#detail-name"),
  market: document.querySelector("#detail-market"),
  heading: document.querySelector("#detail-heading"),
  summary: document.querySelector("#detail-summary"),
  action: document.querySelector("#detail-action"),
  confidence: document.querySelector("#detail-confidence"),
  agreement: document.querySelector("#detail-agreement"),
  currentPrice: document.querySelector("#detail-current-price"),
  expectedPrice: document.querySelector("#detail-expected-price"),
  targetOne: document.querySelector("#detail-target-one"),
  targetTwo: document.querySelector("#detail-target-two"),
  stopLoss: document.querySelector("#detail-stop-loss"),
  support: document.querySelector("#detail-support"),
  resistance: document.querySelector("#detail-resistance"),
  riskReward: document.querySelector("#detail-risk-reward"),
  expectedMove: document.querySelector("#detail-expected-move"),
  duration: document.querySelector("#detail-duration"),
  score: document.querySelector("#detail-score"),
  risk: document.querySelector("#detail-risk"),
  quality: document.querySelector("#detail-quality"),
  dataHealth: document.querySelector("#detail-data-health"),
  decisionPanel: document.querySelector("#decision-panel"),
  decisionTitle: document.querySelector("#decision-title"),
  decisionMessage: document.querySelector("#decision-message"),
  decisionBadge: document.querySelector("#decision-badge"),
  generalInfo: document.querySelector("#general-info"),
  shariaBox: document.querySelector("#sharia-box"),
  timeframes: document.querySelector("#detail-timeframes"),
  outlook: document.querySelector("#outlook-detail-list"),
  reasons: document.querySelector("#detail-reasons"),
  sparkline: document.querySelector("#detail-sparkline"),
  backtest: document.querySelector("#backtest-detail"),
  back: document.querySelector(".detail-back"),
  statePanel: document.querySelector("#detail-state-panel")
};

let detailAbortController = null;
let detailRequestId = 0;
let scanInFlight = false;

const DETAIL_STATUS_TEXT = {
  noSymbol: "\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062f \u0631\u0645\u0632 \u0627\u0644\u0633\u0647\u0645.",
  chooseSupportedSymbol: "\u0627\u0631\u062c\u0639 \u0644\u0644\u0623\u0633\u0648\u0627\u0642 \u0648\u0627\u062e\u062a\u0631 \u0631\u0645\u0632\u0627\u064b \u0645\u062f\u0639\u0648\u0645\u0627\u064b.",
  analyzingStock: "\u062c\u0627\u0631\u064a \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0633\u0647\u0645",
  loadingInstrumentData: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0633\u0647\u0645",
  checkingProvider: "\u064a\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0641\u062d\u0635 \u0648\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0632\u0648\u062f.",
  runningScan: "\u062c\u0627\u0631\u064a \u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0641\u062d\u0635",
  fetchingHistory: "\u064a\u062a\u0645 \u062c\u0644\u0628 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0633\u0639\u0631\u064a \u0648\u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062a.",
  scanning: "\u062c\u0627\u0631\u064a \u0627\u0644\u0641\u062d\u0635...",
  liveCachedData: "\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062e\u0632\u0646\u0629 \u0644\u062d\u0638\u064a\u0627\u064b",
  freshAnalysis: "\u062a\u062d\u0644\u064a\u0644 \u062c\u062f\u064a\u062f",
  notScanned: "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0641\u062d\u0635",
  notScannedTitle: "\u0644\u0645 \u064a\u062a\u0645 \u0641\u062d\u0635 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0628\u0639\u062f",
  notScannedMessage: "\u0627\u0644\u0633\u0647\u0645 \u0645\u0648\u062c\u0648\u062f\u060c \u0644\u0643\u0646 \u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u064a\u062c\u0629 \u0641\u062d\u0635 \u0645\u062d\u0641\u0648\u0638\u0629.",
  runScan: "\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0641\u062d\u0635",
  noSufficientData: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0643\u0627\u0641\u064a\u0629",
  noSufficientMarketData: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0633\u0648\u0642 \u0643\u0627\u0641\u064a\u0629",
  noChartData: "\u0644\u0627 \u062a\u062a\u0648\u0641\u0631 \u0628\u064a\u0627\u0646\u0627\u062a \u0631\u0633\u0645 \u0623\u0648 \u062a\u0627\u0631\u064a\u062e \u0633\u0639\u0631\u064a \u0643\u0627\u0641\u064a\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u062d\u0627\u0644\u064a\u0627\u064b.",
  retry: "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629",
  couldNotLoadAnalysis: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644",
  incompleteServerResponse: "\u0627\u0633\u062a\u062c\u0627\u0628\u0629 \u0627\u0644\u062e\u0627\u062f\u0645 \u063a\u064a\u0631 \u0645\u0643\u062a\u0645\u0644\u0629.",
  sessionExpired: "\u0627\u0644\u062c\u0644\u0633\u0629 \u0645\u0646\u062a\u0647\u064a\u0629",
  accessDenied: "\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629 \u0645\u0631\u0641\u0648\u0636\u0629",
  noAccess: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0644\u0627\u062d\u064a\u0629",
  signInRequired: "\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0623\u0648 \u062a\u0623\u0643\u062f \u0645\u0646 \u0635\u0644\u0627\u062d\u064a\u0629 \u0627\u0644\u0645\u0634\u062a\u0631\u0643 \u0644\u0639\u0631\u0636 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644.",
  loadingFailed: "\u062a\u0639\u0630\u0631 \u0627\u0644\u062a\u062d\u0645\u064a\u0644",
  unexpectedError: "\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639.",
  analysisStatus: "\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u062d\u0644\u064a\u0644",
  symbolStatus: "\u062d\u0627\u0644\u0629 \u0627\u0644\u0631\u0645\u0632",
  incompleteResponse: "\u0627\u0633\u062a\u062c\u0627\u0628\u0629 \u063a\u064a\u0631 \u0645\u0643\u062a\u0645\u0644\u0629",
  invalidAnalysisObject: "\u0644\u0645 \u064a\u0631\u062c\u0639 \u0627\u0644\u062e\u0627\u062f\u0645 \u0639\u0642\u062f \u062a\u062d\u0644\u064a\u0644 \u0635\u0627\u0644\u062d \u0644\u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632.",
};

applyDetailLanguage();
initMarketBackground();
initDetailBackButton();
initDetailStateActions();
registerPwaServiceWorker();
loadDetailV2();

function initDetailBackButton() {
  elements.back?.addEventListener("click", (event) => {
    event.preventDefault();
    try {
      sessionStorage.setItem("the-sfm-trader-skip-intro", "1");
    } catch {}

    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer?.origin === window.location.origin && history.length > 1) {
        history.back();
        return;
      }
    } catch {}

    window.location.href = "/?skipIntro=1#view-markets";
  });
}

function initDetailStateActions() {
  elements.statePanel?.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-detail-action]");
    if (!actionButton) return;
    const action = actionButton.getAttribute("data-detail-action");
    if (action === "scan") {
      runDetailScan();
      return;
    }
    if (action === "retry") {
      loadDetailV2();
    }
  });
}

function registerPwaServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}

async function loadDetailV2() {
  if (!symbol) {
    showDetailState("error", {
      title: detailText(DETAIL_STATUS_TEXT.noSymbol, "No stock symbol was selected."),
      message: detailText(DETAIL_STATUS_TEXT.chooseSupportedSymbol, "Go back to markets and select a supported symbol."),
    });
    return;
  }

  detailAbortController?.abort();
  detailAbortController = new AbortController();
  const requestId = ++detailRequestId;

  try {
    elements.status.textContent = detailText(DETAIL_STATUS_TEXT.analyzingStock, "Analyzing the stock");
    showDetailState("loading", {
      title: detailText(DETAIL_STATUS_TEXT.loadingInstrumentData, "Loading instrument data"),
      message: `${escapeHtml(symbol)} - ${detailText(DETAIL_STATUS_TEXT.checkingProvider, "Checking scan status and provider data.")}`,
    });
    applyDetailLanguage();
    const data = await requestDetail("GET", detailAbortController.signal);
    if (requestId !== detailRequestId) return;
    handleDetailPayload(data);
    applyDetailLanguage();
  } catch (error) {
    if (error.name === "AbortError") return;
    handleDetailRequestError(error);
  }
}

async function runDetailScan() {
  if (!symbol || scanInFlight) return;
  scanInFlight = true;

  try {
    elements.status.textContent = detailText(DETAIL_STATUS_TEXT.runningScan, "Running scan");
    showDetailState("loading", {
      title: detailText(DETAIL_STATUS_TEXT.runningScan, "Running scan"),
      message: `${escapeHtml(symbol)} - ${detailText(DETAIL_STATUS_TEXT.fetchingHistory, "Fetching price history and calculating indicators.")}`,
      actionLabel: detailText(DETAIL_STATUS_TEXT.scanning, "Scanning..."),
      action: "scan",
      disabled: true,
    });
    applyDetailLanguage();
    const data = await requestDetail("POST");
    handleDetailPayload(data);
  } catch (error) {
    handleDetailRequestError(error);
  } finally {
    scanInFlight = false;
  }
}

async function requestDetail(method, signal) {
  const traderAnalysisPrefix = ["", "api", "trader", "analysis"].join("/");
  const requestUrl = `${traderAnalysisPrefix}/${encodeURIComponent(symbol)}`;
  const response = await fetch(requestUrl, {
    method,
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : { message: await response.text() };

  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (!payload || typeof payload !== "object") {
    const error = new Error("Invalid API response");
    error.status = 500;
    throw error;
  }

  return payload;
}

function handleDetailPayload(data) {
  const status = data?.status || (data?.recommendation ? "success" : "error");

  if (status === "success" && data.recommendation) {
    hideDetailState();
    renderDetail(data);
    elements.status.textContent = data.cached ? detailText(DETAIL_STATUS_TEXT.liveCachedData, "Live cached data") : detailText(DETAIL_STATUS_TEXT.freshAnalysis, "Fresh analysis");
    return;
  }

  if (status === "not_scanned") {
    elements.status.textContent = detailText(DETAIL_STATUS_TEXT.notScanned, "Not scanned");
    showDetailState("not-scanned", {
      title: detailText(DETAIL_STATUS_TEXT.notScannedTitle, "This symbol has not been scanned yet"),
      message: `${escapeHtml(data.symbol || symbol)} - ${detailText(DETAIL_STATUS_TEXT.notScannedMessage, "The symbol exists, but there is no saved scan result yet.")}`,
      actionLabel: detailText(DETAIL_STATUS_TEXT.runScan, "Run scan"),
      action: "scan",
    });
    return;
  }

  if (status === "no_data") {
    elements.status.textContent = detailText(DETAIL_STATUS_TEXT.noSufficientData, "No sufficient data");
    showDetailState("no-data", {
      title: detailText(DETAIL_STATUS_TEXT.noSufficientMarketData, "No sufficient market data"),
      message: localizeDetailText(data.message || detailText(DETAIL_STATUS_TEXT.noChartData, "There is not enough chart or historical price data for this symbol right now.")),
    actionLabel: detailText(DETAIL_STATUS_TEXT.retry, "Retry"),
      action: "retry",
    });
    drawSparkline(elements.sparkline, [], "hold");
    return;
  }

  showDetailState("error", {
    title: detailText(DETAIL_STATUS_TEXT.couldNotLoadAnalysis, "Could not load analysis"),
    message: localizeDetailText(data?.message || data?.error || detailText(DETAIL_STATUS_TEXT.incompleteServerResponse, "The server response is incomplete.")),
    actionLabel: detailText(DETAIL_STATUS_TEXT.retry, "Retry"),
    action: "retry",
  });
}

function handleDetailRequestError(error) {
  const status = error.status;
  if (status === 401 || status === 403) {
    elements.status.textContent = status === 401 ? detailText(DETAIL_STATUS_TEXT.sessionExpired, "Session expired") : detailText(DETAIL_STATUS_TEXT.accessDenied, "Access denied");
    showDetailState("unauthorized", {
      title: status === 401 ? detailText(DETAIL_STATUS_TEXT.sessionExpired, "Session expired") : detailText(DETAIL_STATUS_TEXT.noAccess, "Access denied"),
      message: detailText(DETAIL_STATUS_TEXT.signInRequired, "Sign in or verify trader access to view analysis details."),
    });
    return;
  }

  elements.status.textContent = detailText(DETAIL_STATUS_TEXT.loadingFailed, "Loading failed");
  showDetailState("error", {
    title: detailText(DETAIL_STATUS_TEXT.couldNotLoadAnalysis, "Could not load analysis"),
    message: localizeDetailText(error.message || detailText(DETAIL_STATUS_TEXT.unexpectedError, "An unexpected error occurred.")),
    actionLabel: detailText(DETAIL_STATUS_TEXT.retry, "Retry"),
    action: "retry",
  });
}

function showDetailState(kind, options = {}) {
  if (!elements.statePanel) return;
  const title = options.title || detailText(DETAIL_STATUS_TEXT.analysisStatus, "Analysis status");
  const message = options.message || "";
  const actionMarkup = options.action ? `
    <div class="detail-state-actions">
      <button class="detail-state-button" type="button" data-detail-action="${escapeHtml(options.action)}" ${options.disabled ? "disabled" : ""}>
        ${escapeHtml(localizeDetailText(options.actionLabel || detailText(DETAIL_STATUS_TEXT.retry, "Retry")))}
      </button>
    </div>
  ` : "";

  elements.statePanel.className = `detail-state-panel detail-state-${kind}`;
  elements.statePanel.innerHTML = `
    <div>
      <p class="eyebrow">${escapeHtml(localizeDetailText(detailText(DETAIL_STATUS_TEXT.symbolStatus, "Symbol status")))}</p>
      <h2>${escapeHtml(localizeDetailText(title))}</h2>
      <p>${escapeHtml(localizeDetailText(message))}</p>
    </div>
    ${actionMarkup}
  `;
  elements.statePanel.hidden = false;
}

function hideDetailState() {
  if (!elements.statePanel) return;
  elements.statePanel.hidden = true;
  elements.statePanel.innerHTML = "";
}

async function loadDetail() {
  if (!symbol) {
    showError(detailText(DETAIL_STATUS_TEXT.noSymbol, "No stock symbol was selected."));
    return;
  }

  try {
    elements.status.textContent = detailText(DETAIL_STATUS_TEXT.analyzingStock, "Analyzing the stock");
    applyDetailLanguage();
    const traderAnalysisPrefix = ["", "api", "trader", "analysis"].join("/");
    const response = await fetch(`${traderAnalysisPrefix}/${encodeURIComponent(symbol)}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(localizeDetailText(data.error || detailText("تعذر تحميل تفاصيل السهم", "Could not load stock details")));
    }

    renderDetail(data);
    elements.status.textContent = data.cached ? detailText(DETAIL_STATUS_TEXT.liveCachedData, "Live cached data") : detailText(DETAIL_STATUS_TEXT.freshAnalysis, "Fresh analysis");
    applyDetailLanguage();
  } catch (error) {
    showError(error.message);
  }
}

function renderDetail(data) {
  if (!data || typeof data !== "object" || !data.recommendation || typeof data.recommendation !== "object") {
    showDetailState("error", {
      title: detailText(DETAIL_STATUS_TEXT.incompleteResponse, "Incomplete response"),
      message: detailText(DETAIL_STATUS_TEXT.invalidAnalysisObject, "The server did not return a valid analysis object for this symbol."),
    actionLabel: detailText(DETAIL_STATUS_TEXT.retry, "Retry"),
      action: "retry",
    });
    return;
  }
  const item = data.recommendation;
  const profile = data.profile || {};
  const market = data.market || {};
  const finalScore = calculateFinalScore(item);
  const decision = item.decision || buildDecision(item);

  document.title = `${item.symbol} - the-sfm trader`;
  elements.symbol.textContent = item.symbol;
  elements.name.textContent = localizeInstrumentName(item.name);
  elements.market.textContent = `${localizeMarketLabel(profile, market)} · ${localizeDetailText(profile.exchangeName || item.exchangeName || "--")}`;
  elements.heading.textContent = `${localizeInstrumentName(item.name)} (${item.symbol})`;
  elements.summary.textContent = localizeDetailText(profile.summary || detailText("لا تتوفر معلومات وصفية كافية لهذا الرمز.", "Not enough descriptive information is available for this symbol."));

  elements.action.textContent = localizeActionLabel(item.action, item.actionLabel);
  elements.action.className = `action-badge action-${item.action}`;
  elements.confidence.textContent = localizeConfidenceText(item.confidence);
  elements.agreement.textContent = localizeAgreementText(item.timeframeConsensus);

  elements.currentPrice.textContent = formatMoney(item.currentPrice, item.currency);
  elements.expectedPrice.textContent = formatMoney(item.expectedPrice, item.currency);
  elements.targetOne.textContent = formatMoney(item.target1 ?? item.expectedPrice, item.currency);
  elements.targetTwo.textContent = formatMoney(item.target2, item.currency);
  elements.stopLoss.textContent = hasFiniteNumber(item.stopLoss) ? formatMoney(item.stopLoss, item.currency) : "--";
  elements.support.textContent = formatMoney(item.support, item.currency);
  elements.resistance.textContent = formatMoney(item.resistance, item.currency);
  elements.riskReward.textContent = hasFiniteNumber(item.riskReward) ? `${formatNumber(item.riskReward, { maximumFractionDigits: 2 })}:1` : "--";
  elements.expectedMove.textContent = formatPercent(item.expectedMovePct);
  elements.duration.textContent = localizeDetailText(item.duration);
  elements.score.textContent = `${finalScore.score}% · ${localizeScoreLabel(finalScore.label)}`;
  elements.risk.textContent = localizeRiskLabel(item.risk);
  elements.quality.textContent = item.analysisQuality ? `${item.analysisQuality.score}% · ${localizeDetailText(item.analysisQuality.label)}` : "--";
  elements.dataHealth.textContent = item.dataHealth ? `${item.dataHealth.score}% · ${localizeDetailText(item.dataHealth.label || "صحة البيانات")}` : "--";

  elements.decisionPanel.className = `decision-panel decision-${decision.kind}`;
  elements.decisionTitle.textContent = localizeDetailText(decision.title);
  elements.decisionMessage.textContent = localizeDetailText(decision.message);
  elements.decisionBadge.textContent = localizeDetailText(decision.badge);
  elements.decisionBadge.className = `decision-badge decision-${decision.kind}`;

  renderGeneralInfo(profile, market, item);
  renderSharia(profile);
  renderTimeframes(item.timeframes || []);
  renderOutlook(item);
  renderReasons(item.reasons || []);
  renderBacktest(item);
  drawSparkline(elements.sparkline, item.sparkline || [], item.action);
  applyDetailLanguage();
}

function renderGeneralInfo(profile, market, item) {
  elements.generalInfo.innerHTML = `
    ${renderInfoRow(detailText("الاختصاص", "Specialty"), localizeDetailText(profile.specialty || "--"))}
    ${renderInfoRow(detailText("السوق", "Market"), localizeMarketLabel(profile, market))}
    ${renderInfoRow(detailText("المنطقة", "Region"), localizeRegion(profile.region || market.region || "--"))}
    ${renderInfoRow(detailText("البورصة", "Exchange"), localizeDetailText(profile.exchangeName || item.exchangeName || "--"))}
    ${renderInfoRow(detailText("العملة", "Currency"), profile.currency || item.currency || "--")}
    ${renderInfoRow(detailText("حالة السوق", "Market status"), localizeDetailText(item.marketState || "--"))}
    ${renderInfoRow(detailText("ملاحظة المزود", "Provider note"), localizeDetailText(item.providerDelayNote || market.note || "--"))}
    ${renderInfoRow(detailText("حجم التداول النسبي", "Relative volume"), hasFiniteNumber(item.relativeVolume) ? `${formatNumber(item.relativeVolume, { maximumFractionDigits: 2 })}x` : "--")}
    ${renderInfoRow("VWAP", hasFiniteNumber(item.indicators?.vwap) ? formatMoney(item.indicators.vwap, item.currency) : "--")}
  `;
}

function normalizeDetailShariaClassification(profile = {}) {
  const structured = profile.sharia && typeof profile.sharia === "object" ? profile.sharia : null;
  const status = normalizeDetailShariaStatus(
    structured?.status ?? profile.shariaStatus ?? profile.sharia_status ?? profile.shariaCompliance,
  );
  const record = {
    status,
    sourceStatus: status,
    reasonCode: structured?.reason_code || profile.shariaReasonCode || profile.reason_code || (status === "review_required" ? "not_yet_reviewed" : null),
    reasonAr: structured?.reason_ar || profile.shariaReasonAr || profile.reason_ar || "",
    source: structured?.source || profile.shariaSource || "",
    standard: structured?.standard || profile.shariaStandard || "",
    reviewedAt: structured?.reviewed_at || profile.shariaCheckedAt || profile.reviewed_at || "",
    validUntil: structured?.valid_until || profile.valid_until || "",
  };
  if (record.status === "compliant" && isDetailShariaExpired(record)) {
    return { ...record, status: "review_required", expired: true, reasonCode: "classification_expired", reasonAr: "" };
  }
  return { ...record, expired: false };
}

function isDetailShariaExpired(record = {}) {
  const validUntil = record.validUntil;
  if (validUntil) {
    const date = new Date(validUntil);
    if (!Number.isNaN(date.getTime()) && date.getTime() < Date.now()) return true;
  }
  const reviewedAt = record.reviewedAt;
  if (reviewedAt) {
    const date = new Date(reviewedAt);
    if (!Number.isNaN(date.getTime())) {
      return Date.now() - date.getTime() > 365 * 24 * 60 * 60 * 1000;
    }
  }
  return false;
}

function localizeShariaReason(classification) {
  if (classification.reasonAr) return localizeDetailText(classification.reasonAr);
  const labels = DETAIL_SHARIA_REASON_LABELS[classification.reasonCode || "not_yet_reviewed"];
  if (!labels) return "";
  return detailText(labels.ar, labels.en);
}

function renderOptionalInfoRow(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return renderInfoRow(label, value);
}

function formatDetailDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(isDetailEnglishLanguage() ? "en-US" : "ar-KW-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderSharia(profile) {
  const classification = normalizeDetailShariaClassification(profile);
  const normalizedProfile = { ...profile, shariaStatus: classification.status };
  const statusClass = classification.status === "compliant" ? "buy" : classification.status === "non_compliant" ? "sell" : "hold";
  const reason = localizeShariaReason(classification);
  elements.shariaBox.innerHTML = `
    <div class="sharia-status-detail ${statusClass}">
      <strong>${escapeHtml(localizeShariaLabel(normalizedProfile))}</strong>
      <span>${escapeHtml(reason || localizeShariaDescription(normalizedProfile))}</span>
    </div>
    <div class="info-list">
      ${renderOptionalInfoRow(detailText("سبب التصنيف", "Reason"), reason)}
      ${renderOptionalInfoRow(detailText("المصدر", "Source"), classification.source ? localizeDetailText(classification.source) : "")}
      ${renderOptionalInfoRow(detailText("المنهجية المعتمدة", "Methodology"), classification.standard ? localizeDetailText(classification.standard) : "")}
      ${renderOptionalInfoRow(detailText("آخر مراجعة", "Last review"), formatDetailDate(classification.reviewedAt))}
      ${classification.expired ? renderInfoRow(detailText("حالة التحديث", "Freshness"), detailText("التصنيف قديم ويحتاج إلى تحديث", "Classification is outdated and needs review")) : ""}
    </div>
    <p class="sharia-disclaimer">${escapeHtml(detailText(DETAIL_SHARIA_DISCLAIMER.ar, DETAIL_SHARIA_DISCLAIMER.en))}</p>
  `;
}

function renderTimeframes(timeframes) {
  const wanted = new Set(["1m", "15m", "30m", "1h", "1d", "1wk", "1mo"]);
  const frames = timeframes.filter((frame) => wanted.has(frame.id));

  if (!frames.length) {
    elements.timeframes.innerHTML = `<div class="empty">${escapeHtml(detailText("الفريمات غير مكتملة لهذا الرمز حالياً.", "Timeframes are currently incomplete for this symbol."))}</div>`;
    return;
  }

  elements.timeframes.innerHTML = frames.map((frame) => {
    const actionClass = frame.action === "buy" ? "buy" : frame.action === "sell" ? "sell" : "hold";
    return `
      <article class="timeframe-detail ${actionClass}">
        <div>
          <span>${escapeHtml(localizeTimeframeLabel(frame))}</span>
          <strong>${escapeHtml(localizeActionLabel(frame.action, frame.actionLabel))}</strong>
        </div>
        <div>
          <span>${escapeHtml(detailText("الثقة", "Confidence"))}</span>
          <strong>${frame.confidence}%</strong>
        </div>
        <div>
          <span>RSI</span>
          <strong>${frame.rsi14}</strong>
        </div>
        <div>
          <span>${escapeHtml(detailText("الزخم", "Momentum"))}</span>
          <strong>${formatPercent(frame.momentum20)}</strong>
        </div>
        <div>
          <span>${escapeHtml(detailText("الاتجاه", "Trend"))}</span>
          <strong>${escapeHtml(localizeDetailText(frame.trend))}</strong>
        </div>
      </article>
    `;
  }).join("");
}

function renderOutlook(item) {
  const outlook = item.upsideOutlook || [];
  if (!outlook.length) {
    elements.outlook.innerHTML = `<div class="empty">${escapeHtml(detailText("لا توجد أهداف شهرية متاحة لهذا الرمز.", "No monthly targets are available for this symbol."))}</div>`;
    return;
  }

  elements.outlook.innerHTML = outlook.map((entry) => `
    <article class="outlook-detail-item">
      <span>${escapeHtml(localizeDetailText(entry.label))}</span>
      <strong>${formatMoney(entry.targetPrice, item.currency)}</strong>
      <em>${formatPercent(entry.movePct)} · ${localizeConfidenceText(entry.confidence)}</em>
    </article>
  `).join("");
}

function renderReasons(reasons) {
  elements.reasons.innerHTML = reasons.length
    ? reasons.map((reason) => `<li>${escapeHtml(localizeDetailText(reason))}</li>`).join("")
    : `<li>${escapeHtml(detailText("لا توجد أسباب كافية لهذا الرمز حالياً.", "No sufficient reasons are available for this symbol right now."))}</li>`;
}

function renderBacktest(item) {
  elements.backtest.innerHTML = `
    ${renderInfoRow(detailText("معدل النجاح", "Win rate"), hasFiniteNumber(item.backtest?.winRate) ? `${item.backtest.winRate}%` : localizeDetailText(item.backtest?.label || "--"))}
    ${renderInfoRow(detailText("عدد العينات", "Samples"), item.backtest?.samples ?? "--")}
    ${renderInfoRow(detailText("أفق الاختبار", "Test horizon"), hasFiniteNumber(item.backtest?.horizonDays) ? detailText(`${item.backtest.horizonDays} يوم`, `${item.backtest.horizonDays} days`) : "--")}
    ${renderInfoRow(detailText("متوسط العائد", "Average return"), Number.isFinite(item.backtest?.avgReturnPct) ? formatPercent(item.backtest.avgReturnPct) : "--")}
    ${renderInfoRow(detailText("جودة التحليل", "Analysis quality"), item.analysisQuality ? `${item.analysisQuality.score}% · ${localizeDetailText(item.analysisQuality.label)}` : "--")}
    ${renderInfoRow(detailText("خطة التنفيذ", "Execution plan"), localizeDetailText(item.tradePlan?.note || "--"))}
    ${renderInfoRow(detailText("ملاحظات المخاطرة", "Risk notes"), localizeJoinedList(item.risk?.notes, "--"))}
  `;
}

function buildDecision(item) {
  const agreement = item.timeframeConsensus?.agreementPct || 0;

  if (item.action === "buy" && item.confidence >= 70 && agreement >= 60 && item.risk?.level !== "high") {
    return {
      kind: "buy",
      badge: detailText("اشتر الآن", "Buy now"),
      title: detailText("إشارة شراء قوية", "Strong buy signal"),
      message: detailText(
        `الفريمات متوافقة بنسبة ${agreement}% والثقة ${item.confidence}%. راقب السعر والهدف قبل التنفيذ.`,
        `Timeframes agree by ${agreement}% and confidence is ${item.confidence}%. Watch price and target before execution.`
      )
    };
  }

  if (item.action === "sell" && item.confidence >= 65) {
    return {
      kind: "sell",
      badge: detailText("بيع الآن", "Sell now"),
      title: detailText("إشارة بيع واضحة", "Clear sell signal"),
      message: detailText(
        `الاتجاه يميل للبيع بثقة ${item.confidence}%. تجنب الدخول الشرائي حتى تتغير الفريمات.`,
        `The trend leans sell with ${item.confidence}% confidence. Avoid long entry until the timeframes change.`
      )
    };
  }

  return {
    kind: "hold",
    badge: detailText("انتظر", "Wait"),
    title: detailText("لا تتداول هذا السهم الآن", "Do not trade this instrument now"),
    message: detailText(
      "الإشارات غير كافية أو متضاربة. الأفضل الانتظار حتى تتوافق فريمات الدخول مع اليومي.",
      "Signals are insufficient or conflicting. It is better to wait until entry timeframes align with the daily."
    )
  };
}

function renderInfoRow(label, value) {
  return `
    <div class="info-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function showError(message) {
  elements.status.textContent = detailText(DETAIL_STATUS_TEXT.loadingFailed, "Loading failed");
  showDetailState("error", {
    title: detailText(DETAIL_STATUS_TEXT.couldNotLoadAnalysis, "Could not load analysis"),
    message,
    actionLabel: detailText(DETAIL_STATUS_TEXT.retry, "Retry"),
    action: "retry",
  });
  applyDetailLanguage();
}

function calculateFinalScore(item) {
  const confidencePoints = clamp(Number(item.confidence || 0), 0, 100) * 0.35;
  const agreementPoints = clamp(Number(item.timeframeConsensus?.agreementPct || 0), 0, 100) * 0.15;
  const shariaStatus = normalizeDetailShariaClassification(item).status;
  const shariaPoints = {
    compliant: 20,
    review_required: 4,
    doubtful: 8,
    unknown: 4,
    non_compliant: 0,
    not_compliant: 0
  }[shariaStatus] ?? 4;
  const riskPoints = {
    low: 15,
    medium: 9,
    high: 3
  }[item.risk?.level] ?? 8;
  const winRate = Number(item.backtest?.winRate);
  const backtestPoints = Number.isFinite(winRate) ? clamp(winRate * 0.1, 0, 10) : 4;
  const movePoints = clamp(Math.abs(Number(item.expectedMovePct || 0)) * 1.2, 0, 5);
  const qualityPoints = clamp(Number(item.analysisQuality?.score || 0), 0, 100) * 0.08;
  const riskRewardPoints = clamp(Number(item.riskReward || 0), 0, 3) * 2;
  const conflictPenalty = item.timeframeConsensus?.conflict ? 6 : 0;
  const score = Math.round(clamp(confidencePoints + agreementPoints + shariaPoints + riskPoints + backtestPoints + movePoints + qualityPoints + riskRewardPoints - conflictPenalty, 0, 100));
  const label = score >= 80 ? "قوي جداً" : score >= 70 ? "قوي" : score >= 55 ? "متوسط" : "ضعيف";

  return { score, label };
}

function drawSparkline(canvas, values = [], action) {
  if (!canvas || typeof canvas.getContext !== "function") return;
  const context = canvas.getContext("2d");
  if (!context) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) {
    window.requestAnimationFrame(() => drawSparkline(canvas, values, action));
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);

  const data = values.filter(Number.isFinite);
  if (data.length < 2) {
    context.fillStyle = "rgba(244, 248, 252, 0.72)";
    context.font = "600 14px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      detailText("لا تتوفر بيانات رسم بياني لهذا السهم حالياً.", "No chart data is available for this instrument right now."),
      rect.width / 2,
      rect.height / 2
    );
    return;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 16;
  const width = rect.width - pad * 2;
  const height = rect.height - pad * 2;
  const lineColor = action === "sell" ? "#ff6b6b" : action === "hold" ? "#91a7ff" : "#65d98d";

  context.strokeStyle = "rgba(135, 154, 172, 0.18)";
  context.lineWidth = 1;
  for (let index = 1; index <= 3; index += 1) {
    const y = pad + (height / 4) * index;
    context.beginPath();
    context.moveTo(pad, y);
    context.lineTo(rect.width - pad, y);
    context.stroke();
  }

  context.strokeStyle = lineColor;
  context.lineWidth = 2.5;
  context.beginPath();
  data.forEach((value, index) => {
    const x = pad + (index / (data.length - 1)) * width;
    const y = pad + height - ((value - min) / range) * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function getDetailSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(APP_SETTINGS_STORAGE_KEY) || "{}");
    return {
      language: normalizeDetailLocale(saved?.language)
    };
  } catch {
    return { language: "ar" };
  }
}

function normalizeDetailLocale(value) {
  const locale = String(value || "").trim().toLowerCase().slice(0, 2);
  return ["ar", "en", "fr"].includes(locale) ? locale : "ar";
}

function getDetailLanguage() {
  return normalizeDetailLocale(getDetailSettings().language);
}

function isDetailEnglishLanguage() {
  return ["en", "fr"].includes(getDetailLanguage());
}

function detailText(arabic, english) {
  return isDetailEnglishLanguage() ? english : arabic;
}

function localizeDetailText(value, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
  const text = String(value);
  return isDetailEnglishLanguage()
    ? translateDetailArabicToEnglish(text)
    : translateDetailEnglishToArabic(text);
}

function localizeActionLabel(actionOrLabel, fallbackLabel = "") {
  const key = String(actionOrLabel || "").trim().toLowerCase();
  const normalized = key === "شراء" || key === "buy" ? "buy" : key === "بيع" || key === "sell" ? "sell" : key === "انتظار" || key === "hold" || key === "wait" ? "hold" : "";
  const labels = normalized ? DETAIL_ACTION_LABELS[normalized] : null;
  if (labels) return detailText(labels.ar, labels.en);
  return localizeDetailText(fallbackLabel || actionOrLabel || DETAIL_ACTION_LABELS.hold.ar);
}

function localizeRiskLabel(risk) {
  const level = risk?.level || "";
  if (DETAIL_RISK_LABELS[level]) return detailText(DETAIL_RISK_LABELS[level].ar, DETAIL_RISK_LABELS[level].en);
  return localizeDetailText(risk?.label || "--");
}

function localizeScoreLabel(label) {
  const text = String(label || "");
  if (text === DETAIL_SCORE_LABELS.veryStrong.ar || /very strong/i.test(text)) return detailText(DETAIL_SCORE_LABELS.veryStrong.ar, DETAIL_SCORE_LABELS.veryStrong.en);
  if (text === DETAIL_SCORE_LABELS.strong.ar || /^strong$/i.test(text)) return detailText(DETAIL_SCORE_LABELS.strong.ar, DETAIL_SCORE_LABELS.strong.en);
  if (text === DETAIL_SCORE_LABELS.medium.ar || /^medium$/i.test(text)) return detailText(DETAIL_SCORE_LABELS.medium.ar, DETAIL_SCORE_LABELS.medium.en);
  if (text === DETAIL_SCORE_LABELS.weak.ar || /^weak$/i.test(text)) return detailText(DETAIL_SCORE_LABELS.weak.ar, DETAIL_SCORE_LABELS.weak.en);
  return localizeDetailText(text || DETAIL_SCORE_LABELS.weak.ar);
}

function localizeTimeframeLabel(frame) {
  const labels = DETAIL_TIMEFRAME_LABELS[frame?.id];
  if (labels) return detailText(labels.ar, labels.en);
  return localizeDetailText(frame?.label || "--");
}

function localizeShariaLabel(profile) {
  const status = normalizeDetailShariaStatus(profile?.shariaStatus);
  if (DETAIL_SHARIA_LABELS[status]) return detailText(DETAIL_SHARIA_LABELS[status].ar, DETAIL_SHARIA_LABELS[status].en);
  return localizeDetailText(profile?.shariaLabel || DETAIL_SHARIA_LABELS.review_required.ar);
}

function localizeShariaDescription(profile) {
  const status = normalizeDetailShariaStatus(profile?.shariaStatus);
  if (DETAIL_SHARIA_DESCRIPTIONS[status]) {
    return detailText(DETAIL_SHARIA_DESCRIPTIONS[status].ar, DETAIL_SHARIA_DESCRIPTIONS[status].en);
  }
  return localizeDetailText(profile?.shariaDescription || DETAIL_SHARIA_DESCRIPTIONS.review_required.ar);
}

function normalizeDetailShariaStatus(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["compliant", "sharia_compliant", "halal", "approved"].includes(raw)) return "compliant";
  if (["non_compliant", "not_compliant", "noncompliant", "haram", "rejected"].includes(raw)) return "non_compliant";
  if (["unsupported", "not_applicable", "na", "n_a"].includes(raw)) return "unsupported";
  return "review_required";
}

function localizeMarketLabel(profile, market) {
  if (isDetailEnglishLanguage()) {
    return localizeDetailText(market.labelEn || profile.marketLabelEn || profile.marketLabel || market.label || "--");
  }
  return localizeDetailText(profile.marketLabel || market.label || "--");
}

function localizeRegion(value) {
  if (!value) return "--";
  const text = String(value);
  if (isDetailEnglishLanguage() && DETAIL_REGION_TRANSLATIONS[text]) return DETAIL_REGION_TRANSLATIONS[text];
  return localizeDetailText(text);
}

function localizeConfidenceText(value) {
  return detailText(`${value}% ثقة`, `${value}% confidence`);
}

function localizeAgreementText(consensus = {}) {
  const agreement = consensus.agreementPct || 0;
  const coverage = consensus.coverage || 0;
  const total = consensus.total || 0;
  return detailText(
    `توافق الفريمات ${agreement}% · تغطية ${coverage}/${total}`,
    `Timeframe agreement ${agreement}% · coverage ${coverage}/${total}`
  );
}

function localizeJoinedList(values, fallback = "--") {
  const list = (values || []).map((value) => localizeDetailText(value)).filter(Boolean);
  if (!list.length) return fallback;
  return list.join(isDetailEnglishLanguage() ? ", " : "، ");
}

function localizeInstrumentName(name) {
  return localizeDetailText(name || "--");
}

function applyDetailLanguage() {
  const language = getDetailLanguage();
  const ltr = ["en", "fr"].includes(language);
  document.documentElement.lang = language;
  document.documentElement.dir = ltr ? "ltr" : "rtl";
  document.body?.classList.toggle("language-en", ltr);
  translateDetailInterface();
}

function translateDetailInterface(root = document.body) {
  if (!root) return;

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || shouldSkipDetailTranslation(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  while (textWalker.nextNode()) textNodes.push(textWalker.currentNode);
  textNodes.forEach(translateDetailTextNode);

  const elementsToTranslate = root.nodeType === Node.ELEMENT_NODE
    ? [root, ...root.querySelectorAll("*")]
    : Array.from(root.querySelectorAll?.("*") || []);
  elementsToTranslate.forEach(translateDetailElementAttributes);
}

function translateDetailTextNode(node) {
  const english = isDetailEnglishLanguage();
  const currentText = node.nodeValue || "";

  if (english) {
    if (detailHasArabicText(currentText)) detailOriginalTextByNode.set(node, currentText);
    const originalText = detailOriginalTextByNode.get(node) || currentText;
    node.nodeValue = detailHasArabicText(originalText)
      ? translateDetailArabicToEnglish(originalText)
      : originalText;
    return;
  }

  if (detailOriginalTextByNode.has(node)) {
    node.nodeValue = translateDetailEnglishToArabic(detailOriginalTextByNode.get(node));
    return;
  }

  node.nodeValue = translateDetailEnglishToArabic(currentText);
}

function translateDetailElementAttributes(element) {
  if (shouldSkipDetailTranslation(element)) return;

  const english = isDetailEnglishLanguage();
  for (const attr of DETAIL_TRANSLATABLE_ATTRS) {
    if (!element.hasAttribute(attr)) continue;

    const datasetKey = `original${toDetailDatasetSuffix(attr)}`;
    const currentValue = element.getAttribute(attr) || "";

    if (english) {
      if (detailHasArabicText(currentValue)) element.dataset[datasetKey] = currentValue;
      const originalValue = element.dataset[datasetKey] || currentValue;
      if (detailHasArabicText(originalValue)) {
        element.setAttribute(attr, translateDetailArabicToEnglish(originalValue));
      }
      continue;
    }

    const originalValue = element.dataset[datasetKey] || currentValue;
    element.setAttribute(attr, translateDetailEnglishToArabic(originalValue));
  }
}

function shouldSkipDetailTranslation(element) {
  return ["SCRIPT", "STYLE", "CANVAS", "SVG", "PATH"].includes(element.tagName);
}

function translateDetailArabicToEnglish(text) {
  if (!detailHasArabicText(text)) return text;

  const leading = text.match(/^\s*/)?.[0] || "";
  const trailing = text.match(/\s*$/)?.[0] || "";
  const coreText = text.trim();
  let translated = DETAIL_TEXT_TRANSLATIONS[coreText] || DETAIL_EXTRA_TEXT_TRANSLATIONS[coreText] || coreText;

  for (const [pattern, replacer] of DETAIL_ARABIC_PHRASE_PATTERNS) {
    translated = translated.replace(pattern, replacer);
  }

  if (translated === coreText) {
    for (const [arabic, english] of DETAIL_TEXT_TRANSLATION_ENTRIES) {
      if (translated.includes(arabic)) translated = replaceDetailArabicTerm(translated, arabic, english);
    }
  }

  for (const [pattern, replacer] of DETAIL_ARABIC_PHRASE_PATTERNS) {
    translated = translated.replace(pattern, replacer);
  }

  for (const [arabic, english] of DETAIL_COMMON_TERM_TRANSLATIONS) {
    if (translated.includes(arabic)) translated = replaceDetailArabicTerm(translated, arabic, english);
  }

  translated = translated
    .replace(/\s+\. /g, ". ")
    .replace(/\s+،\s+/g, ", ")
    .replace(/;\s*;/g, ";")
    .replace(/العائد إلى Risk\s+([\d.]+)\.\s+Wait\s+تأكيد فريم 15 أو 30 minutes قبل الدخول\.?/g, "Risk/reward ratio $1. Wait for confirmation on the 15- or 30-minute timeframe before entry.")
    .replace(/Wait\s+تأكيد فريم 15 أو 30 minutes قبل الدخول\.?/g, "Wait for confirmation on the 15- or 30-minute timeframe before entry.")
    .replace(/تأكيد فريم 15 أو 30 minutes قبل الدخول\.?/g, "confirmation on the 15- or 30-minute timeframe before entry.")
    .replace(/لا توجد صفقة واضحة؛\s*Wait\s+Timeframe agreement\.?/g, "No clear trade is available; wait for timeframe agreement.")
    .replace(/تضارب بين Fast timeframes \(([^)]+)\) والطويلة \(([^)]+)\)/g, (_, fast, long) => `Conflict between fast timeframes (${localizeDetailText(fast)}) and long timeframes (${localizeDetailText(long)})`)
    .replace(/\bWait\s+حتى\b/g, "Wait until")
    .replace(/\bBuy\s+ي\b/g, "buying")
    .replace(/\bSell\s+ي\b/g, "selling");

  return `${leading}${translated}${trailing}`;
}

function replaceDetailArabicTerm(text, arabic, english) {
  const escaped = escapeDetailRegExp(arabic);
  const pattern = new RegExp(`(^|[^\\p{Script=Arabic}])${escaped}(?=$|[^\\p{Script=Arabic}])`, "gu");
  return String(text).replace(pattern, (_, prefix) => `${prefix}${english}`);
}

function translateDetailEnglishToArabic(text) {
  let translated = String(text ?? "");
  if (!/[A-Za-z]/.test(translated)) return translated;

  for (const [pattern, arabic] of DETAIL_ENGLISH_PHRASE_TO_ARABIC) {
    translated = translated.replace(pattern, arabic);
  }

  for (const [english, arabic] of DETAIL_ENGLISH_TERM_TO_ARABIC) {
    translated = replaceDetailLatinTerm(translated, english, arabic);
  }

  return translated
    .replace(/مخاطرة\s+مرتفع/g, "مخاطرة مرتفعة")
    .replace(/مخاطرة\s+متوسط/g, "مخاطرة متوسطة")
    .replace(/مخاطرة\s+منخفض/g, "مخاطرة منخفضة")
    .replace(/قوي جدا/g, "قوي جداً")
    .replace(/الثقة\s+الفريمات/g, "ثقة الفريمات")
    .replace(/السوق\s+status/gi, "حالة السوق")
    .replace(/analysis\s+quality/gi, "جودة التحليل");
}

function replaceDetailLatinTerm(text, english, arabic) {
  const pattern = new RegExp(`(^|[^A-Za-z])${escapeDetailRegExp(english)}(?=$|[^A-Za-z])`, "g");
  return text.replace(pattern, (_, prefix) => `${prefix}${arabic}`);
}

function escapeDetailRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detailHasArabicText(text) {
  return /[\u0600-\u06ff]/.test(String(text || ""));
}

function toDetailDatasetSuffix(attr) {
  return attr
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

window.addEventListener("storage", (event) => {
  if (event.key === APP_SETTINGS_STORAGE_KEY) applyDetailLanguage();
});

function initMarketBackground() {
  const canvas = document.querySelector("#market-bg");
  if (!canvas || typeof canvas.getContext !== "function") return;
  const context = canvas.getContext("2d");
  if (!context) return;
  const rows = Array.from({ length: 8 }, (_, index) => ({
    y: 80 + index * 92,
    phase: Math.random() * 100,
    speed: 0.35 + Math.random() * 0.45,
    color: index % 3 === 0 ? "53, 194, 164" : index % 3 === 1 ? "255, 107, 107" : "90, 167, 255"
  }));

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    context.strokeStyle = "rgba(135, 154, 172, 0.055)";
    for (let x = 0; x < window.innerWidth; x += 72) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, window.innerHeight);
      context.stroke();
    }

    for (const row of rows) {
      row.phase += row.speed;
      context.strokeStyle = `rgba(${row.color}, 0.2)`;
      context.beginPath();
      for (let x = -20; x <= window.innerWidth + 20; x += 18) {
        const wave = Math.sin((x + row.phase * 3) * 0.012) * 18 + Math.cos((x - row.phase) * 0.027) * 9;
        const y = (row.y + row.phase * 0.12 + wave) % (window.innerHeight + 120);
        if (x === -20) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }

    window.requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  frame();
}

function formatMoney(value, currency) {
  if (value === null || value === undefined || value === "") return "--";
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  const normalizedCurrency = normalizeCurrencyCode(currency);
  const digits = Math.abs(number) < 1 ? 4 : 2;
  return `${formatNumber(number, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}${normalizedCurrency ? ` ${normalizedCurrency}` : ""}`;
}

function normalizeCurrencyCode(currency) {
  const code = String(currency || "").trim().toUpperCase();
  const currencyMap = {
    KWF: "KWD",
    KW: "KWD",
    KWD: "KWD",
    SAR: "SAR",
    SA: "SAR",
    AED: "AED",
    AE: "AED",
    QAR: "QAR",
    QA: "QAR",
    BHD: "BHD",
    BH: "BHD",
    OMR: "OMR",
    OM: "OMR",
    USD: "USD",
    EUR: "EUR",
    GBP: "GBP"
  };
  return currencyMap[code] || code;
}

function formatPercent(value) {
  if (value === null || value === undefined || value === "") return "--";
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${formatNumber(number, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

function normalizeDetailSymbol(value) {
  return String(value ?? "").trim().toUpperCase();
}

function hasFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return false;
  return Number.isFinite(Number(value));
}

function formatNumber(value, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return number.toLocaleString(NUMBER_LOCALE, {
    ...NUMBER_OPTIONS,
    ...options
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
