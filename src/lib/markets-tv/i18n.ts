import type { TvLanguage, TvQuote } from './types';
export const TV_TEXT = {
  allStocks: ['كل الأسهم', 'All stocks', 'Toutes les actions'],
  technology: ['أخبار أسهم التقنية', 'Technology stocks news', 'Actualités des valeurs technologiques'],
  kuwait: ['بورصة الكويت', 'Boursa Kuwait', 'Bourse du Koweït'],
  pairScope: ['يتيح الربط عرض قائمة المتابعة واستثمارات الحساب على هذا التلفزيون.', 'Linking allows this TV to display your watchlist and account investments.', 'L’association permet à ce téléviseur d’afficher votre liste de suivi et vos investissements.'],
  investments: ['استثماراتي', 'My investments', 'Mes investissements'],
  done: ['تم', 'Done', 'Terminé'],
  marketPickerHeading: ['شاشتك، على اختيارك', 'Your screen, your markets', 'Votre écran, vos marchés'],
  marketPickerHelp: ['اختر سوقًا من القائمة لضبط ظهوره وترتيبه وأسهمه وسرعة شريطه.', 'Choose a market to set its visibility, order, instruments and scroll speed.', 'Choisissez un marché pour régler sa visibilité, son ordre, ses titres et sa vitesse.'],
  marketRegion: ['المنطقة أو النوع', 'Region or type', 'Région ou catégorie'],
  marketList: ['قائمة الأسواق', 'Market list', 'Liste des marchés'],
  marketOptions: ['إعدادات السوق', 'Market options', 'Options du marché'],
  showMarket: ['عرض السوق', 'Show market', 'Afficher le marché'],
  marketVisible: ['ظاهر على الشاشة', 'Shown on screen', 'Affiché à l’écran'],
  marketHidden: ['غير معروض', 'Not displayed', 'Non affiché'],
  addMarket: ['إضافة إلى الشاشة', 'Add to screen', 'Ajouter à l’écran'],
  displayOrder: ['ترتيب الظهور', 'Display order', 'Ordre d’affichage'],
  selectResults: ['إضافة الأسواق الظاهرة', 'Add visible markets', 'Ajouter les marchés visibles'],
  instrumentPickerHelp: ['اعرض السوق كاملًا أو كوّن قائمتك الخاصة. تبقى اختياراتك محفوظة عند البحث والتنقل.', 'Show the entire market or create your own list. Your choices stay saved as you search and browse.', 'Affichez tout le marché ou créez votre liste. Vos choix sont conservés pendant la recherche.'],
  allInstrumentsHelp: ['عرض دليل السوق كاملًا', 'Display the entire directory', 'Afficher tout le répertoire'],
  specificInstrumentsHelp: ['اختر ما تريد متابعته فقط', 'Choose what you want to follow', 'Choisissez les titres à suivre'],
  instrumentList: ['قائمة الأسهم والأصول', 'Instrument list', 'Liste des titres'],
  browseInstruments: ['تصفح الأسهم', 'Browse instruments', 'Parcourir les titres'],
  myInstruments: ['أسهمي المختارة', 'My instruments', 'Mes titres'],
  chooseFirstInstrument: ['لتكوين قائمة خاصة، اضغط على أول سهم تريده أو اختر «أسهم وأصول محددة».', 'To create a custom list, choose your first instrument or switch to Selected instruments.', 'Pour créer votre liste, choisissez un premier titre ou passez aux Titres sélectionnés.'],
  channels: ['قنواتي', 'My channels', 'Mes chaînes'],
  balancedDensity: ['متوازن', 'Balanced', 'Équilibré'],
  channelsHelp: ['احفظ الأسواق وترتيبها واختيارات الأسهم واللغة وكثافة العرض وسرعة كل شريط معًا.', 'Save markets, their order, instrument choices, language, density and each strip’s speed together.', 'Enregistrez ensemble les marchés, leur ordre, les titres, la langue, la densité et la vitesse de chaque bande.'],
  channelsLocal: ['محفوظة على هذه الشاشة', 'Saved on this screen', 'Enregistrées sur cet écran'],
  channelName: ['اسم القناة', 'Channel name', 'Nom de la chaîne'],
  channelExample: ['مثل: أسهمي الكويتية', 'For example: My Kuwait stocks', 'Par exemple : Mes actions du Koweït'],
  saveChannel: ['حفظ العرض الحالي', 'Save current display', 'Enregistrer l’affichage actuel'],
  updateChannel: ['حفظ الإعدادات الحالية فيها', 'Replace with current settings', 'Remplacer par les réglages actuels'],
  applyChannel: ['عرض القناة', 'Show channel', 'Afficher la chaîne'],
  deleteChannel: ['حذف القناة', 'Delete channel', 'Supprimer la chaîne'],
  cancel: ['إلغاء', 'Cancel', 'Annuler'],
  channelSaved: ['تم حفظ القنوات', 'Channels saved', 'Chaînes enregistrées'],
  channelApplied: ['تم تطبيق القناة', 'Channel applied', 'Chaîne appliquée'],
  noChannels: ['احفظ عرضك الحالي لإنشاء أول قناة.', 'Save your current display to create your first channel.', 'Enregistrez votre affichage actuel pour créer votre première chaîne.'],
  channelLimit: ['وصلت إلى حد القنوات أو مساحة اختيارات الأسهم؛ قلل عدد القنوات أو الاختيارات.', 'Channel or instrument storage limit reached; reduce channels or selections.', 'Limite de chaînes ou de stockage atteinte ; réduisez les chaînes ou les sélections.'],
  channelStorageError: ['تعذر حفظ القنوات على الجهاز. لم تُغيّر القنوات المحفوظة.', 'Could not save channels on this device. Saved channels were not changed.', 'Impossible d’enregistrer les chaînes sur cet appareil. Les chaînes enregistrées sont inchangées.'],
  pricedOnly: ['عرض الأدوات المتوفر لها سعر فقط', 'Only show instruments with prices', 'Afficher uniquement les titres avec un cours'],
  pricedOnlyHelp: ['يشمل الأسعار المحفوظة والمرجعية مع توضيح حالتها. نتصفح الدليل تدريجيًا ولا نفترض توفر سعر لكل أداة.', 'Includes last-known and reference prices with their status. The directory is paged gradually; not every listing has a price.', 'Inclut les cours conservés et de référence avec leur état. Le répertoire est parcouru progressivement ; chaque titre n’a pas nécessairement de cours.'],
  pageCoverage: ['أسعار في الدفعة', 'Prices in this batch', 'Cours dans ce lot'],
  batchPage: ['دفعة', 'Batch', 'Lot'],
  nextPricedBatch: ['لا توجد أسعار في هذه الدفعة؛ سننتقل تلقائيًا إلى التالية.', 'No prices in this batch; continuing to the next batch automatically.', 'Aucun cours dans ce lot ; passage automatique au suivant.'],
  recentPrices: ['حديثة أو متأخرة', 'Recent or delayed', 'Récents ou différés'],
  retainedPrices: ['محفوظة', 'Last-known', 'Conservés'],
  referencePrices: ['مرجعية', 'Reference', 'Référence'],
  unknownPrices: ['وقت غير معروف', 'Unknown time', 'Heure inconnue'],
  autoHideControls: ['إخفاء أدوات التحكم عند عدم الاستخدام', 'Hide controls when idle', 'Masquer les commandes au repos'],
  showControls: ['إظهار أدوات التحكم', 'Show controls', 'Afficher les commandes'],
  moveMarketUp: ['تقديم السوق', 'Move market up', 'Monter le marché'],
  moveMarketDown: ['تأخير السوق', 'Move market down', 'Descendre le marché'],
  inheritSpeed: ['سرعة الشاشة', 'Screen speed', 'Vitesse de l’écran'],
  refreshCadence: ['تحديث البيانات: العملات الرقمية كل 15 ثانية والبقية كل 30 ثانية أثناء العرض، حسب استجابة المصدر. حركة الشريط لا تغيّر توقيت السعر.', 'Data refresh: crypto every 15 seconds, others every 30 seconds while visible, subject to source response. Scroll speed does not change quote time.', 'Actualisation : crypto toutes les 15 secondes, autres toutes les 30 secondes à l’écran, selon la réponse du fournisseur. Le défilement ne modifie pas l’heure du cours.'],
  customizeInstruments: ['تخصيص الأسهم والأصول', 'Customize instruments', 'Personnaliser les titres'],
  displayInstruments: ['الأسهم والأصول المعروضة', 'Displayed instruments', 'Titres affichés'],
  allInstruments: ['جميع الأسهم والأصول', 'All instruments', 'Tous les titres'],
  specificInstruments: ['أسهم وأصول محددة', 'Selected instruments', 'Titres sélectionnés'],
  selectedInstruments: ['المختار للعرض', 'Selected to display', 'Sélection pour affichage'],
  searchInstruments: ['ابحث بالرمز أو اسم الشركة', 'Search symbol or company name', 'Rechercher un symbole ou une société'],
  selectPage: ['اختيار نتائج هذه الصفحة', 'Select this page', 'Sélectionner cette page'],
  backMarkets: ['رجوع للأسواق', 'Back to markets', 'Retour aux marchés'],
  noMatchingInstruments: ['لا توجد أسهم مطابقة', 'No matching instruments', 'Aucun titre correspondant'],
  matchingInstruments: ['نتائج البحث', 'Matching results', 'Résultats correspondants'],
  noSelectedInstruments: ['لم تختر أي سهم لهذا الشريط', 'No instruments selected for this strip', 'Aucun titre sélectionné pour ce bandeau'],
  instrumentSelectionSaved: ['تُحفظ اختيارات الأسهم على هذه الشاشة', 'Instrument choices are saved on this screen', 'La sélection est enregistrée sur cet écran'],
  selectionStorageUnavailable: ['تعذر حفظ اختيارات الأسهم على الجهاز؛ تبقى متاحة في هذه الجلسة', 'Could not save instrument choices on this device; they remain active for this session', 'Impossible d’enregistrer la sélection sur cet appareil ; elle reste active pour cette session'],
  BUY: ['شراء', 'Buy', 'Acheter'], SELL: ['بيع', 'Sell', 'Vendre'], WAIT: ['انتظار', 'Wait', 'Attendre'], INSUFFICIENT_DATA: ['بيانات غير كافية', 'Insufficient data', 'Données insuffisantes'],
  LOW: ['منخفضة', 'Low', 'Faible'], MEDIUM: ['متوسطة', 'Medium', 'Modéré'], HIGH: ['مرتفعة', 'High', 'Élevé'], VERY_HIGH: ['مرتفعة جدًا', 'Very high', 'Très élevé'], UNAVAILABLE: ['غير متاحة', 'Unavailable', 'Indisponible'],
  regularDays: ['أيام الجلسة الاعتيادية', 'Regular trading days', 'Jours de séance habituels'],
  sundayThursday: ['الأحد–الخميس', 'Sunday–Thursday', 'Dimanche–jeudi'], mondayFriday: ['الاثنين–الجمعة', 'Monday–Friday', 'Lundi–vendredi'],
  hoursVerified: ['تاريخ مراجعة الساعات', 'Hours reviewed', 'Horaires vérifiés'], officialSchedule: ['جدول البورصة الرسمي', 'Official exchange schedule', 'Calendrier officiel de la bourse'],
  title: ['تلفزيون الأسواق', 'MARKETS TV', 'MARCHÉS TV'],
  global: ['المؤشرات العالمية', 'World indices', 'Indices mondiaux'], us: ['الولايات المتحدة', 'United States', 'États-Unis'],
  world: ['جميع الأسهم', 'All stocks', 'Toutes les actions'],
  directoryUnavailable: ['دليل السوق غير متاح حاليًا', 'Market directory unavailable', 'Répertoire indisponible'],
  allMarkets: ['كل الأسواق', 'All markets', 'Tous les marchés'],
  directory: ['عدد الأسهم في الدليل', 'Directory listings', 'Titres du répertoire'],
  selectedCoverage: ['قائمة مختارة', 'Selected coverage', 'Sélection'],
  worldStocks: ['جميع أسهم العالم', 'All world stocks', 'Toutes les actions du monde'],
  gulf: ['أسواق الخليج', 'Gulf markets', 'Marchés du Golfe'], europe: ['أوروبا', 'Europe', 'Europe'], asia: ['آسيا', 'Asia', 'Asie'],
  crypto: ['العملات الرقمية', 'Crypto', 'Crypto'], forex: ['الفوركس', 'Forex', 'Devises'], commodities: ['المعادن والسلع', 'Metals & commodities', 'Métaux et matières premières'],
  watchlist: ['قائمة المتابعة', 'Watchlist', 'Liste de suivi'], markets: ['الأسواق', 'Markets', 'Marchés'], map: ['خريطة الأسواق', 'Market map', 'Carte des marchés'],
  brief: ['موجز السوق', 'Market brief', 'Résumé'], settings: ['إعدادات الشاشة', 'Display settings', 'Réglages de l’écran'],
  pair: ['ربط حسابي', 'Link my account', 'Lier mon compte'], paired: ['جهاز مرتبط', 'Linked device', 'Appareil lié'],
  public: ['وضع العرض العام', 'Public display', 'Affichage public'], loading: ['جارٍ تحديث البيانات', 'Updating data', 'Actualisation des données'],
  unavailable: ['غير متاح', 'Unavailable', 'Indisponible'], delayed: ['متأخر', 'Delayed', 'Différé'], stale: ['آخر سعر محفوظ', 'Last known price', 'Dernier cours connu'],
  closed: ['آخر إغلاق', 'Last close', 'Dernière clôture'],
  unknown_delay: ['التأخير غير مؤكد', 'Delay unconfirmed', 'Délai non confirmé'],
  unknown_time: ['وقت المصدر غير متاح', 'Source time unavailable', 'Heure source indisponible'], available: ['آخر تحديث للمصدر', 'Latest source update', 'Dernière mise à jour source'],
  source: ['المصدر', 'Source', 'Source'], observed: ['وقت السعر', 'Quote time', 'Heure du cours'],
  news: ['أخبار الأسواق', 'Market headlines', 'Actualités des marchés'], noNews: ['لا توجد أخبار متاحة الآن', 'No headlines available now', 'Aucune actualité disponible'],
  retry: ['إعادة المحاولة', 'Retry', 'Réessayer'], offline: ['انقطع الاتصال — البيانات المعروضة قديمة', 'Offline — displayed data may be old', 'Hors ligne — données potentiellement anciennes'],
  error: ['تعذر التحديث — حاول مجددًا', 'Update failed — try again', 'Échec de mise à jour — réessayez'],
  close: ['إغلاق', 'Close', 'Fermer'], back: ['رجوع', 'Back', 'Retour'], next: ['التالي', 'Next', 'Suivant'], previous: ['السابق', 'Previous', 'Précédent'],
  settingsSaved: ['تُحفظ الإعدادات على هذا الجهاز', 'Settings saved on this device', 'Réglages enregistrés sur cet appareil'],
  synced: ['الإعدادات متزامنة مع جهازك المرتبط', 'Settings synced with your linked device', 'Réglages synchronisés avec votre appareil'],
  language: ['اللغة', 'Language', 'Langue'], theme: ['المظهر', 'Theme', 'Thème'], dark: ['ليلي', 'Dark', 'Sombre'], light: ['نهاري', 'Light', 'Clair'],
  layout: ['توزيع الشاشة', 'Screen layout', 'Disposition'], balanced: ['أسواق وأخبار', 'Markets & news', 'Marchés et actualités'], quotes: ['تركيز على الأسعار', 'Price focus', 'Priorité aux cours'],
  autoRotate: ['التنقل التلقائي بين الأسواق', 'Rotate markets automatically', 'Rotation automatique des marchés'],
  rotationSeconds: ['مدة عرض السوق', 'Time per market', 'Durée par marché'], seconds: ['ثانية', 'seconds', 'secondes'],
  ticker: ['شريط الأسعار المتحرك', 'Scrolling price ticker', 'Bandeau des cours'], sound: ['صوت تنبيهات الأسعار', 'Price alert sound', 'Son des alertes de prix'],
  enabled: ['مفعّل', 'On', 'Activé'], disabled: ['متوقف', 'Off', 'Désactivé'], visibleMarkets: ['الأسواق الظاهرة', 'Visible markets', 'Marchés visibles'],
  remoteHelp: ['الأسهم للتنقل · OK للاختيار · رجوع لإغلاق النافذة', 'Arrows to navigate · OK to select · Back to close', 'Flèches pour naviguer · OK pour choisir · Retour pour fermer'],
  gainers: ['الأعلى ارتفاعًا', 'Top gainers', 'Plus fortes hausses'], losers: ['الأعلى انخفاضًا', 'Top losers', 'Plus fortes baisses'],
  sample: ['ضمن الأصول المعروضة ذات التوقيت المعروف', 'Among displayed assets with known timestamps', 'Parmi les actifs affichés à horodatage connu'],
  emptyWatchlist: ['قائمة المتابعة فارغة. أضف أصولك من الموقع أو الهاتف.', 'Your watchlist is empty. Add assets on the website or phone.', 'Liste vide. Ajoutez des actifs sur le site ou le téléphone.'],
  linkForWatchlist: ['اربط حسابك لعرض قائمة المتابعة', 'Link your account to display your watchlist', 'Liez votre compte pour afficher votre liste'],
  coverage: ['أسعار متاحة', 'Prices available', 'Cours disponibles'], subset: ['مجموعة مختارة من الأصول', 'Selected assets', 'Sélection d’actifs'],
  noPrices: ['المصدر لم يُرجع أسعارًا صالحة لهذه المجموعة', 'The source returned no valid prices for this group', 'La source ne fournit aucun cours valide pour ce groupe'],
  scan: ['امسح الرمز بهاتفك ثم وافق على ربط هذا التلفزيون', 'Scan with your phone, then approve this TV', 'Scannez avec votre téléphone, puis autorisez ce téléviseur'],
  code: ['رمز الربط', 'Pairing code', 'Code de liaison'], waiting: ['بانتظار موافقتك من الهاتف', 'Waiting for approval on your phone', 'En attente de validation sur votre téléphone'],
  pairExpired: ['انتهت صلاحية الرمز. أنشئ رمزًا جديدًا.', 'Code expired. Create a new code.', 'Code expiré. Créez un nouveau code.'],
  newCode: ['إنشاء رمز جديد', 'Create new code', 'Créer un nouveau code'],
  pairUnavailable: ['ربط الأجهزة غير متاح حاليًا. يمكنك متابعة الوضع العام.', 'Device linking is unavailable. Public display remains available.', 'Liaison indisponible. L’affichage public reste accessible.'],
  disconnect: ['إلغاء ربط هذا التلفزيون', 'Unlink this TV', 'Dissocier ce téléviseur'],
  disconnected: ['تم إلغاء الربط', 'TV unlinked', 'Téléviseur dissocié'],
  confirmDisconnect: ['إلغاء الربط يحذف وصول التلفزيون لقائمة المتابعة واستثماراتك.', 'Unlinking removes this TV’s access to your watchlist and investments.', 'La dissociation retire l’accès de ce téléviseur à votre liste et à vos investissements.'],
  approve: ['الموافقة على ربط التلفزيون', 'Approve TV connection', 'Autoriser le téléviseur'],
  onlyOwnTv: ['وافق فقط إذا كان هذا الرمز ظاهرًا على تلفزيونك.', 'Approve only if this code is displayed on your TV.', 'Autorisez uniquement si ce code apparaît sur votre téléviseur.'],
  signIn: ['تسجيل الدخول للمتابعة', 'Sign in to continue', 'Connectez-vous pour continuer'],
  approveSuccess: ['تم الربط. ارجع إلى التلفزيون.', 'Approved. Return to your TV.', 'Autorisé. Retournez au téléviseur.'],
  invalidCode: ['الرمز غير صالح أو انتهت صلاحيته', 'Invalid or expired code', 'Code invalide ou expiré'],
  devices: ['أجهزتي المرتبطة', 'My linked devices', 'Mes appareils liés'], revoke: ['إلغاء الوصول', 'Revoke access', 'Révoquer l’accès'],
  noDevices: ['لا توجد أجهزة مرتبطة', 'No linked devices', 'Aucun appareil lié'],
  openPhone: ['افتح الأصل على هاتفك', 'Open asset on your phone', 'Ouvrir l’actif sur votre téléphone'],
  openStory: ['اقرأ الخبر على هاتفك', 'Read on your phone', 'Lire sur votre téléphone'],
  ai: ['ملخص المحلل الذكي', 'AI Analyst summary', 'Résumé de l’analyste IA'],
  noAnalysis: ['لا يوجد تحليل محفوظ صالح لهذا الأصل', 'No valid saved analysis for this asset', 'Aucune analyse enregistrée valide pour cet actif'],
  analysisTime: ['وقت التحليل', 'Analysis time', 'Date de l’analyse'], confidence: ['ثقة المنهج', 'Method confidence', 'Confiance de la méthode'],
  risk: ['المخاطر', 'Risk', 'Risque'], analysisExpired: ['تحليل قديم — راجع التحليل المحدّث على هاتفك', 'Older analysis — check for an update on your phone', 'Analyse ancienne — consultez la mise à jour sur votre téléphone'],
  disclaimer: ['ملخص معلوماتي، وليس توصية شخصية بالشراء أو البيع.', 'Information summary, not a personal buy or sell recommendation.', 'Résumé informatif, sans recommandation personnelle d’achat ou de vente.'],
  alert: ['تنبيه سعر', 'Price alert', 'Alerte de prix'], alertScope: ['تظهر التنبيهات أثناء فتح الشاشة وللأصول المعروضة فقط.', 'Alerts appear while this screen is open, for displayed assets only.', 'Alertes uniquement pendant l’affichage et pour les actifs visibles.'],
  localTime: ['التوقيت المحلي', 'Local time', 'Heure locale'], sessions: ['ساعات الأسواق', 'Market hours', 'Horaires'],
  regularSessions: ['جلسات التداول الرئيسية', 'Core trading sessions', 'Séances principales'],
  scanSchedule: ['امسح الرمز لعرض الجدول والعطل من البورصة.', 'Scan to view the exchange schedule and holidays.', 'Scannez pour consulter les horaires et jours fériés de la bourse.'],
  hoursNote: ['الجلسات الرئيسية بالتوقيت المحلي؛ راجع الجدول الرسمي للمزادات والعطل والإغلاقات الاستثنائية.', 'Core sessions in local time; check the official schedule for auctions, holidays and exceptional closures.', 'Séances principales en heure locale ; consultez le calendrier officiel pour les enchères, jours fériés et fermetures exceptionnelles.'],
  provider: ['حالة البيانات', 'Data status', 'État des données'], freshCount: ['أسعار حديثة أو متأخرة معروفة التوقيت', 'Recent or delayed prices with known timestamps', 'Cours récents ou différés à horodatage connu'],
  fullscreen: ['ملء الشاشة', 'Full screen', 'Plein écran'], exitFullscreen: ['إنهاء ملء الشاشة', 'Exit full screen', 'Quitter le plein écran'],
  pause: ['إيقاف الدوران', 'Pause rotation', 'Suspendre la rotation'], resume: ['تشغيل الدوران', 'Start rotation', 'Démarrer la rotation'],
  activeReading: ['متوقف أثناء التصفح', 'Paused while browsing', 'En pause pendant la navigation'],
  latestObservation: ['آخر ملاحظة سعرية', 'Latest price observation', 'Dernière observation du cours'],
  nothingRanked: ['لا تتوفر بيانات حديثة كافية للترتيب', 'Not enough recent data to rank', 'Données récentes insuffisantes pour classer'],
  refresh: ['تحديث', 'Refresh', 'Actualiser'], connected: ['الشبكة متصلة', 'Network connected', 'Réseau connecté'],
  stripMarkets: ['أشرطة الأسواق', 'Market strips', 'Bandes des marchés'],
  reference: ['سعر مرجعي يومي', 'Daily reference rate', 'Taux de référence quotidien'],
  rising: ['صعود', 'Rising', 'Hausse'], falling: ['نزول', 'Falling', 'Baisse'], unchanged: ['دون تغير', 'Unchanged', 'Stable'],
  customizeMarkets: ['تخصيص الأسواق', 'Customize markets', 'Personnaliser les marchés'],
  searchMarkets: ['ابحث عن سوق', 'Search markets', 'Rechercher un marché'],
  selectedMarkets: ['الأسواق المختارة', 'Selected markets', 'Marchés sélectionnés'],
  clearSelection: ['إلغاء الكل', 'Clear all', 'Tout désélectionner'], resetSelection: ['استعادة الافتراضي', 'Reset selection', 'Réinitialiser'],
  noMatchingMarkets: ['لا توجد أسواق مطابقة', 'No matching markets', 'Aucun marché correspondant'],
  chooseMarkets: ['اختر الأسواق من زر تخصيص الأسواق', 'Choose markets using Customize markets', 'Choisissez les marchés via Personnaliser les marchés'],
  pauseStrips: ['إيقاف حركة الأشرطة', 'Pause strips', 'Suspendre les bandes'], resumeStrips: ['تشغيل حركة الأشرطة', 'Resume strips', 'Reprendre les bandes'],
  stripDensity: ['كثافة الأشرطة', 'Strip density', 'Densité des bandes'], comfortable: ['مريح', 'Comfortable', 'Confortable'], compact: ['مضغوط', 'Compact', 'Compact'],
  stripSpeed: ['سرعة حركة الأشرطة', 'Scroll speed', 'Vitesse de défilement'], slow: ['هادئة', 'Slow', 'Lente'], normal: ['متوسطة', 'Normal', 'Normale'], fast: ['سريعة', 'Fast', 'Rapide'],
  sourcePrices: ['أسعار المصدر', 'Source prices', 'Cours du fournisseur'], waitingPrices: ['بانتظار الأسعار', 'Awaiting prices', 'En attente des cours'], retrying: ['إعادة الاتصال', 'Reconnecting', 'Reconnexion'],
  stripsOnly: ['الأشرطة فقط', 'Strips only', 'Bandes uniquement'],
  dashboard: ['لوحة التلفزيون', 'TV dashboard', 'Tableau TV'],
} satisfies Record<string, [string, string, string]>;
export type TvTextKey = keyof typeof TV_TEXT;
export function tvText(language: TvLanguage, key: TvTextKey) { return TV_TEXT[key][language === 'ar' ? 0 : language === 'fr' ? 2 : 1]; }
const timeFormats = new Map<string, Intl.DateTimeFormat>();
export function tvTime(value: string | null, language: TvLanguage, date = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const key = `${language}:${date}:${dateOnly}`;
  if (!timeFormats.has(key)) timeFormats.set(key, new Intl.DateTimeFormat(`${language}-u-nu-latn`, { ...(dateOnly ? {} : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as const), ...(date || dateOnly ? { month: 'short', day: 'numeric' } as const : {}), timeZone: dateOnly ? 'UTC' : 'Asia/Kuwait' }));
  return timeFormats.get(key)!.format(new Date(value));
}
export function tvPrice(price: number | null, currency: string | null, precision?: 3 | 6) {
  if (price === null || !Number.isFinite(price) || price <= 0) return '—';
  const key = price < .001 ? 'tiny' : precision ? String(precision) : price < 1 && !['KWD','BHD','OMR'].includes(currency || '') ? '6' : ['KWD','BHD','OMR'].includes(currency || '') ? '3' : '2';
  if (!priceFormats.has(key)) priceFormats.set(key, new Intl.NumberFormat('en-US', key === 'tiny' ? { minimumSignificantDigits: 2, maximumSignificantDigits: 6 } : { minimumFractionDigits: Number(key), maximumFractionDigits: Number(key) }));
  return priceFormats.get(key)!.format(price);
}
const priceFormats = new Map<string, Intl.NumberFormat>();

export function tvQuotePrice(quote: Pick<TvQuote, 'price' | 'currency' | 'exchange' | 'symbol'>) {
  const forex = quote.exchange === 'FOREX' || quote.symbol.endsWith('=X');
  return tvPrice(quote.price, quote.currency, forex ? quote.currency === 'JPY' ? 3 : 6 : undefined);
}

// Compare days in the displayed timezone, not the device timezone or UTC.
const quoteDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuwait', year: 'numeric', month: '2-digit', day: '2-digit' });
export function tvQuoteTime(value: string | null, language: TvLanguage, now: number) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const instant = new Date(value);
  const time = tvTime(value, language);
  if (Number.isFinite(now) && now > 0 && quoteDay.format(instant) === quoteDay.format(now)) return time;
  // Keep the full date for an older observation, including its year.
  const parts = quoteDay.formatToParts(instant);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')} · ${time}`;
}
