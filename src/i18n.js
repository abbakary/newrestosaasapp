// RestoERP Internationalization (i18n) Engine
// Supports Swahili (Kiswahili - Default) and English (en)
// Simple, natural, and everyday East African / Tanzanian restaurant terminology

export const DEFAULT_LANG = 'sw';

export const LANGUAGES = [
  { code: 'sw', label: 'Kiswahili', flag: '🇹🇿', short: 'SW' },
  { code: 'en', label: 'English', flag: '🇬🇧', short: 'EN' }
];

export const DICTIONARY = {
  // ── Branding & Header ──
  app_name: { sw: 'Safari Grill & Lounge', en: 'Safari Grill & Lounge' },
  resto_cloud: { sw: 'RestoERP Mtandaoni', en: 'RestoERP Cloud' },
  tagline: { sw: 'Mfumo wa Kisasa wa Usimamizi wa Migahawa na Baa', en: 'Next-Generation Multi-Tenant Cloud ERP for Hospitality' },
  flagship_branch: { sw: 'Tawi Kuu · Masaki', en: 'Flagship Restaurant · Masaki' },

  // ── Top Navigation & Shifts ──
  opening_prep: { sw: 'Kujiandaa Kufungua', en: 'Opening Prep' },
  live_service: { sw: 'Huduma Inaendelea', en: 'Live Service' },
  day_closed: { sw: 'Siku Imefungwa', en: 'Day Closed' },
  switch_workspace: { sw: 'Badili Jukumu / Tawi', en: 'Switch Role / Workspace' },
  change_language: { sw: 'Lugha / Language', en: 'Language / Lugha' },
  swahili: { sw: 'Kiswahili', en: 'Swahili' },
  english: { sw: 'Kiingereza', en: 'English' },

  // ── Landing Page ──
  features_nav: { sw: 'Sifa za Mfumo', en: 'Features' },
  pricing_nav: { sw: 'Vifurushi vya Bei', en: 'Pricing Plans' },
  live_personas_nav: { sw: 'Watumiaji wa Mfano', en: 'Live Personas' },
  staff_sign_in: { sw: 'Ingia Kazini', en: 'Staff Sign In' },
  start_free_trial: { sw: 'Anza Jaribio la Bure', en: 'Start Free Trial' },
  hero_title: { sw: 'Mfumo Kamilifu wa Kuendesha Mgahawa, Baa na Jikoni Yako', en: 'The Complete Operating System for Restaurants, Lounges & Kitchens' },
  hero_desc: { sw: 'Kuanzia kuagiza mezani kwa QR, skrini ya jikoni (KDS), mauzo ya kaunta (POS), stoo na vinywaji, hadi uhasibu na ripoti za faida.', en: 'From QR table ordering, kitchen screens, fast counter POS, beverage crate stock, to real-time P&L and accounting.' },
  explore_personas: { sw: 'Jaribu Majukumu ya Mfano', en: 'Explore Live Personas' },
  view_pricing: { sw: 'Tazama Bei na Vifurushi', en: 'View Pricing' },
  trial_banner: { sw: 'Siku 14 za Jaribio la Bure Zinaendelea', en: '14-Day Free Evaluation Active' },
  welcome: { sw: 'Habari, Karibu', en: 'Welcome' },
  welcome_back: { sw: 'Karibu Tena Kazini', en: 'Welcome Back' },

  // ── Roles ──
  role_customer: { sw: 'Mteja (Mezani / QR)', en: 'Customer (Table QR)' },
  role_waiter: { sw: 'Mhudumu wa Meza', en: 'Floor Waiter' },
  role_chef: { sw: 'Mpishi / Jikoni (KDS)', en: 'Chef / Kitchen Lead' },
  role_cashier: { sw: 'Keshia / Malipo (POS)', en: 'Cashier / POS Reception' },
  role_storekeeper: { sw: 'Mtunza Stoo na Mzigo', en: 'Storekeeper & Receiving' },
  role_production: { sw: 'Meneja Uzalishaji Jikoni', en: 'Production Manager' },
  role_manager: { sw: 'Meneja Mkuu wa Mgahawa', en: 'Site General Manager' },
  role_owner: { sw: 'Mkurugenzi / Mmiliki', en: 'Group Owner & CEO' },
  role_superadmin: { sw: 'Msimamizi Mkuu wa Mfumo', en: 'SuperAdmin Provider' },

  // ── Module Launcher ──
  mod_pos: { sw: 'Mauzo ya Kaunta (POS)', en: 'Point of Sale (POS)' },
  mod_kitchen: { sw: 'Skrini ya Jikoni (KDS)', en: 'Kitchen Display (KDS)' },
  mod_inventory: { sw: 'Stoo na Mzigo', en: 'Inventory & Stock' },
  mod_production: { sw: 'Uzalishaji Jikoni', en: 'Central Production' },
  mod_accounting: { sw: 'Uhasibu na Fedha', en: 'Accounting & Finance' },
  mod_hr: { sw: 'Wafanyakazi (HR)', en: 'Human Resources (HR)' },
  mod_manager: { sw: 'Usimamizi wa Meneja', en: 'Manager Controls' },
  mod_hq: { sw: 'Makao Makuu (HQ)', en: 'HQ / Multi-Branch' },

  // ── Quick Stats ──
  stat_open_orders: { sw: 'Oda Zinazoendelea', en: 'Open Table Orders' },
  stat_unsettled_bills: { sw: 'Bili Zisizolipwa', en: 'Unsettled Bills' },
  stat_active_staff: { sw: 'Wafanyakazi Kazini', en: 'Active Shift Staff' },
  stat_today_revenue: { sw: 'Mauzo ya Leo', en: 'Today Gross Revenue' },

  // ── Order Statuses ──
  st_placed: { sw: 'Oda Imepokelewa', en: 'Order Placed' },
  st_accepted: { sw: 'Imethibitishwa Jikoni', en: 'Kitchen Accepted' },
  st_preparing: { sw: 'Inapikwa Jikoni', en: 'Cooking' },
  st_ready: { sw: 'Iko Tayari Mezani', en: 'Ready at Pass' },
  st_served: { sw: 'Imehudumiwa Mezani', en: 'Served to Table' },
  st_billreq: { sw: 'Bili Inaombwa', en: 'Bill Requested' },
  st_paid: { sw: 'Imelipwa Kamili', en: 'Paid & Verified' },
  st_closed: { sw: 'Imefungwa & Kuhifadhiwa', en: 'Closed & Archived' },
  st_cancelled: { sw: 'Imeghairiwa', en: 'Cancelled' },

  // ── Menu Categories ──
  cat_all: { sw: 'Vyote', en: 'All' },
  cat_snacks: { sw: 'Vitafunio', en: 'Snacks' },
  cat_pizza: { sw: 'Piza', en: 'Pizza' },
  cat_burgers: { sw: 'Baga', en: 'Burgers' },
  cat_grills: { sw: 'Choma / Nyama', en: 'Grills' },
  cat_pastas: { sw: 'Pasta', en: 'Pastas' },
  cat_salads: { sw: 'Saladi', en: 'Salads' },
  cat_drinks: { sw: 'Vinywaji', en: 'Drinks' },
  cat_desserts: { sw: 'Vitindamlo', en: 'Desserts' },

  // ── Floor Plan & Tables ──
  interactive_floor: { sw: 'Mpangilio wa Meza (Floor Plan)', en: 'Interactive Floor Plan' },
  active_tables_count: { sw: 'meza zinazotumika · gusa kuchagua', en: 'active tables · tap to select' },
  takeaway_tab: { sw: 'Chukua Nje / Kaunta (Bila Meza)', en: 'Takeaway / Bar Tab (No Table)' },
  no_takeaway: { sw: 'Hakuna oda za kuchukua', en: 'No takeaway' },
  table_seats: { sw: 'viti', en: 'seats' },
  table_free: { sw: 'Wazi · Inapatikana', en: 'Free · available' },
  active_tickets: { sw: 'tiketi zinazoendelea', en: 'active tickets' },
  just_now: { sw: 'sasa hivi', en: 'just now' },

  // ── Customer & Ordering ──
  table_label: { sw: 'Meza', en: 'Table' },
  waiter_label: { sw: 'Mhudumu', en: 'Waiter' },
  search_placeholder: { sw: 'Tafuta chakula, vinywaji, vitafunio...', en: 'Search food, drinks, snacks...' },
  my_cart: { sw: 'Oda Yangu', en: 'My Order' },
  empty_cart_msg: { sw: 'Kikapu chako kiko wazi. Chagua vyakula au vinywaji kwenye orodha!', en: 'Your order is empty. Select delicious food or drinks from the menu!' },
  add_item: { sw: 'Ongeza', en: 'Add' },
  item_notes_placeholder: { sw: 'Maelezo maalum (mf. bila pilipili, limao pembeni...)', en: 'Special instructions (e.g. no chilli, lime on side...)' },
  subtotal: { sw: 'Jumla Ndogo', en: 'Subtotal' },
  vat_amount: { sw: 'Kodi (VAT 18%)', en: 'VAT Tax (18%)' },
  total_amount: { sw: 'Jumla Kuu', en: 'Total' },
  place_order_btn: { sw: 'Weka Oda Sasa', en: 'Place Order Now' },
  request_bill_btn: { sw: 'Omba Bili Yako', en: 'Request Bill' },
  order_received_banner: { sw: 'Oda yako imepokelewa na kupelekwa jikoni!', en: 'Your order has been sent to the kitchen!' },
  view_receipt: { sw: 'Tazama Risiti', en: 'View Receipt' },
  my_orders_tab: { sw: 'Oda Zangu', en: 'My Orders' },
  menu_tab: { sw: 'Orodha ya Chakula', en: 'Menu' },
  call_waiter: { sw: 'Ita Mhudumu', en: 'Call Waiter' },
  guest_name: { sw: 'Jina la Mteja', en: 'Guest Name' },

  // ── Waiter Screen ──
  tab_new_order: { sw: 'Oda Mpya', en: 'New Order' },
  tab_my_orders: { sw: 'Oda za Meza Zangu', en: 'Active Orders' },
  tab_my_qr: { sw: 'QR & Kiungo cha Mteja', en: 'Table QR Link' },
  tab_commissions: { sw: 'Kamisheni Yangu', en: 'My Earnings' },
  mark_served: { sw: 'Imekabidhiwa Mezani', en: 'Mark Served' },
  take_new_order: { sw: 'Chukua Oda Mpya', en: 'Take New Order' },
  share_qr_instruction: { sw: 'Mteja anaweza kuchanganua QR hii kuweka oda moja kwa moja kutoka mezani kwake.', en: 'Customers can scan this QR code to order directly from their table.' },
  rotate_token: { sw: 'Badili Kiungo / QR Mpya', en: 'Generate New QR' },
  unpaid_orders_warning: { sw: 'Kuna oda zinasubiri malipo', en: 'Unsettled orders pending' },

  // ── Cashier Screen ──
  tab_orders_queue: { sw: 'Mstari wa Oda', en: 'Orders Queue' },
  tab_tables_view: { sw: 'Mtazamo wa Meza', en: 'Floor View' },
  tab_cash_drawer: { sw: 'Kufunga Hesabu ya Keshia', en: 'Cash Drawer & Z-Report' },
  settle_bill: { sw: 'Lipa Bili Sasa', en: 'Settle Payment' },
  payment_method: { sw: 'Njia ya Malipo', en: 'Payment Method' },
  pay_cash: { sw: 'Pesa Taslimu (Cash)', en: 'Cash' },
  pay_mpesa: { sw: 'M-Pesa (Vodacom)', en: 'M-Pesa' },
  pay_tigopesa: { sw: 'Tigo Pesa', en: 'Tigo Pesa' },
  pay_airtel: { sw: 'Airtel Money', en: 'Airtel Money' },
  pay_card: { sw: 'Kadi ya Benki (Visa/Mastercard)', en: 'Bank Card' },
  pay_split: { sw: 'Gawanya Malipo (Split Bill)', en: 'Split Payment' },
  confirm_payment_btn: { sw: 'Thibitisha Malipo', en: 'Confirm Payment' },
  print_receipt_btn: { sw: 'Chapa Risiti', en: 'Print Receipt' },
  bill_settled_success: { sw: 'Malipo yamethibitishwa kikamilifu!', en: 'Payment successfully settled!' },

  // ── KDS (Kitchen Display) ──
  kds_live_tickets: { sw: 'Tiketi za Jikoni (KDS)', en: 'Kitchen Tickets (KDS)' },
  kds_out_of_stock: { sw: 'Vyakula Vilivyoisha (86)', en: '86 Items (Out of Stock)' },
  kds_prep_plan: { sw: 'Mpango wa Maandalizi', en: 'Daily Prep Sheet' },
  kds_done_all: { sw: 'Vyakula Vyote Vimekamilika', en: 'Done All Items' },
  kds_reopen: { sw: 'Rudisha Jikoni', en: 'Reopen Order' },
  kds_clear_closed: { sw: 'Futa Tiketi Zilizomalizika', en: 'Clear Completed' },
  kds_cooking_time: { sw: 'Muda wa Kupika', en: 'Target Cook Time' },
  kds_ready_at_pass: { sw: 'Tayari Kwenye Kaunta ya Kutolea', en: 'Ready at Pass' },

  // ── Inventory & Store ──
  inv_stock_items: { sw: 'Bidhaa za Stoo', en: 'Stock Items' },
  inv_fast_drinks: { sw: 'Vinywaji & Mauzo ya Moja kwa Moja', en: 'Fast Drinks & Resale' },
  inv_fast_purchase: { sw: 'Nunua Mzigo Haraka', en: 'Fast Purchase' },
  inv_fast_transfer: { sw: 'Hamisha Mzigo (Stoo kwenda Baa/Jikoni)', en: 'Fast Transfer' },
  inv_crates_ledger: { sw: 'Daftari la Makreti na Chupa Tupu', en: 'Crates & Bottles Ledger' },
  inv_receiving_po: { sw: 'Kupokea Mzigo wa LPO', en: 'Receive Purchase Orders' },
  inv_stock_count: { sw: 'Hesabu ya Mzigo (Stock Take)', en: 'Cycle Stock Count' },
  inv_on_hand: { sw: 'Zilizopo Stoo', en: 'On Hand' },
  inv_bar_qty: { sw: 'Zilizopo Baa', en: 'In Bar' },
  inv_kitchen_qty: { sw: 'Zilizopo Jikoni', en: 'In Kitchen' },
  inv_main_store: { sw: 'Stoo Kuu', en: 'Main Store' },
  inv_reorder_level: { sw: 'Kiwango cha Kuagiza Tena', en: 'Reorder Level' },
  inv_unit_cost: { sw: 'Gharama ya Kununua', en: 'Unit Cost' },
  inv_selling_price: { sw: 'Bei ya Kuuza', en: 'Selling Price' },
  inv_crate: { sw: 'Kreti', en: 'Crate' },
  inv_single: { sw: 'Chupa Moja / Kipande', en: 'Single Unit' },

  // ── Accounting & Financials ──
  acc_pnl: { sw: 'Taarifa ya Mapato na Matumizi (P&L)', en: 'Profit & Loss Statement (P&L)' },
  acc_cashflow: { sw: 'Mzunguko wa Fedha Taslimu (Cash Flow)', en: 'Cash Flow Intelligence' },
  acc_expenses: { sw: 'Matumizi ya Kila Siku', en: 'Operating Expenses' },
  acc_revenue: { sw: 'Mapato ya Vyakula na Vinywaji', en: 'F&B Gross Revenue' },
  acc_cogs: { sw: 'Gharama za Vyakula na Vinywaji (COGS)', en: 'Cost of Goods Sold (COGS)' },
  acc_gross_margin: { sw: 'Faida Ghafi', en: 'Gross Profit' },
  acc_net_profit: { sw: 'Faida Halisi Baada ya Gharama', en: 'Net Operating Profit' },
  acc_record_expense: { sw: 'Weka Matumizi Mapya', en: 'Record Expense' },

  // ── Actions & Modals ──
  btn_save: { sw: 'Hifadhi', en: 'Save' },
  btn_cancel: { sw: 'Ghairi', en: 'Cancel' },
  btn_confirm: { sw: 'Thibitisha', en: 'Confirm' },
  btn_close: { sw: 'Funga', en: 'Close' },
  btn_delete: { sw: 'Futa', en: 'Delete' },
  btn_edit: { sw: 'Hariri', en: 'Edit' },
  btn_back: { sw: 'Rudi Nyuma', en: 'Back' },
  btn_sign_out: { sw: 'Ondoka Kwenye Akaunti', en: 'Sign Out' },
  btn_submit: { sw: 'Wasilisha', en: 'Submit' },
  btn_view_details: { sw: 'Tazama Undani', en: 'View Details' },
  btn_export_csv: { sw: 'Pakua CSV / Excel', en: 'Export CSV / Excel' },
  btn_install_pwa: { sw: 'Sakinisha Kwenye Simu (App)', en: 'Install App (PWA)' },

  // ── General Phrases ──
  loading: { sw: 'Inapakia...', en: 'Loading...' },
  no_records: { sw: 'Hakuna taarifa zilizopatikana', en: 'No records found' },
  all_rights: { sw: 'Haki zote zimehifadhiwa', en: 'All rights reserved' }
};

// Main translator function
export function t(key, lang = DEFAULT_LANG) {
  const currentLang = (lang === 'sw' || lang === 'en') ? lang : DEFAULT_LANG;
  const entry = DICTIONARY[key];
  if (!entry) return key;
  return entry[currentLang] || entry['sw'] || entry['en'] || key;
}

// Swahili translations for standard menu items
export const MENU_SW = {
  1: { n: 'Kuku Choma / Kuku wa Kuoka', d: 'Nusu kuku aliyeokwa na limao, kitunguu saumu, rosemary na viungo safi. Anakuja na mchuzi pembeni.' },
  2: { n: 'Mishkaki ya Nyama Ng\'ombe', d: 'Mishkaki laini ya nyama ya ng\'ombe iliyochomwa kwenye makaa na kachumbari safi na limao.' },
  3: { n: 'Samaki Sato wa Kupaka / Kuchoma', d: 'Samaki sato mzima toka Ziwa Victoria aliyepikwa na mchuzi mzito wa nazi na ukwaju, akisindikizwa na wali au ugali.' },
  4: { n: 'Baga ya Nyama (Steakhouse)', d: 'Nyama ya ng\'ombe ya gramu 200, jibini ya cheddar, vitunguu vilivyokaangwa na mchuzi wa BBQ kwenye mkate wa brioche.' },
  5: { n: 'Baga ya Kuku Mkavu', d: 'Kifua cha kuku kilichokaangwa kwa umahiri, pilipili za jalapeño, saladi ya kabichi na sosi ya kitunguu saumu.' },
  6: { n: 'Chipsi Masala Zenye Viungo', d: 'Chipsi zilizokaangwa vizuri na kukorogwa na masala ya ukwaju, giligilani safi na ndimu.' },
  7: { n: 'Pilau ya Nyama ya Ng\'ombe', d: 'Mchele safi wa basmati uliopikwa kwenye mchuzi mzito wa nyama ya ng\'ombe na viungo asilia vya Kitanzania.' },
  8: { n: 'Juisi ya Embe Mbichi', d: 'Juisi ya maembe matamu toka Kilombero iliyotengenezwa hapo hapo bila kuongezwa sukari wala maji.' },
  9: { n: 'Juisi ya Pasheni Baridi', d: 'Pasheni safi ya kienyeji iliyochanganywa na majani ya mnanaa, barafu na limao.' },
  10: { n: 'Chai ya Maziwa na Viungo', d: 'Maziwa safi ya ng\'ombe yaliyochemshwa taratibu na iliki, tangawizi, karafuu na majani ya chai ya Kitanzania.' },
  11: { n: 'Keki ya Chokoleti Moto', d: 'Keki ya chokoleti nzito yenye chokoleti inayotiririka katikati, inasindikizwa na aiskrimu ya vanila.' },
  12: { n: 'Tati ya Nazi ya Kizanzibari', d: 'Nazi safi ya kukaangwa ya Zanzibar iliyookwa kwenye keki nyepesi na siagi safi.' },
  13: { n: 'Maji ya Kilimanjaro 500ml', d: 'Maji baridi ya asili ya madini toka mlima Kilimanjaro.' },
  14: { n: 'Soda ya Coca-Cola Zero 330ml', d: 'Soda baridi ya kopo ya Coca-Cola Zero Sugar inayoambatana na kipande cha limao na barafu.' },
  15: { n: 'Bia ya Safari Premium 500ml', d: 'Bia maarufu ya Kitanzania ya shayiri iliyopozwa vizuri.' },
  16: { n: 'Biriani ya Kuku', d: 'Wali wa basmati wa zafarani uliotandikwa na kuku laini aliyekolea viungo na mchuzi wa mtindi (raita).' },
  17: { n: 'Baga ya Jibini (Cheese Burger)', d: 'Baga tamu ya nyama ya ng\'ombe iliyochomwa kwenye makaa na jibini iliyoyeyuka, saladi na sosi.' },
  18: { n: 'Piza ya Mozzarella', d: 'Piza ya unga mwepesi wa kuoka kwenye tanuri na jibini safi ya mozzarella, nyanya na basil.' },
  19: { n: 'Juisi ya Ndizi na Maziwa', d: 'Smoothie baridi ya ndizi mbivu zilizochanganywa na maziwa safi, asali ya nyuki na lozi.' },
  20: { n: 'Kuku wa Vipande Vidogo (Nuggets)', d: 'Vipande laini vya kuku vilivyofunikwa na unga mkavu na kukaangwa hadi vikawa vya dhahabu.' },
  21: { n: 'Sandwichi ya Mbogamboga', d: 'Sandwichi ya mkate wa ngano iliyojaa mbogamboga zilizochomwa, jibini ya mozzarella na pesto.' },
  22: { n: 'Pakora za Mboga', d: 'Vitafunio vikavu vya vitunguu na mchicha vilivyochanganywa na unga wa dengu na kukaangwa.' },
  23: { n: 'Jibini ya Tandoori (Paneer)', d: 'Vipande vya jibini ya tandoori vilivyochomwa na pilipili hoho na vitunguu maji.' },
  24: { n: 'Pasta ya Kiitaliano', d: 'Tambi safi zilizopikwa na mchuzi wa nyanya, jibini ya parmesan na mafuta ya mzeituni.' },
  25: { n: 'Saladi Safi ya Bustani', d: 'Majani safi ya saladi, mchicha mdogo, parachichi, nyanya ndogo, zeituni na sosi ya limao.' },
  26: { n: 'Tambi za Kamba (Pad Thai)', d: 'Tambi zilizokaangwa na kamba safi wa baharini, machipukizi ya maharage, karanga na limao.' },
  27: { n: 'Nyama ya Steak Maalum', d: 'Kipande cha nyama safi ya ng\'ombe kilichochomwa kwenye moto mkali na siagi ya viungo.' },
  28: { n: 'Piza ya Jibini ya New York', d: 'Piza kubwa ya jibini nyingi ya mozzarella na sosi ya marinara.' },
  29: { n: 'Chai ya Kijani ya Matcha', d: 'Chai ya kijani ya Kijapani iliyochapwa na maziwa moto ya mvuke.' },
  30: { n: 'Soda ya Coca Cola 250ml', d: 'Soda ya chupa ya kioo ya Coca Cola iliyopozwa vizuri.' },
  31: { n: 'Ndoo ya Bia 6 (Safari)', d: 'Ndoo yenye bia 6 za Safari Lager baridi zilizowekwa kwenye barafu.' },
  32: { n: 'Soda 500ml (Coke/Fanta/Sprite)', d: 'Soda baridi ya nusu lita. Chagua Coca-Cola, Fanta au Sprite.' },
  33: { n: 'Katoni ya Maji 12 (500ml)', d: 'Katoni nzima ya maji 12 ya Kilimanjaro yaliyofungwa.' },
  34: { n: 'Bia ya Castle Lite 330ml', d: 'Bia baridi sana ya Castle Lite chupa ya 330ml.' },
  35: { n: 'Kinywaji cha Nguvu cha Red Bull', d: 'Kopo baridi la kinywaji cha kuongeza nguvu cha Red Bull 250ml.' }
};

// Helper to get localized menu item name
export function getMenuName(item, lang = DEFAULT_LANG) {
  if (!item) return '';
  if (lang === 'sw' && MENU_SW[item.id]?.n) {
    return MENU_SW[item.id].n;
  }
  return item.n || item.name || '';
}

// Helper to get localized menu item description
export function getMenuDesc(item, lang = DEFAULT_LANG) {
  if (!item) return '';
  if (lang === 'sw' && MENU_SW[item.id]?.d) {
    return MENU_SW[item.id].d;
  }
  return item.d || item.description || '';
}

// Helper to get localized category name
export function getCategoryName(cat, lang = DEFAULT_LANG) {
  if (lang !== 'sw') return cat;
  const map = {
    'All': 'Vyote',
    'Snacks': 'Vitafunio',
    'Pizza': 'Piza',
    'Burgers': 'Baga',
    'Grills': 'Choma / Nyama',
    'Pastas': 'Pasta',
    'Salads': 'Saladi',
    'Drinks': 'Vinywaji',
    'Desserts': 'Vitindamlo',
    'Sides': 'Vyakula vya Pembeni'
  };
  return map[cat] || cat;
}

// Helper to get localized status label
export function getStatusLabel(st, lang = DEFAULT_LANG) {
  if (lang !== 'sw') {
    const enMap = {
      placed: 'Placed',
      accepted: 'Accepted by Kitchen',
      preparing: 'Preparing in Kitchen',
      ready: 'Ready at Pass',
      served: 'Served at Table',
      billreq: 'Bill Requested',
      paid: 'Paid & Verified',
      closed: 'Closed & Archived',
      cancelled: 'Cancelled'
    };
    return enMap[st] || st;
  }
  const swMap = {
    placed: 'Oda Imepokelewa',
    accepted: 'Imethibitishwa Jikoni',
    preparing: 'Inapikwa Sasa',
    ready: 'Iko Tayari Mezani',
    served: 'Imehudumiwa Mezani',
    billreq: 'Bili Inaombwa',
    paid: 'Imelipwa Kamili',
    closed: 'Imefungwa',
    cancelled: 'Imeghairiwa'
  };
  return swMap[st] || st;
}
