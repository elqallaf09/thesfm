const params = new URLSearchParams(window.location.search);
const symbol = params.get("symbol") || "";
const NUMBER_LOCALE = "ar-KW-u-nu-latn";
const NUMBER_OPTIONS = { numberingSystem: "latn" };
const APP_SETTINGS_STORAGE_KEY = "the-sfm-trader-settings";
const APP_V2_SETTINGS_STORAGE_KEY = "sfmTraderSettings:v1";
const GLOBAL_LANGUAGE_STORAGE_KEY = "sfm_lang";
const LANGUAGE_CHANGE_EVENT = "sfm-language-change";
const Recommendation = window.SFMRecommendation;
const DETAIL_BRAND_AR = "اس اف ام المحلل الذكي";
const DETAIL_BRAND_EN = "SFM Smart Analyzer";
const DETAIL_BRAND_FR = "Analyseur intelligent SFM";
let detailTitleSymbol = symbol;

function detailNumberLocale() {
  const language = getDetailLanguage();
  if (language === "fr") return "fr-FR-u-nu-latn";
  if (language === "en") return "en-US-u-nu-latn";
  return NUMBER_LOCALE;
}

function normalizeDigits(value) {
  return String(value ?? "")
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
      const code = digit.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    })
    .replace(/\u066B/g, ".")
    .replace(/\u066C/g, ",")
    .replace(/\u066A/g, "%")
    .replace(/[\u061C\u200E\u200F]/g, "");
}

const NON_LATIN_NUMBER_CHARS = /[\u0660-\u0669\u06F0-\u06F9\u066A\u066B\u066C\u061C\u200E\u200F]/;
const DIGIT_NORMALIZED_ATTRIBUTES = ["placeholder", "title", "aria-label", "aria-valuetext", "alt"];
const DIGIT_NORMALIZER_SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

function normalizeDigitString(value) {
  return NON_LATIN_NUMBER_CHARS.test(value) ? normalizeDigits(value) : value;
}

function normalizeDigitTextNode(node) {
  const value = node.nodeValue;
  if (value && NON_LATIN_NUMBER_CHARS.test(value)) node.nodeValue = normalizeDigits(value);
}

function normalizeDigitElement(element) {
  if (!element || DIGIT_NORMALIZER_SKIP_TAGS.has(element.tagName)) return;
  DIGIT_NORMALIZED_ATTRIBUTES.forEach((attribute) => {
    const value = element.getAttribute(attribute);
    if (value && NON_LATIN_NUMBER_CHARS.test(value)) element.setAttribute(attribute, normalizeDigits(value));
  });
  if ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && element.type !== "password") {
    element.value = normalizeDigitString(element.value);
  }
}

function normalizeDigitTree(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    normalizeDigitTextNode(root);
    return;
  }
  if (!(root instanceof Element || root instanceof DocumentFragment)) return;
  if (root instanceof Element) {
    if (DIGIT_NORMALIZER_SKIP_TAGS.has(root.tagName)) return;
    normalizeDigitElement(root);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node instanceof Element && DIGIT_NORMALIZER_SKIP_TAGS.has(node.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) normalizeDigitTextNode(current);
    else if (current instanceof Element) normalizeDigitElement(current);
    current = walker.nextNode();
  }
}

function normalizeDigitInputEvent(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) || target.type === "password") return;
  if (!NON_LATIN_NUMBER_CHARS.test(target.value)) return;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  target.value = normalizeDigits(target.value);
  if (start !== null && end !== null) {
    try {
      target.setSelectionRange(start, end);
    } catch {
      // Date/time inputs do not expose selection ranges.
    }
  }
}

function installLatinDigitNormalizer() {
  if (!document.body) return;
  normalizeDigitTree(document.body);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") normalizeDigitTree(mutation.target);
      else if (mutation.type === "attributes") normalizeDigitElement(mutation.target);
      else mutation.addedNodes.forEach(normalizeDigitTree);
    });
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: DIGIT_NORMALIZED_ATTRIBUTES,
    characterData: true,
    childList: true,
    subtree: true
  });
  document.addEventListener("input", normalizeDigitInputEvent, true);
  document.addEventListener("change", normalizeDigitInputEvent, true);
}

const DETAIL_TEXT_TRANSLATIONS = {
  [DETAIL_BRAND_AR]: DETAIL_BRAND_EN,
  [`تفاصيل السهم - ${DETAIL_BRAND_AR}`]: `Stock details - ${DETAIL_BRAND_EN}`,
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
  "لم يتم تحديد رمز السهم.": "No stock symbol was selected.",
  "جاري تحليل السهم": "Analyzing the stock",
  "تعذر تحميل تفاصيل السهم": "Could not load stock details",
  "بيانات مخزنة لحظياً": "Live cached data",
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
  "أسواق الخليج": "Gulf markets",
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
  "السوق مغلق الآن؛ راقب الإشارة عند الافتتاح ولا تدخل قبل ظهور أسعار حية.": "The market is closed now; monitor the signal at the open and do not enter before live prices appear.",
  "التوصية النهائية المشتركة ليست شراء أو بيع.": "The combined final recommendation is neither buy nor sell.",
  "جودة البيانات متأخرة أو جزئية، لذلك تم خفض الإشارة إلى المراقبة.": "Data quality is delayed or partial, so the signal was reduced to watch.",
  "المؤشرات الفنية الأساسية غير مكتملة.": "Core technical indicators are incomplete.",
  "مستويات الدعم والمقاومة غير مكتملة.": "Support and resistance levels are incomplete.",
  "ATR غير متاح، لذلك لا يمكن ضبط المخاطرة بثقة.": "ATR is unavailable, so risk cannot be set confidently.",
  "سياق الأخبار أو المعنويات غير متاح.": "News or sentiment context is unavailable.",
  "نسبة العائد إلى المخاطرة لا تجتاز بوابة الأمان.": "The risk/reward ratio does not pass the safety gate.",
  "المخاطرة مرتفعة، لذلك لا تُعرض إشارة شراء أو بيع.": "Risk is high, so no buy or sell signal is shown.",
  "البيانات غير كافية لإصدار إشارة شراء أو بيع آمنة.": "There is not enough data to issue a safe buy or sell signal."
};
const DETAIL_FRENCH_TEXT = Object.freeze({
  "SFM Smart Analyzer": "Analyseur intelligent SFM",
  "Stock details - SFM Smart Analyzer": "Détails de l’action - Analyseur intelligent SFM",
  "Stock analysis page": "Page d’analyse de l’action",
  "Back to markets": "Retour aux marchés",
  "Loading analysis": "Chargement de l’analyse",
  "Live alert": "Alerte en direct",
  "The combined final recommendation is neither buy nor sell.": "La recommandation finale combinée n’est ni un achat ni une vente.",
  "Data quality is delayed or partial, so the signal was reduced to watch.": "Les données sont différées ou partielles ; le signal a donc été ramené à la surveillance.",
  "Core technical indicators are incomplete.": "Les principaux indicateurs techniques sont incomplets.",
  "Support and resistance levels are incomplete.": "Les niveaux de support et de résistance sont incomplets.",
  "ATR is unavailable, so risk cannot be set confidently.": "L’ATR est indisponible ; le risque ne peut donc pas être défini avec fiabilité.",
  "News or sentiment context is unavailable.": "Le contexte d’actualité ou de sentiment est indisponible.",
  "The risk/reward ratio does not pass the safety gate.": "Le rapport risque/rendement ne franchit pas le seuil de sécurité.",
  "Risk is high, so no buy or sell signal is shown.": "Le risque est élevé ; aucun signal d’achat ou de vente n’est affiché.",
  "There is not enough data to issue a safe buy or sell signal.": "Les données sont insuffisantes pour émettre un signal d’achat ou de vente sûr.",
  "Preparing the recommendation.": "Préparation de la recommandation.",
  "Current price": "Cours actuel", "Expected price": "Cours attendu", "Target 1": "Objectif 1", "Target 2": "Objectif 2",
  "Stop loss": "Stop de protection", "Support": "Support", "Resistance": "Résistance", "Expected move": "Mouvement attendu",
  "Duration": "Durée", "Score": "Score", "Risk": "Risque", "Analysis quality": "Qualité de l’analyse",
  "Data health": "État des données", "General information": "Informations générales", "What is this stock?": "Qu’est-ce que cette action ?",
  "Sharia": "Charia", "Sharia compliance": "Conformité à la charia", "From 1 minute to 1 month": "D’une minute à un mois",
  "Timeframe analysis": "Analyse des unités de temps", "Outlook": "Perspectives", "Upcoming targets": "Prochains objectifs",
  "Reasons": "Raisons", "Why this recommendation?": "Pourquoi cette recommandation ?", "Mini chart": "Mini-graphique",
  "Recent price action": "Évolution récente du cours", "Price movement chart": "Graphique d’évolution du cours",
  "Backtest": "Test rétrospectif", "Signal quality": "Qualité du signal", "No stock symbol was selected.": "Aucun symbole boursier n’a été sélectionné.",
  "Analyzing the stock": "Analyse de l’action", "Could not load stock details": "Impossible de charger les détails de l’action",
  "Live cached data": "Données en direct mises en cache", "Fresh analysis": "Nouvelle analyse",
  "Not enough descriptive information is available for this symbol.": "Les informations descriptives disponibles pour ce symbole sont insuffisantes.",
  "confidence": "confiance", "Timeframe agreement": "Concordance des unités de temps", "coverage": "couverture",
  "Specialty": "Spécialité", "Market": "Marché", "Region": "Région", "Exchange": "Bourse", "Currency": "Devise",
  "Market status": "État du marché", "Provider note": "Note du fournisseur", "Relative volume": "Volume relatif",
  "Unknown": "Inconnu", "No confirmed Sharia rating is available.": "Aucune classification conforme à la charia n’est confirmée.",
  "Sharia compliant": "Conforme à la charia", "Not Sharia compliant": "Non conforme à la charia",
  "Sharia status is disputed": "Statut de conformité à la charia discuté", "Source": "Source",
  "Internal rating, subject to updates": "Classification interne susceptible d’être mise à jour", "Last review": "Dernière révision",
  "Timeframes are currently incomplete for this symbol.": "Les unités de temps sont actuellement incomplètes pour ce symbole.",
  "Confidence": "Confiance", "Momentum": "Momentum", "Trend": "Tendance",
  "No monthly targets are available for this symbol.": "Aucun objectif mensuel n’est disponible pour ce symbole.",
  "No sufficient reasons are available for this symbol right now.": "Aucune justification suffisante n’est disponible pour ce symbole pour le moment.",
  "Win rate": "Taux de réussite", "Samples": "Échantillons", "Test horizon": "Horizon du test", "days": "jours",
  "Average return": "Rendement moyen", "Execution plan": "Plan d’exécution", "Risk notes": "Notes sur les risques",
  "Buy now": "Acheter maintenant", "Strong buy signal": "Signal d’achat fort", "Watch price and target before execution.": "Surveillez le cours et l’objectif avant l’exécution.",
  "Sell now": "Vendre maintenant", "Clear sell signal": "Signal de vente clair", "Avoid long entry until the timeframes change.": "Évitez une position acheteuse tant que les unités de temps n’ont pas changé.",
  "Wait": "Attendre", "Do not trade this stock now": "Ne négociez pas cette action pour le moment",
  "Loading failed": "Échec du chargement", "Very strong": "Très fort", "Strong": "Fort", "Medium": "Moyen", "Weak": "Faible",
  "Yes": "Oui", "No": "Non", "Provider symbol used": "Symbole du fournisseur utilisé", "Fallback used?": "Solution de repli utilisée ?",
  "Last updated": "Dernière mise à jour", "Data quality": "Qualité des données", "Reason": "Raison",
  "Analysis quality": "Qualité de l’analyse", "The shared final recommendation does not allow a buy or sell signal now.": "La recommandation finale commune ne permet pas actuellement de signal d’achat ou de vente.",
  "Final buy signal": "Signal final d’achat", "Final sell signal": "Signal final de vente", "Insufficient data": "Données insuffisantes",
  "Under watch": "Sous surveillance", "Unavailable": "Indisponible", "Price unavailable": "Cours indisponible",
  "Change unavailable": "Variation indisponible", "Unspecified": "Non précisé", "Live": "En direct", "Cached data": "Données en cache",
  "Delayed": "Différé", "Partial": "Partiel", "Low risk": "Risque faible", "Medium risk": "Risque moyen", "High risk": "Risque élevé",
  "Buy": "Acheter", "Sell": "Vendre", "Watch": "Surveiller", "Shariah-compliant": "Conforme à la charia",
  "Not Shariah-compliant": "Non conforme à la charia", "Needs review": "À examiner", "Unclassified": "Non classé",
  "1 minute": "1 minute", "15 minutes": "15 minutes", "30 minutes": "30 minutes", "1 hour": "1 heure",
  "Daily": "Journalier", "Weekly": "Hebdomadaire", "Monthly": "Mensuel", "Yearly": "Annuel"
});
const DETAIL_FRENCH_EXTRA_TEXT = Object.freeze({
  "A quick summary showing whether short and long timeframes agree or conflict.": "Un résumé rapide indiquant si les unités de temps courtes et longues concordent ou divergent.",
  "Timeframes agree by": "Les unités de temps concordent à",
  "and confidence": "et la confiance",
  "The trend leans sell with confidence": "La tendance penche vers la vente avec une confiance de",
  "Signals are insufficient or conflicting. It is better to wait until entry timeframes align with the daily.": "Les signaux sont insuffisants ou contradictoires. Il est préférable d’attendre que les unités de temps d’entrée s’alignent sur l’unité journalière.",
  "Refresh page now": "Actualiser la page maintenant",
  "Oil and energy": "Pétrole et énergie",
  "Requires Sharia review": "Nécessite une révision conforme à la charia",
  "Commodity contract requires Sharia review": "Le contrat sur matières premières nécessite une révision conforme à la charia",
  "No confirmed Sharia classification is available for this symbol in the app right now": "Aucune classification conforme à la charia n’est actuellement confirmée pour ce symbole dans l’application",
  "No confirmed Sharia classification is available for this symbol in the app right now.": "Aucune classification conforme à la charia n’est actuellement confirmée pour ce symbole dans l’application.",
  "Internal classification may be updated": "La classification interne peut être mise à jour",
  "Local classification based on general Sharia screening references and requiring periodic updates": "Classification locale fondée sur des références générales de filtrage conforme à la charia et nécessitant des mises à jour périodiques",
  "Internally classified as Sharia compliant based on the data available in the app.": "Classé en interne comme conforme à la charia selon les données disponibles dans l’application.",
  "Internally classified as not Sharia compliant; it is better to avoid it if Sharia compliance is required.": "Classé en interne comme non conforme à la charia ; il est préférable de l’éviter si cette conformité est requise.",
  "The Sharia classification is not conclusive in the app data and requires review by a Sharia screening provider.": "La classification conforme à la charia n’est pas concluante dans les données de l’application et doit être examinée par un fournisseur spécialisé.",
  "Disputed": "Discuté",
  "Disputed Sharia status": "Statut de conformité à la charia discuté",
  "Bullish": "Haussier",
  "Bearish": "Baissier",
  "Mixed": "Mixte",
  "Sideways": "Latéral",
  "Neutral": "Neutre",
  "Excellent": "Excellent",
  "Normal": "Normal",
  "High": "Élevé",
  "Low": "Faible",
  "Avoid this trade now": "Évitez cette transaction pour le moment",
  "Conditional buy opportunity": "Opportunité d’achat conditionnelle",
  "Clear selling pressure": "Pression vendeuse nette",
  "Wait for confirmation": "Attendre la confirmation",
  "Do not trade": "Ne pas négocier",
  "No clear trade is available; wait for timeframe agreement.": "Aucune transaction claire n’est disponible ; attendez la concordance des unités de temps.",
  "No clear trade is available; wait for timeframe agreement": "Aucune transaction claire n’est disponible ; attendez la concordance des unités de temps",
  "The signal is not strong enough for entry. It is better to wait for the fast timeframes to align with the daily.": "Le signal n’est pas assez fort pour entrer. Il est préférable d’attendre que les unités de temps rapides s’alignent sur l’unité journalière.",
  "Risk is high compared with signal quality.": "Le risque est élevé par rapport à la qualité du signal.",
  "Risk is high compared with signal quality": "Le risque est élevé par rapport à la qualité du signal",
  "Wait until the 15-minute, hourly, and daily timeframes align": "Attendez l’alignement des unités de 15 minutes, horaire et journalière",
  "15 minutes to 4 weeks": "De 15 minutes à 4 semaines",
  "1 day to 6 weeks": "De 1 jour à 6 semaines",
  "3 to 10 days": "De 3 à 10 jours",
  "Risk/reward ratio is incomplete": "Le rapport risque/rendement est incomplet",
  "No nearby high-impact economic events are affecting this symbol.": "Aucun événement économique proche à fort impact n’affecte ce symbole.",
  "Wait until the news impact settles, then reread the chart": "Attendez que l’impact de l’actualité se stabilise, puis relisez le graphique",
  "Wait until data quality improves and the daily timeframe aligns with the fast timeframes": "Attendez que la qualité des données s’améliore et que l’unité journalière s’aligne sur les unités rapides",
  "The trade plan is incomplete because the risk/reward ratio is unclear.": "Le plan de transaction est incomplet, car le rapport risque/rendement n’est pas clair.",
  "The risk/reward ratio is weak, so the entry signal was cancelled.": "Le rapport risque/rendement est faible ; le signal d’entrée a donc été annulé.",
  "The risk/reward ratio is barely acceptable, so confidence is limited.": "Le rapport risque/rendement est à peine acceptable ; la confiance reste donc limitée.",
  "Price variance across timeframes is high, so the decision was changed to wait until the data aligns.": "L’écart de prix entre les unités de temps est élevé ; la décision a donc été remplacée par une attente jusqu’à l’alignement des données.",
  "Data quality is low; there is not enough confidence to issue a buy or sell signal now.": "La qualité des données est faible ; la confiance est insuffisante pour émettre maintenant un signal d’achat ou de vente.",
  "The daily timeframe conflicts with the other timeframes, so it is better to wait for clearer confirmation.": "L’unité journalière diverge des autres unités de temps ; il est donc préférable d’attendre une confirmation plus nette.",
  "Price is above the 20-day average": "Le cours est au-dessus de la moyenne à 20 jours",
  "Price is below the 20-day average": "Le cours est en dessous de la moyenne à 20 jours",
  "Trend is above the 50-day average": "La tendance est au-dessus de la moyenne à 50 jours",
  "Trend is below the 50-day average": "La tendance est en dessous de la moyenne à 50 jours",
  "The 20-day average is above the 50-day average": "La moyenne à 20 jours est au-dessus de la moyenne à 50 jours",
  "The 20-day average is below the 50-day average": "La moyenne à 20 jours est en dessous de la moyenne à 50 jours",
  "MACD is positive": "Le MACD est positif",
  "MACD is negative": "Le MACD est négatif",
  "Price is above VWAP: buyers are stronger": "Le cours est au-dessus du VWAP : les acheteurs sont plus forts",
  "Price is below VWAP: selling pressure": "Le cours est en dessous du VWAP : pression vendeuse",
  "One-month momentum is positive": "Le momentum sur un mois est positif",
  "One-month momentum is negative": "Le momentum sur un mois est négatif",
  "RSI is low: possible rebound": "Le RSI est faible : rebond possible",
  "RSI is high: possible profit-taking": "Le RSI est élevé : prises de bénéfices possibles",
  "RSI is in a neutral range": "Le RSI se situe dans une zone neutre",
  "Activity is above normal": "L’activité est supérieure à la normale",
  "Intraday volume is above average": "Le volume intrajournalier est supérieur à la moyenne",
  "Trading volume is weak": "Le volume de négociation est faible",
  "Volatility is relatively high": "La volatilité est relativement élevée",
  "Signals are close and do not provide a clear edge": "Les signaux sont proches et ne dégagent aucun avantage clair",
  "No strong conflict between core and fast timeframes": "Aucune divergence marquée entre les unités de temps principales et rapides",
  "Entry timeframes support the decision": "Les unités de temps d’entrée confirment la décision",
  "Low volatility": "Faible volatilité",
  "Medium volatility": "Volatilité moyenne",
  "High volatility": "Forte volatilité",
  "The signal is not sharp": "Le signal manque de netteté",
  "Medium timeframe agreement": "Concordance moyenne des unités de temps",
  "Activity is below normal": "L’activité est inférieure à la normale",
  "RSI is at a strong edge": "Le RSI se trouve à un niveau extrême",
  "Fast timeframes": "Unités de temps rapides",
  "Long timeframes": "Unités de temps longues",
  "Conflict detected": "Divergence détectée",
  "Forex currency pair": "Paire de devises Forex",
  "Crypto asset": "Cryptoactif",
  "Commodity or futures contract": "Matière première ou contrat à terme",
  "Market index": "Indice de marché",
  "Listed financial instrument": "Instrument financier coté",
  "Digital currency and digital store of value": "Monnaie numérique et réserve de valeur numérique",
  "Smart-contract network and decentralized applications": "Réseau de contrats intelligents et d’applications décentralisées",
  "Digital asset for a trading and blockchain ecosystem": "Actif numérique destiné à un écosystème de négociation et de chaîne de blocs",
  "High-speed blockchain network": "Réseau de chaîne de blocs à haut débit",
  "Digital payments and transfers": "Paiements et transferts numériques",
  "Smart-contract network": "Réseau de contrats intelligents",
  "Decentralized applications network": "Réseau d’applications décentralisées",
  "Blockchain data oracle": "Oracle de données de chaîne de blocs",
  "Interoperability network for blockchains": "Réseau d’interopérabilité entre chaînes de blocs",
  "Gold futures": "Contrats à terme sur l’or",
  "Silver futures": "Contrats à terme sur l’argent",
  "WTI crude oil futures": "Contrats à terme sur le pétrole brut WTI",
  "Brent crude oil futures": "Contrats à terme sur le pétrole brut Brent",
  "Natural gas futures": "Contrats à terme sur le gaz naturel",
  "Copper futures": "Contrats à terme sur le cuivre",
  "Consumer technology and smart devices": "Technologies grand public et appareils intelligents",
  "Software, cloud computing, and AI": "Logiciels, informatique en nuage et IA",
  "Graphics chips and AI": "Puces graphiques et IA",
  "Processors and computing chips": "Processeurs et puces informatiques",
  "Digital advertising, search, and cloud": "Publicité numérique, recherche et informatique en nuage",
  "E-commerce and cloud computing": "Commerce électronique et informatique en nuage",
  "Electric vehicles and energy": "Véhicules électriques et énergie",
  "Social networks and digital advertising": "Réseaux sociaux et publicité numérique",
  "Islamic banking": "Banque islamique",
  "Traditional banking": "Banque traditionnelle",
  "Telecom and digital services": "Télécommunications et services numériques",
  "Major currency pairs. Yahoo prices may be delayed depending on the pair.": "Principales paires de devises. Les cours Yahoo peuvent être différés selon la paire.",
  "Gold, silver, oil, gas, and copper. Futures symbols may be delayed depending on the provider.": "Or, argent, pétrole, gaz et cuivre. Les symboles à terme peuvent être différés selon le fournisseur.",
  "Highly liquid US stocks from technology, consumer, healthcare, and banking sectors.": "Actions américaines très liquides des secteurs de la technologie, de la consommation, de la santé et de la banque.",
  "Alphabet / Google operates in search, advertising, YouTube, Android, Google Cloud, and AI technologies.": "Alphabet / Google exerce ses activités dans la recherche, la publicité, YouTube, Android, Google Cloud et les technologies d’IA.",
  "Apple operates in iPhone, Mac, iPad, digital services, and the App Store, and trades in the US market.": "Apple exerce ses activités dans l’iPhone, le Mac, l’iPad, les services numériques et l’App Store, et se négocie sur le marché américain.",
  "Microsoft operates in operating systems, Azure, Office, gaming, and AI services, and trades in the US market.": "Microsoft exerce ses activités dans les systèmes d’exploitation, Azure, Office, les jeux vidéo et les services d’IA, et se négocie sur le marché américain.",
  "NVIDIA leads graphics processors, AI accelerators, and data centers, and trades in the US market.": "NVIDIA est un acteur majeur des processeurs graphiques, des accélérateurs d’IA et des centres de données, et se négocie sur le marché américain.",
  "AMD operates in PC and server processors, graphics cards, and AI accelerators, and trades in the US market.": "AMD exerce ses activités dans les processeurs pour PC et serveurs, les cartes graphiques et les accélérateurs d’IA, et se négocie sur le marché américain.",
  "US stocks": "Actions américaines",
  "Forex": "Devises",
  "Crypto": "Cryptoactifs",
  "Commodities": "Matières premières",
  "Gulf markets": "Marchés du Golfe",
  "Saudi market": "Marché saoudien",
  "Kuwait market": "Marché koweïtien",
  "UAE market": "Marché des Émirats arabes unis",
  "Qatar market": "Marché qatari",
  "Bahrain market": "Marché bahreïnien",
  "Oman market": "Marché omanais",
  "European stocks": "Actions européennes",
  "Asian stocks": "Actions asiatiques",
  "Technology stocks": "Actions technologiques",
  "Food / consumer staples": "Alimentation / biens de consommation de base",
  "Pharmaceutical / healthcare": "Pharmacie / santé",
  "Banking stocks": "Actions bancaires",
  "Energy stocks": "Actions énergétiques",
  "AI stocks": "Actions liées à l’IA",
  "Semiconductor stocks": "Actions de semi-conducteurs",
  "Custom list": "Liste personnalisée",
  "A watchlist symbol that may require a provider with direct support.": "Un symbole de liste de suivi qui peut nécessiter un fournisseur assurant une prise en charge directe.",
  "The market is closed now; monitor the signal at the open and do not enter before live prices appear.": "Le marché est actuellement fermé ; surveillez le signal à l’ouverture et n’entrez pas avant l’apparition des cours en direct.",
  "Americas": "Amériques",
  "America": "Amérique",
  "Europe": "Europe",
  "Asia": "Asie",
  "GCC": "CCG",
  "FX": "Devises",
  "Technology": "Technologie",
  "Consumer staples": "Biens de consommation de base",
  "Healthcare": "Santé",
  "Financials": "Services financiers",
  "Energy": "Énergie",
  "AI / Cloud": "IA / Informatique en nuage",
  "Semiconductors": "Semi-conducteurs",
  "Global": "Monde",
  "Custom": "Personnalisé"
});

function detailFrenchText(value) {
  const text = String(value ?? "");
  const leading = text.match(/^\s*/)?.[0] || "";
  const trailing = text.match(/\s*$/)?.[0] || "";
  const core = text.trim();
  if (!core) return text;
  const exact = DETAIL_FRENCH_TEXT[core] || DETAIL_FRENCH_EXTRA_TEXT[core];
  if (exact) return `${leading}${exact}${trailing}`;
  return `${leading}${core}${trailing}`;
}
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
  hold: { ar: "انتظار", en: "Wait" },
  watch: { ar: "تحت المراقبة", en: "Watch" },
  insufficient_data: { ar: "بيانات غير كافية", en: "Insufficient data" }
};
const DETAIL_SHARIA_LABELS = {
  compliant: { ar: "مطابق للشريعة", en: "Shariah-compliant" },
  non_compliant: { ar: "غير مطابق للشريعة", en: "Not Shariah-compliant" },
  needs_review: { ar: "يحتاج مراجعة", en: "Needs review" },
  unclassified: { ar: "غير مصنّف", en: "Unclassified" }
};
const DETAIL_SHARIA_DESCRIPTIONS = {
  compliant: {
    ar: "تم تصنيفه كمطابق للشريعة بناءً على مراجعة يدوية أو مزود موثوق أو بيانات فحص مكتملة.",
    en: "Classified as Shariah-compliant by a manual review, trusted provider, or complete screening data."
  },
  non_compliant: {
    ar: "تم تصنيفه كغير مطابق للشريعة بناءً على مراجعة يدوية أو مزود موثوق أو بيانات فحص متاحة.",
    en: "Classified as not Shariah-compliant by a manual review, trusted provider, or available screening data."
  },
  needs_review: {
    ar: "البيانات المتاحة غير كافية لإصدار تصنيف نهائي، لذلك يحتاج الأصل إلى مراجعة شرعية.",
    en: "Available data is not enough for a final classification, so this asset needs Shariah review."
  },
  unclassified: {
    ar: "لا توجد بيانات تصنيف شرعي موثوقة كافية لهذا الرمز حالياً.",
    en: "No verified Shariah classification data is available for this symbol right now."
  }
};
function normalizeDetailShariaStatus(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (raw === "compliant" || raw === "shariah_compliant" || raw === "sharia_compliant") return "compliant";
  if (raw === "non_compliant" || raw === "not_compliant" || raw === "noncompliant") return "non_compliant";
  if (raw === "needs_review" || raw === "review" || raw === "review_required" || raw === "doubtful") return "needs_review";
  return "unclassified";
}
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
  GCC: "GCC",
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
  back: document.querySelector(".detail-back")
};

applyDetailLanguage();
installLatinDigitNormalizer();
initMarketBackground();
initDetailBackButton();
/* SW معطّل: التنظيف يتم من detail.html */
loadDetail();

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

function registerPwaServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}

async function loadDetail() {
  if (!symbol) {
    showError(detailText("لم يتم تحديد رمز السهم.", "No stock symbol was selected."));
    return;
  }

  try {
    elements.status.textContent = detailText("جاري تحليل السهم", "Analyzing the stock");
    applyDetailLanguage();
    const response = await fetch(`/api/asset?symbol=${encodeURIComponent(symbol)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(localizeDetailText(data.error || detailText("تعذر تحميل تفاصيل السهم", "Could not load stock details")));
    }

    renderDetail(data);
    elements.status.textContent = data.cached ? detailText("بيانات مخزنة لحظياً", "Live cached data") : detailText("تحليل جديد", "Fresh analysis");
    applyDetailLanguage();
  } catch (error) {
    showError(error.message);
  }
}

function renderDetail(data) {
  const item = data.recommendation;
  const profile = data.profile || {};
  const market = data.market || {};
  const normalizedRecommendation = Recommendation.normalizeRecommendation(item, { asset: item, detail: data });
  const finalScore = calculateFinalScore(item);
  const decision = item.decision || buildDecision(item, normalizedRecommendation);

  detailTitleSymbol = item.symbol;
  updateDetailDocumentTitle();
  elements.symbol.textContent = item.symbol;
  elements.name.textContent = localizeInstrumentName(item.name);
  elements.market.textContent = `${localizeMarketLabel(profile, market)} · ${metadataDetailText(profile.exchangeName, profile.exchange, item.exchangeName, item.exchange, item.metadataDiagnostics?.finalExchange)}`;
  elements.heading.textContent = `${localizeInstrumentName(item.name)} (${item.symbol})`;
  elements.summary.textContent = localizeDetailText(profile.summary || detailText("لا تتوفر معلومات وصفية كافية لهذا الرمز.", "Not enough descriptive information is available for this symbol."));

  elements.action.textContent = localizeActionLabel(normalizedRecommendation.status, normalizedRecommendation.actionLabelAr);
  elements.action.className = `action-badge action-${normalizedRecommendation.status}`;
  elements.confidence.textContent = localizeConfidenceText(normalizedRecommendation.confidence);
  elements.agreement.textContent = localizeAgreementText(item.timeframeConsensus);

  elements.currentPrice.textContent = formatMoney(item.currentPrice, item.currency);
  elements.expectedPrice.textContent = formatMoney(item.expectedPrice, item.currency);
  elements.targetOne.textContent = formatMoney(item.target1 || item.expectedPrice, item.currency);
  elements.targetTwo.textContent = formatMoney(item.target2, item.currency);
  elements.stopLoss.textContent = isValidPrice(item.stopLoss) ? formatMoney(item.stopLoss, item.currency) : priceUnavailableText();
  elements.support.textContent = formatMoney(item.support, item.currency);
  elements.resistance.textContent = formatMoney(item.resistance, item.currency);
  elements.riskReward.textContent = item.riskReward ? `${formatNumber(item.riskReward, { maximumFractionDigits: 2 })}:1` : unavailableText();
  elements.expectedMove.textContent = formatPercent(item.expectedMovePct);
  elements.duration.textContent = localizeDetailText(item.duration);
  elements.score.textContent = `${finalScore.score}% · ${localizeScoreLabel(finalScore.label)}`;
  elements.risk.textContent = localizeRiskLabel(item.risk);
  elements.quality.textContent = item.analysisQuality ? `${item.analysisQuality.score}% · ${localizeDetailText(item.analysisQuality.label)}` : unavailableText();
  elements.dataHealth.textContent = item.dataHealth ? `${item.dataHealth.score}% · ${localizeDetailText(item.dataHealth.label || "صحة البيانات")}` : unavailableText();

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
  drawSparkline(elements.sparkline, item.sparkline || [], normalizedRecommendation.status);
  applyDetailLanguage();
}

function renderGeneralInfo(profile, market, item) {
  const providerStatus = item.providerStatus || {};
  const diagnostics = item.metadataDiagnostics || profile.metadataDiagnostics || {};
  const exchange = metadataDetailText(profile.exchangeName, profile.exchange, item.exchangeName, item.exchange, diagnostics.finalExchange);
  const marketLabel = metadataDetailText(profile.marketLabel, profile.market, item.market, diagnostics.finalMarket, localizeMarketLabel(profile, market));
  const providerSymbolUsed = providerStatus.providerSymbolUsed || item.providerSymbol || unavailableText();
  const fallbackUsed = providerStatus.fallbackUsed === true
    ? detailText("نعم", "Yes")
    : providerStatus.fallbackUsed === false
      ? detailText("لا", "No")
      : unavailableText();
  const dataQuality = providerStatus.dataQuality ? localizeDataQuality(providerStatus.dataQuality) : unavailableText();
  elements.generalInfo.innerHTML = `
    ${renderInfoRow(detailText("الاختصاص", "Specialty"), localizeDetailText(profile.specialty || "--"))}
    ${renderInfoRow(detailText("السوق", "Market"), marketLabel)}
    ${renderInfoRow(detailText("المنطقة", "Region"), localizeRegion(profile.region || market.region || "--"))}
    ${renderInfoRow(detailText("البورصة", "Exchange"), exchange)}
    ${renderInfoRow(detailText("العملة", "Currency"), profile.currency || item.currency || "--")}
    ${renderInfoRow(detailText("رمز المزود المستخدم", "Provider symbol used"), providerSymbolUsed)}
    ${renderInfoRow(detailText("استخدم fallback؟", "Fallback used?"), fallbackUsed)}
    ${renderInfoRow(detailText("آخر تحديث", "Last updated"), formatDateTime(providerStatus.lastUpdated || item.dataTimestamp || item.generatedAt))}
    ${renderInfoRow(detailText("جودة البيانات", "Data quality"), dataQuality)}
    ${renderInfoRow(detailText("حالة السوق", "Market status"), localizeDetailText(item.marketState || "--"))}
    ${renderInfoRow(detailText("ملاحظة المزود", "Provider note"), localizeDetailText(item.providerDelayNote || market.note || "--"))}
    ${renderInfoRow(detailText("حجم التداول النسبي", "Relative volume"), item.relativeVolume ? `${formatNumber(item.relativeVolume, { maximumFractionDigits: 2 })}x` : unavailableText())}
    ${renderInfoRow("VWAP", item.indicators?.vwap ? formatMoney(item.indicators.vwap, item.currency) : unavailableText())}
  `;
}

function renderSharia(profile) {
  const status = normalizeDetailShariaStatus(profile.shariahStatus || profile.shariaStatus);
  const statusClass = status === "compliant" ? "buy" : status === "non_compliant" ? "sell" : "hold";
  elements.shariaBox.innerHTML = `
    <div class="sharia-status-detail ${statusClass}">
      <strong>${escapeHtml(localizeShariaLabel(profile))}</strong>
      <span>${escapeHtml(localizeShariaDescription(profile))}</span>
    </div>
    <div class="info-list">
      ${renderInfoRow(detailText("المصدر", "Source"), localizeDetailText(profile.shariahSource || profile.shariaSource || "غير متوفر"))}
      ${renderInfoRow(detailText("آخر مراجعة", "Last review"), profile.shariahLastReviewedAt || profile.shariaCheckedAt || "--")}
      ${renderInfoRow(detailText("السبب", "Reason"), localizeDetailText(profile.shariahReason || profile.shariaDescription || "--"))}
    </div>
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
    ${renderInfoRow(detailText("معدل النجاح", "Win rate"), item.backtest?.winRate ? `${item.backtest.winRate}%` : localizeDetailText(item.backtest?.label || "--"))}
    ${renderInfoRow(detailText("عدد العينات", "Samples"), item.backtest?.samples ?? "--")}
    ${renderInfoRow(detailText("أفق الاختبار", "Test horizon"), item.backtest?.horizonDays ? detailText(`${item.backtest.horizonDays} يوم`, `${item.backtest.horizonDays} days`, `${item.backtest.horizonDays} jours`) : "--")}
    ${renderInfoRow(detailText("متوسط العائد", "Average return"), Number.isFinite(item.backtest?.avgReturnPct) ? formatPercent(item.backtest.avgReturnPct) : "--")}
    ${renderInfoRow(detailText("جودة التحليل", "Analysis quality"), item.analysisQuality ? `${item.analysisQuality.score}% · ${localizeDetailText(item.analysisQuality.label)}` : unavailableText())}
    ${renderInfoRow(detailText("خطة التنفيذ", "Execution plan"), localizeDetailText(item.tradePlan?.note || "--"))}
    ${renderInfoRow(detailText("ملاحظات المخاطرة", "Risk notes"), localizeJoinedList(item.risk?.notes, "--"))}
  `;
}

function buildDecision(item, recommendation) {
  const confidence = recommendation.confidence;
  const confidenceText = Number.isFinite(Number(confidence)) ? `${confidence}%` : "--";
  const messageReason = recommendation.reason || detailText(
    "التوصية النهائية المشتركة لا تسمح بإشارة شراء أو بيع الآن.",
    "The shared final recommendation does not allow a buy or sell signal now."
  );

  if (recommendation.status === "buy") {
    return {
      kind: "buy",
      badge: detailText(recommendation.actionLabelAr, recommendation.actionLabelEn, recommendation.actionLabelFr),
      title: detailText("إشارة شراء نهائية", "Final buy signal"),
      message: detailText(
        `الحالة المشتركة النهائية شراء، والثقة ${confidenceText}. راقب السعر والهدف قبل التنفيذ.`,
        `The shared final status is Buy with ${confidenceText} confidence. Watch price and target before execution.`,
        `Le statut final commun est Acheter avec une confiance de ${confidenceText}. Surveillez le cours et l’objectif avant l’exécution.`
      )
    };
  }

  if (recommendation.status === "sell") {
    return {
      kind: "sell",
      badge: detailText(recommendation.actionLabelAr, recommendation.actionLabelEn, recommendation.actionLabelFr),
      title: detailText("إشارة بيع نهائية", "Final sell signal"),
      message: detailText(
        `الحالة المشتركة النهائية بيع، والثقة ${confidenceText}. لا تُعرض كشراء حتى تتغير التوصية النهائية.`,
        `The shared final status is Sell with ${confidenceText} confidence. It is not displayed as Buy unless the final recommendation changes.`,
        `Le statut final commun est Vendre avec une confiance de ${confidenceText}. Il ne sera pas affiché comme un achat tant que la recommandation finale n’aura pas changé.`
      )
    };
  }

  return {
    kind: "hold",
    badge: detailText(recommendation.actionLabelAr, recommendation.actionLabelEn, recommendation.actionLabelFr),
    title: recommendation.status === "insufficient_data"
      ? detailText("بيانات غير كافية", "Insufficient data")
      : detailText("تحت المراقبة", "Under watch"),
    message: localizeDetailText(messageReason)
  };
}

function renderInfoRow(label, value) {
  const displayValue = value === null || value === undefined || value === "" || value === "--" ? unavailableText() : value;
  return `
    <div class="info-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(displayValue)}</strong>
    </div>
  `;
}

function showError(message) {
  elements.status.textContent = detailText("تعذر التحميل", "Loading failed");
  document.querySelector("#detail-content").innerHTML = `<div class="empty">${escapeHtml(localizeDetailText(message))}</div>`;
  applyDetailLanguage();
}

function calculateFinalScore(item) {
  const confidencePoints = clamp(Number(item.confidence || 0), 0, 100) * 0.35;
  const agreementPoints = clamp(Number(item.timeframeConsensus?.agreementPct || 0), 0, 100) * 0.15;
  const shariaPoints = {
    compliant: 20,
    needs_review: 8,
    unclassified: 4,
    non_compliant: 0
  }[normalizeDetailShariaStatus(item.shariahStatus || item.shariaStatus)] ?? 4;
  const riskPoints = {
    low: 15,
    medium: 9,
    high: 3
  }[item.risk?.level] ?? 8;
  const winRate = Number(item.backtest?.winRate);
  const backtestPoints = Number.isFinite(winRate) ? clamp(winRate * 0.1, 0, 10) : 4;
  const expectedMoveValue = isValidChange(item.expectedMovePct) ? Number(item.expectedMovePct) : null;
  const movePoints = expectedMoveValue === null ? 0 : clamp(Math.abs(expectedMoveValue) * 1.2, 0, 5);
  const qualityPoints = clamp(Number(item.analysisQuality?.score || 0), 0, 100) * 0.08;
  const riskRewardPoints = clamp(Number(item.riskReward || 0), 0, 3) * 2;
  const conflictPenalty = item.timeframeConsensus?.conflict ? 6 : 0;
  const score = Math.round(clamp(confidencePoints + agreementPoints + shariaPoints + riskPoints + backtestPoints + movePoints + qualityPoints + riskRewardPoints - conflictPenalty, 0, 100));
  const label = score >= 80 ? "قوي جداً" : score >= 70 ? "قوي" : score >= 55 ? "متوسط" : "ضعيف";

  return { score, label };
}

function drawSparkline(canvas, values = [], action) {
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);

  const data = values.filter(Number.isFinite);
  if (data.length < 2) return;

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
    const globalLanguage = localStorage.getItem(GLOBAL_LANGUAGE_STORAGE_KEY);
    if (globalLanguage) return { language: normalizeDetailLocale(globalLanguage) };
  } catch {}
  try {
    const saved = JSON.parse(localStorage.getItem(APP_V2_SETTINGS_STORAGE_KEY) || "{}");
    const language = saved?.lang || saved?.language;
    if (language) return { language: normalizeDetailLocale(language) };
  } catch {}
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
  return getDetailLanguage() === "en";
}

function isDetailFrenchLanguage() {
  return getDetailLanguage() === "fr";
}

function detailText(arabic, english, french) {
  if (isDetailFrenchLanguage()) return french || detailFrenchText(english);
  return isDetailEnglishLanguage() ? english : arabic;
}

function detailBrandTitle() {
  return detailText(DETAIL_BRAND_AR, DETAIL_BRAND_EN, DETAIL_BRAND_FR);
}

function updateDetailDocumentTitle(symbolValue = detailTitleSymbol) {
  document.title = symbolValue
    ? `${symbolValue} - ${detailBrandTitle()}`
    : detailText(`تفاصيل السهم - ${DETAIL_BRAND_AR}`, `Stock details - ${DETAIL_BRAND_EN}`, `Détails de l’action - ${DETAIL_BRAND_FR}`);
}

function unavailableText() {
  return detailText("غير متاح", "Unavailable");
}

function priceUnavailableText() {
  return detailText("\u0627\u0644\u0633\u0639\u0631 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d", "Price unavailable");
}

function changeUnavailableText() {
  return detailText("\u0627\u0644\u062a\u063a\u064a\u0631 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d", "Change unavailable");
}

function finiteQuoteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isValidPrice(value) {
  const number = finiteQuoteNumber(value);
  return number !== null && number > 0;
}

function isValidChange(value) {
  const number = finiteQuoteNumber(value);
  return number !== null && number > -100 && Math.abs(number) < 100000;
}

function unspecifiedMetadataText() {
  return detailText("غير محدد", "Unspecified");
}

function metadataDetailText(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && text !== "--" && text !== "—" && text !== unavailableText()) return localizeDetailText(text);
  }
  return unspecifiedMetadataText();
}

function localizeDetailText(value, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
  const text = String(value);
  if (isDetailFrenchLanguage()) {
    const english = detailHasArabicText(text) ? translateDetailArabicToEnglish(text) : text;
    return detailFrenchText(english);
  }
  return isDetailEnglishLanguage()
    ? translateDetailArabicToEnglish(text)
    : translateDetailEnglishToArabic(text);
}

function localizeDataQuality(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "live") return detailText("مباشر", "Live");
  if (key === "cached") return detailText("بيانات مخزنة مؤقتاً", "Cached data");
  if (key === "delayed") return detailText("متأخر", "Delayed");
  if (key === "partial") return detailText("جزئي", "Partial");
  if (key === "unavailable") return unavailableText();
  return localizeDetailText(value || unavailableText());
}

function formatDateTime(value) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return unavailableText();
  return normalizeDigits(new Date(timestamp).toLocaleString(detailNumberLocale(), {
    ...NUMBER_OPTIONS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }));
}

function localizeActionLabel(actionOrLabel, fallbackLabel = "") {
  const key = String(actionOrLabel || "").trim().toLowerCase();
  const sharedStatus = Recommendation.parseRecommendationStatus(actionOrLabel);
  const normalized = sharedStatus || (key === "شراء" || key === "buy" ? "buy" : key === "بيع" || key === "sell" ? "sell" : key === "انتظار" || key === "hold" || key === "wait" ? "hold" : "");
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
  const status = normalizeDetailShariaStatus(profile?.shariahStatus || profile?.shariaStatus);
  if (DETAIL_SHARIA_LABELS[status]) return detailText(DETAIL_SHARIA_LABELS[status].ar, DETAIL_SHARIA_LABELS[status].en);
  return localizeDetailText(profile?.shariaLabel || DETAIL_SHARIA_LABELS.unclassified.ar);
}

function localizeShariaDescription(profile) {
  const status = normalizeDetailShariaStatus(profile?.shariahStatus || profile?.shariaStatus);
  if (DETAIL_SHARIA_DESCRIPTIONS[status]) {
    return detailText(DETAIL_SHARIA_DESCRIPTIONS[status].ar, DETAIL_SHARIA_DESCRIPTIONS[status].en);
  }
  return localizeDetailText(profile?.shariaDescription || DETAIL_SHARIA_DESCRIPTIONS.unclassified.ar);
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
  if (!Number.isFinite(Number(value))) return unavailableText();
  return detailText(`${value}% ثقة`, `${value}% confidence`, `${value}% de confiance`);
}

function localizeAgreementText(consensus = {}) {
  if (!Number.isFinite(Number(consensus.agreementPct))) return unavailableText();
  const agreement = consensus.agreementPct || 0;
  const coverage = consensus.coverage || 0;
  const total = consensus.total || 0;
  return detailText(
    `توافق الفريمات ${agreement}% · تغطية ${coverage}/${total}`,
    `Timeframe agreement ${agreement}% · coverage ${coverage}/${total}`,
    `Concordance des unités de temps ${agreement}% · couverture ${coverage}/${total}`
  );
}

function localizeJoinedList(values, fallback = "--") {
  const list = (values || []).map((value) => localizeDetailText(value)).filter(Boolean);
  if (!list.length) return fallback;
  return list.join(getDetailLanguage() === "ar" ? "، " : ", ");
}

function localizeInstrumentName(name) {
  return localizeDetailText(name || "--");
}

function applyDetailLanguage() {
  const language = getDetailLanguage();
  const ltr = ["en", "fr"].includes(language);
  document.documentElement.lang = language;
  document.documentElement.dir = ltr ? "ltr" : "rtl";
  if (document.body) document.body.dir = ltr ? "ltr" : "rtl";
  document.body?.classList.toggle("language-en", language === "en");
  document.body?.classList.toggle("language-fr", language === "fr");
  document.body?.classList.toggle("language-ar", !ltr);
  translateDetailInterface();
  updateDetailDocumentTitle();
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
  const language = getDetailLanguage();
  const currentText = node.nodeValue || "";

  if (language === "en" || language === "fr") {
    if (detailHasArabicText(currentText)) detailOriginalTextByNode.set(node, currentText);
    const originalText = detailOriginalTextByNode.get(node) || currentText;
    const englishText = detailHasArabicText(originalText)
      ? translateDetailArabicToEnglish(originalText)
      : originalText;
    node.nodeValue = language === "fr" ? detailFrenchText(englishText) : englishText;
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

  const language = getDetailLanguage();
  for (const attr of DETAIL_TRANSLATABLE_ATTRS) {
    if (!element.hasAttribute(attr)) continue;

    const datasetKey = `original${toDetailDatasetSuffix(attr)}`;
    const currentValue = element.getAttribute(attr) || "";

    if (language === "en" || language === "fr") {
      if (detailHasArabicText(currentValue)) element.dataset[datasetKey] = currentValue;
      const originalValue = element.dataset[datasetKey] || currentValue;
      const englishValue = detailHasArabicText(originalValue) ? translateDetailArabicToEnglish(originalValue) : originalValue;
      element.setAttribute(attr, language === "fr" ? detailFrenchText(englishValue) : englishValue);
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
  if ([APP_SETTINGS_STORAGE_KEY, APP_V2_SETTINGS_STORAGE_KEY, GLOBAL_LANGUAGE_STORAGE_KEY].includes(event.key)) applyDetailLanguage();
});
window.addEventListener(LANGUAGE_CHANGE_EVENT, applyDetailLanguage);

function initMarketBackground() {
  const canvas = document.querySelector("#market-bg");
  const context = canvas.getContext("2d");
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
  if (!isValidPrice(value)) return priceUnavailableText();
  const number = Number(value);
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
  if (!isValidChange(value)) return changeUnavailableText();
  const number = Number(value);
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${formatNumber(number, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

function formatNumber(value, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return unavailableText();
  return normalizeDigits(number.toLocaleString(detailNumberLocale(), {
    ...NUMBER_OPTIONS,
    ...options
  }));
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
