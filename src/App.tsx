import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  Send,
  Settings,
  Table2,
  Target,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';

const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwJEvFeGKjqMBN7F-olcwgyY2_50mSu1YGlgmEH9KBXDTwjeZ6kzm_juClAdcs2qhZK/exec';
const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'VIM2026';
const STATUS_IN_PROGRESS = 'درحال تشکیل پرونده';
const COMPANY_LOGO_URL = 'https://lh3.googleusercontent.com/d/16WvKdNWQ5Gps-5XDj_0Ve4gwmc5ChYnS=w1000';
const FALLBACK_AVATAR = COMPANY_LOGO_URL;
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;
const INACTIVITY_WARN_AT = 4 * 60 * 1000;
const CHAT_POLL_INTERVAL = 5000;

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

type ChatMessage = {
  id: string;
  user_identifier: string;
  country: string | null;
  sender: 'user' | 'admin';
  message: string;
  is_read: boolean;
  created_at: string;
};

type RecordData = Record<string, unknown>;
type Country = { name: string; code: string; record: RecordData; applied: boolean };

const countryCodeMap: Record<string, string> = {
  'united kingdom': 'gb', 'uk': 'gb', 'great britain': 'gb', 'canada': 'ca', 'australia': 'au',
  'germany': 'de', 'france': 'fr', 'japan': 'jp', 'brazil': 'br', 'iran': 'ir', 'turkey': 'tr',
  'usa': 'us', 'united states': 'us', 'america': 'us', 'italy': 'it', 'spain': 'es',
  'netherlands': 'nl', 'holland': 'nl', 'sweden': 'se', 'norway': 'no', 'switzerland': 'ch',
  'austria': 'at', 'india': 'in', 'china': 'cn', 'russia': 'ru', 'pakistan': 'pk',
  'afghanistan': 'af', 'iraq': 'iq', 'syria': 'sy', 'lebanon': 'lb', 'saudi arabia': 'sa',
  'uae': 'ae', 'united arab emirates': 'ae', 'qatar': 'qa', 'kuwait': 'kw', 'egypt': 'eg',
  'morocco': 'ma', 'algeria': 'dz', 'tunisia': 'tn', 'sudan': 'sd', 'south africa': 'za',
  'nigeria': 'ng', 'kenya': 'ke', 'mexico': 'mx', 'argentina': 'ar', 'chile': 'cl',
  'colombia': 'co', 'peru': 'pe', 'greece': 'gr', 'portugal': 'pt', 'belgium': 'be',
  'finland': 'fi', 'denmark': 'dk', 'poland': 'pl', 'ireland': 'ie', 'iceland': 'is',
  'ukraine': 'ua', 'georgia': 'ge', 'armenia': 'am', 'azerbaijan': 'az', 'kazakhstan': 'kz',
  'south korea': 'kr', 'korea': 'kr', 'thailand': 'th', 'vietnam': 'vn', 'malaysia': 'my',
  'singapore': 'sg', 'indonesia': 'id', 'philippines': 'ph', 'bangladesh': 'bd',
  'sri lanka': 'lk', 'nepal': 'np', 'taiwan': 'tw', 'hong kong': 'hk',
};

function getCountryCode(name: string): string {
  return countryCodeMap[name.toLowerCase().trim()] || '';
}

function getColKey(headers: string[], idx: number): string | undefined {
  return idx >= 0 && idx < headers.length ? headers[idx] : undefined;
}

function isValidUrl(str: string): boolean {
  if (!str) return false;
  try {
    const url = new URL(str.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function whatsappLink(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

function getProgressPct(statusJ: string): number {
  const trimmed = statusJ.trim();
  if (!trimmed) return 0;
  if (trimmed === STATUS_IN_PROGRESS) return 30;
  if (trimmed.toUpperCase().includes('APPLIED') || trimmed.toUpperCase().includes('COMPLETED') || trimmed.toUpperCase().includes('DONE') || trimmed.toUpperCase().includes('APPROVED')) return 100;
  return 30;
}

function getStatusSticker(statusJ: string): { type: 'gold' | 'default' | 'red'; label: string } {
  const trimmed = statusJ.trim();
  if (trimmed === STATUS_IN_PROGRESS) return { type: 'gold', label: STATUS_IN_PROGRESS };
  if (trimmed) return { type: 'default', label: trimmed };
  return { type: 'red', label: '' };
}

const embassyData: { country: string; flag: string; embassies: { name: string; city: string; address: string; phone: string; email: string; website: string; hours: string; emergency: string }[] }[] = [
  {
    country: 'United States', flag: 'us',
    embassies: [
      { name: 'U.S. Embassy in Berlin', city: 'Berlin', address: 'Clayallee 170, 14195 Berlin, Germany', phone: '+49-30-8305-0', email: 'berlininfo@state.gov', website: 'https://de.usembassy.gov/embassy-consulates/berlin/', hours: 'Mon-Fri 8:00-17:00', emergency: '+49-30-8305-0 (after hours)' },
      { name: 'U.S. Embassy in London', city: 'London', address: '24 Grosvenor Square, London W1A 1AE, UK', phone: '+44-20-7499-9000', email: 'londoncons@state.gov', website: 'https://uk.usembassy.gov/embassy/consulates/london/', hours: 'Mon-Fri 8:00-17:00', emergency: '+44-20-7499-9000 (after hours)' },
    ],
  },
  {
    country: 'United Kingdom', flag: 'gb',
    embassies: [
      { name: 'British Embassy in Berlin', city: 'Berlin', address: 'Wilhelmstraße 70, 10117 Berlin, Germany', phone: '+49-30-20457-0', email: 'berlin@fco.gov.uk', website: 'https://www.gov.uk/world/organisations/british-embassy-berlin', hours: 'Mon-Fri 9:00-17:00', emergency: '+49-30-20457-0' },
      { name: 'British Embassy in Washington', city: 'Washington D.C.', address: '3100 Massachusetts Ave NW, Washington, DC 20008, USA', phone: '+1-202-588-6500', email: 'info@britishembassy.org', website: 'https://www.gov.uk/world/organisations/british-embassy-washington', hours: 'Mon-Fri 9:00-17:00', emergency: '+1-202-588-6500' },
    ],
  },
  {
    country: 'Germany', flag: 'de',
    embassies: [
      { name: 'German Embassy in Washington', city: 'Washington D.C.', address: '4645 Reservoir Rd NW, Washington, DC 20007, USA', phone: '+1-202-298-4000', email: 'info@germany.info', website: 'https://www.germany.info/us-en/embassy', hours: 'Mon-Fri 8:30-17:00', emergency: '+1-202-298-4000' },
      { name: 'German Embassy in London', city: 'London', address: '23 Belgrave Square, London SW1X 8PZ, UK', phone: '+44-20-7824-1300', email: 'info@london.diplo.de', website: 'https://www.diplo.de/uk-en', hours: 'Mon-Fri 9:00-17:00', emergency: '+44-20-7824-1300' },
    ],
  },
  {
    country: 'France', flag: 'fr',
    embassies: [
      { name: 'French Embassy in Washington', city: 'Washington D.C.', address: '4101 Reservoir Rd NW, Washington, DC 20007, USA', phone: '+1-202-944-6000', email: 'info@ambafrance-us.org', website: 'https://fr.usembassy.gov/embassy/', hours: 'Mon-Fri 9:00-17:00', emergency: '+1-202-944-6000' },
      { name: 'French Embassy in London', city: 'London', address: '58 Knightsbridge, London SW1X 7JT, UK', phone: '+44-20-7024-1800', email: 'info@ambafrance-uk.org', website: 'https://www.ambafrance-uk.org/', hours: 'Mon-Fri 9:00-17:00', emergency: '+44-20-7024-1800' },
    ],
  },
  {
    country: 'Canada', flag: 'ca',
    embassies: [
      { name: 'Canadian Embassy in Washington', city: 'Washington D.C.', address: '501 Pennsylvania Ave NW, Washington, DC 20001, USA', phone: '+1-202-682-1740', email: 'was@international.gc.ca', website: 'https://www.international.gc.ca/country-pays/us-eu/embassy-ambassade.aspx', hours: 'Mon-Fri 8:30-17:00', emergency: '+1-202-682-1740' },
      { name: 'Canadian Embassy in Berlin', city: 'Berlin', address: 'Leipziger Platz 17, 10117 Berlin, Germany', phone: '+49-30-20312-0', email: 'berl@international.gc.ca', website: 'https://www.international.gc.ca/country-pays/de/embassy-ambassade.aspx', hours: 'Mon-Fri 8:30-17:00', emergency: '+49-30-20312-0' },
    ],
  },
  {
    country: 'Italy', flag: 'it',
    embassies: [
      { name: 'Italian Embassy in Washington', city: 'Washington D.C.', address: '3000 Whitehaven St NW, Washington, DC 20008, USA', phone: '+1-202-612-4400', email: 'info@ambwashington.esteri.it', website: 'https://ambwashington.esteri.it/ambasciata_washington/', hours: 'Mon-Fri 9:00-17:00', emergency: '+1-202-612-4400' },
    ],
  },
  {
    country: 'Spain', flag: 'es',
    embassies: [
      { name: 'Spanish Embassy in Washington', city: 'Washington D.C.', address: '2375 Pennsylvania Ave NW, Washington, DC 20037, USA', phone: '+1-202-728-2340', email: 'emb.washington@maec.es', website: 'https://www.exteriores.gob.es/embajadas/washington/', hours: 'Mon-Fri 9:00-17:00', emergency: '+1-202-728-2340' },
    ],
  },
  {
    country: 'Netherlands', flag: 'nl',
    embassies: [
      { name: 'Dutch Embassy in Washington', city: 'Washington D.C.', address: '4200 Linnean Ave NW, Washington, DC 20008, USA', phone: '+1-202-274-2700', email: 'was@minbuza.nl', website: 'https://www.netherlandsandyou.nl/your-country-and-the-netherlands/united-states', hours: 'Mon-Fri 9:00-17:00', emergency: '+1-202-274-2700' },
    ],
  },
  {
    country: 'Sweden', flag: 'se',
    embassies: [
      { name: 'Swedish Embassy in Washington', city: 'Washington D.C.', address: '2900 K St NW, Washington, DC 20007, USA', phone: '+1-202-467-2600', email: 'ambassaden.washington@gov.se', website: 'https://www.swedenabroad.se/embassies/usa/washington/', hours: 'Mon-Fri 9:00-17:00', emergency: '+1-202-467-2600' },
    ],
  },
  {
    country: 'Australia', flag: 'au',
    embassies: [
      { name: 'Australian Embassy in Washington', city: 'Washington D.C.', address: '1601 Massachusetts Ave NW, Washington, DC 20036, USA', phone: '+1-202-797-3000', email: 'embassy.washington@dfat.gov.au', website: 'https://www.dfat.gov.au/missions/countries/us/embassy-washington', hours: 'Mon-Fri 8:30-17:00', emergency: '+1-202-797-3000' },
    ],
  },
];

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.497.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

function CountryFlag({ code, name, size = 22 }: { code: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err || !code) {
    return <span className="flag-fallback" style={{ width: size, height: size, fontSize: size * 0.5 }}>&#127760;</span>;
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={name}
      width={size}
      height={size}
      className="country-flag-img"
      onError={() => setErr(true)}
    />
  );
}

const demoRecords: RecordData[] = [
  {
    NAME: 'Dobby', LASTNAME: 'VIM', Country: 'United Kingdom',
    Passport: 'P12345678', Email: 'dobby@example.com', Phone: '+447123456789',
    Status: 'APPLIED', NO_INTERNAL: 'This column should be hidden',
    'UPDATE MSG': 'Your case file is ready for the next review.',
    Date: '2026-08-20', Link: 'https://www.gov.uk/visa-immigration',
    Category: 'Refugee', Priority: 'High', NO_REMARKS: 'Internal note - hidden from user',
    Assigned: 'Case Officer J. Smith',
    ProfileImage: COMPANY_LOGO_URL,
    UserMessage: 'I have submitted my passport copy. Please review my documents.',
    Report: 'CONFIDENTIAL CASE REPORT\n\nApplicant: Dobby VIM\nCountry: United Kingdom\nStatus: APPLIED\n\nCase Summary:\nThe applicant has submitted all required documentation for refugee status consideration. Initial review completed. Case file forwarded to the relevant authority for further processing.\n\nNext Steps:\n- Schedule interview with case officer\n- Verify supporting documents\n- Await decision from immigration authority\n\nCase Officer: J. Smith\nLast Updated: 2026-08-20',
  },
  {
    NAME: 'Dobby', LASTNAME: 'VIM', Country: 'Canada',
    Passport: 'P12345678', Email: 'dobby@example.com', Phone: '+14165551234',
    Status: 'APPLIED', NO_INTERNAL: 'This column should be hidden',
    'UPDATE MSG': 'Document review is complete. Await interview scheduling.',
    Date: '2026-08-22', Link: 'https://www.canada.ca/en/immigration',
    Category: 'Refugee', Priority: 'Medium', NO_REMARKS: 'Internal note - hidden from user',
    Assigned: 'Case Officer M. Brown',
    ProfileImage: COMPANY_LOGO_URL,
    UserMessage: 'When will my interview be scheduled? I have been waiting for 3 weeks.',
    Report: 'CONFIDENTIAL CASE REPORT\n\nApplicant: Dobby VIM\nCountry: Canada\nStatus: APPLIED\n\nCase Summary:\nCanadian visa application under review. All primary documents verified and accepted. Awaiting interview scheduling by the immigration office.\n\nNext Steps:\n- Schedule in-person interview\n- Complete biometric verification\n- Decision expected within 60 days\n\nCase Officer: M. Brown\nLast Updated: 2026-08-22',
  },
  {
    NAME: 'Dobby', LASTNAME: 'VIM', Country: 'Australia',
    Passport: 'P12345678', Email: 'dobby@example.com', Phone: '+61412345678',
    Status: 'درحال تشکیل پرونده', NO_INTERNAL: 'This column should be hidden',
    'UPDATE MSG': 'Your application is currently being processed. Our team is forming your case file.',
    Date: '', Link: '',
    Category: 'Refugee', Priority: 'Low', NO_REMARKS: 'Internal note - hidden from user',
    Assigned: 'Unassigned',
    ProfileImage: COMPANY_LOGO_URL,
    UserMessage: 'I would like to start my application for Australia. What documents do I need?',
    Report: 'CONFIDENTIAL CASE REPORT\n\nApplicant: Dobby VIM\nCountry: Australia\nStatus: درحال تشکیل پرونده\n\nCase Summary:\nApplication is currently being processed. Case file is being formed by our team. Document collection phase is in progress.\n\nNext Steps:\n- Collect required identification documents\n- Complete application form\n- Submit to Australian immigration authority\n\nCase Officer: Unassigned\nLast Updated: N/A',
  },
  {
    NAME: 'Dobby', LASTNAME: 'VIM', Country: 'Germany',
    Passport: 'P12345678', Email: 'dobby@example.com', Phone: '+49123456789',
    Status: '', NO_INTERNAL: 'This column should be hidden',
    'UPDATE MSG': 'No application has been registered for Germany yet. Please contact your immigration advisor to begin the process.',
    Date: '', Link: '',
    Category: 'Refugee', Priority: 'Low', NO_REMARKS: 'Internal note - hidden from user',
    Assigned: 'Unassigned',
    ProfileImage: COMPANY_LOGO_URL,
    UserMessage: '',
    Report: '',
  },
];

type Lang = 'en' | 'fa';

const t = {
  en: {
    dir: 'ltr' as const,
    loginHeader: 'Track Your Case',
    loginSub: 'Application Verification',
    passPh: 'Passport Number',
    secPh: 'Last 5 digits of Phone',
    loginBtn: 'Search Status',
    loginBtnLoading: 'Searching...',
    loginErrorEmpty: 'Please enter your passport and password.',
    loginErrorFail: 'Record not found or incorrect password.',
    loginErrorConn: 'Connection error. Please check your internet.',
    loginPowered: 'Powered by your Google Sheet workspace',
    secureAccess: 'SECURE ACCESS',
    workspace: 'WORKSPACE',
    dashboard: 'Dashboard',
    clientDir: 'Client Directory',
    reports: 'Reports',
    countries: 'COUNTRIES',
    helpCenter: 'Help center',
    mentor: 'Mentor',
    logOut: 'Log out',
    overview: 'Workspace overview',
    welcome: (n: string) => `Welcome, ${n}`,
    searchPh: 'Search anything...',
    preferences: 'Preferences',
    language: 'Language',
    restoreUpdate: 'Restore update message',
    gotIt: 'Got it',
    totalRecords: 'Total Records',
    appliedCountries: 'Applied Countries',
    pendingCountries: 'Pending Countries',
    caseOverview: 'CASE OVERVIEW',
    overviewTitle: 'Your case summary',
    yourProgress: 'Application Progress',
    applied: 'Applied',
    pending: 'Pending',
    caseStatus: 'Case Status',
    activeRegion: 'ACTIVE REGION',
    applications: 'applications',
    formPlaceholder: 'Your dynamic application form and sheet records will appear here.',
    schedule: 'Schedule',
    mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
    legendApplied: 'Applied',
    legendPending: 'Pending',
    upcoming: 'Update Messages',
    viewCalendar: 'View all',
    quickAction: 'QUICK ACTION',
    needHand: 'Need a hand?',
    quickDesc: 'Connect with your immigration team or review your case records.',
    openClientDir: 'Open client directory',
    showAll: 'Show all records',
    updateMsgTitle: 'Important Case Update Message',
    errorTitle: 'Search Error',
    errorDefault: 'No information found.',
    understood: 'I understand',
    noUpdates: 'No update messages available.',
    recordsCount: 'records',
    countriesCount: 'countries',
    progress: 'progress',
    notifications: 'Notifications',
    noNotifications: 'No notifications',
    liveMessages: 'Live Messages',
    noMessages: 'No messages available',
    reportTitle: 'Case Report',
    noReport: 'No report available for this record.',
    viewReport: 'View Report',
    viewUpdate: 'View Update',
    openLink: 'Open Link',
    contactWhatsapp: 'Contact via WhatsApp',
    viewForm: 'View Form',
    downloadForm: 'Download Form',
    formViewerTitle: 'Application Form',
    embassyTitle: 'Embassy & Consulate Information',
    embassySearchPh: 'Search country...',
    embassyPhone: 'Phone',
    embassyEmail: 'Email',
    embassyWebsite: 'Website',
    embassyAddress: 'Address',
    embassyHours: 'Hours',
    embassyEmergency: 'Emergency',
    statusInProgress: 'In Progress',
    noAppTitle: 'No Application Registered',
    noAppSubtitle: 'No application has been registered for this country yet.',
    noAppMsgLabel: 'Important Message',
    closeBtn: 'Close',
    inactivityTitle: 'Are you still there?',
    inactivityMsg: 'You have been inactive for a while. You will be logged out soon due to inactivity.',
    stayLoggedIn: 'Stay Logged In',
    chatPlaceholder: 'Type a message...',
    chatSend: 'Send',
    chatYou: 'You',
    chatAdmin: 'Admin',
    loadingText: 'Loading...',
  },
  fa: {
    dir: 'rtl' as const,
    loginHeader: 'پیگیری پرونده ویزا',
    loginSub: 'بررسی وضعیت درخواست',
    passPh: 'شماره پاسپورت',
    secPh: '۵ رقم آخر شماره تماس (رمز)',
    loginBtn: 'جستجوی وضعیت',
    loginBtnLoading: 'در حال جستجو...',
    loginErrorEmpty: 'لطفاً شماره پاسپورت و رمز عبور را وارد کنید.',
    loginErrorFail: 'اطلاعاتی با این مشخصات یافت نشد یا رمز عبور اشتباه است.',
    loginErrorConn: 'خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
    loginPowered: 'قدرت‌گرفته از فضای کاری Google Sheet شما',
    secureAccess: 'دسترسی امن',
    workspace: 'فضای کاری',
    dashboard: 'داشبورد',
    clientDir: 'فهرست مراجعین',
    reports: 'گزارش‌ها',
    countries: 'کشورها',
    helpCenter: 'مرکز راهنمایی',
    mentor: 'مشاور',
    logOut: 'خروج',
    overview: 'نمای کلی فضای کاری',
    welcome: (n: string) => `خوش آمدید، ${n}`,
    searchPh: 'جستجوی هر چیزی...',
    preferences: 'تنظیمات',
    language: 'زبان',
    restoreUpdate: 'بازیابی پیام به‌روزرسانی',
    gotIt: 'متوجه شدم',
    totalRecords: 'کل پرونده‌ها',
    appliedCountries: 'کشورهای درخواست‌شده',
    pendingCountries: 'کشورهای در انتظار',
    caseOverview: 'نمای کلی پرونده',
    overviewTitle: 'خلاصه پرونده شما',
    yourProgress: 'پیشرفت درخواست',
    applied: 'درخواست‌شده',
    pending: 'در انتظار',
    caseStatus: 'وضعیت پرونده',
    activeRegion: 'منطقه فعال',
    applications: 'درخواست‌ها',
    formPlaceholder: 'فرم درخواست پویا و پرونده‌های برگه شما در اینجا نمایش داده می‌شود.',
    schedule: 'برنامه',
    mon: 'دو', tue: 'سه', wed: 'چه', thu: 'پن', fri: 'جم', sat: 'شن', sun: 'یک',
    legendApplied: 'درخواست‌شده',
    legendPending: 'در انتظار',
    upcoming: 'پیام‌های به‌روزرسانی',
    viewCalendar: 'مشاهده همه',
    quickAction: 'اقدام سریع',
    needHand: 'کمک نیاز دارید؟',
    quickDesc: 'با تیم مهاجرتی خود ارتباط برقرار کنید یا پرونده‌های خود را بررسی کنید.',
    openClientDir: 'باز کردن فهرست مراجعین',
    showAll: 'نمایش عمومی تمام پرونده‌ها',
    updateMsgTitle: 'پیام مهم پرونده (Update Message)',
    errorTitle: 'خطا در جستجو',
    errorDefault: 'اطلاعاتی یافت نشد.',
    understood: 'متوجه شدم',
    noUpdates: 'پیام به‌روزرسانی موجود نیست.',
    recordsCount: 'پرونده',
    countriesCount: 'کشور',
    progress: 'پیشرفت',
    notifications: 'اعلان‌ها',
    noNotifications: 'اعلانی موجود نیست',
    liveMessages: 'پیام‌های زنده',
    noMessages: 'پیامی موجود نیست',
    reportTitle: 'گزارش پرونده',
    noReport: 'گزارشی برای این پرونده موجود نیست.',
    viewReport: 'مشاهده گزارش',
    viewUpdate: 'مشاهده به‌روزرسانی',
    openLink: 'باز کردن لینک',
    contactWhatsapp: 'تماس از طریق واتساپ',
    viewForm: 'نمایش فورم',
    downloadForm: 'دانلود فورم',
    formViewerTitle: 'فرم درخواست',
    embassyTitle: 'اطلاعات سفارت و کنسولگری',
    embassySearchPh: 'جستجوی کشور...',
    embassyPhone: 'تلفن',
    embassyEmail: 'ایمیل',
    embassyWebsite: 'وب‌سایت',
    embassyAddress: 'آدرس',
    embassyHours: 'ساعات کاری',
    embassyEmergency: 'اضطراری',
    statusInProgress: 'در حال انجام',
    noAppTitle: 'درخواستی ثبت نشده',
    noAppSubtitle: 'هنوز هیچ درخواستی برای این کشور ثبت نشده است.',
    noAppMsgLabel: 'پیام مهم',
    closeBtn: 'بستن',
    inactivityTitle: 'آیا هنوز آنجا هستید؟',
    inactivityMsg: 'برای مدتی غیرفعال بوده‌اید. به‌زودی به دلیل عدم فعالیت از سیستم خارج خواهید شد.',
    stayLoggedIn: 'بمانید',
    chatPlaceholder: 'پیام بنویسید...',
    chatSend: 'ارسال',
    chatYou: 'شما',
    chatAdmin: 'مدیر',
    loadingText: 'در حال بارگذاری...',
  },
};

function getMonthInfo(lang: Lang) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthNamesFa = ['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];
  const monthName = lang === 'fa' ? monthNamesFa[month] : monthNamesEn[month];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  return { year, month, monthName, firstDay: (firstDay + 6) % 7, daysInMonth, today };
}

function App() {
  const [language, setLanguage] = useState<Lang>('en');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [passport, setPassport] = useState('');
  const [password, setPassword] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpdate, setShowUpdate] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [activeNotif, setActiveNotif] = useState<{ country: string; code: string; message: string } | null>(null);
  const [showFormViewer, setShowFormViewer] = useState(false);
  const [showEmbassy, setShowEmbassy] = useState(false);
  const [embassySearch, setEmbassySearch] = useState('');
  const [showNoAppModal, setShowNoAppModal] = useState(false);

  const [appLoading, setAppLoading] = useState(true);
  const [showInactivityWarn, setShowInactivityWarn] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [globalUserData, setGlobalUserData] = useState<RecordData[]>([]);
  const [globalHeaders, setGlobalHeaders] = useState<string[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [userName, setUserName] = useState('');
  const [activeView, setActiveView] = useState<'form' | 'table'>('form');
  const [activeRecord, setActiveRecord] = useState<RecordData | null>(null);
  const [activeMenuIdx, setActiveMenuIdx] = useState(0);
  const [updateMsg, setUpdateMsg] = useState('');

  const L = t[language];
  const greeting = useMemo(() => L.welcome(userName || (language === 'fa' ? 'کاربر گرامی' : 'Dear User')), [L, userName, language]);
  const canSubmit = passport.trim() !== '' && password.trim() !== '';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const resetInactivity = useCallback(() => {
    if (!isLoggedIn) return;
    setShowInactivityWarn(false);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    warnTimerRef.current = setTimeout(() => setShowInactivityWarn(true), INACTIVITY_WARN_AT);
    inactivityTimerRef.current = setTimeout(() => {
      handleLogout();
      setShowInactivityWarn(false);
    }, INACTIVITY_TIMEOUT);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const events = ['mousemove', 'mousedown', 'click', 'keydown', 'touchstart', 'scroll', 'wheel'];
    const handler = () => resetInactivity();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetInactivity();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isLoggedIn, resetInactivity]);

  useEffect(() => {
    const t = setTimeout(() => setAppLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const userIdentifier = useMemo(() => {
    if (passport.trim()) return passport.trim();
    if (userName) return userName;
    return 'demo';
  }, [passport, userName]);

  const loadChatMessages = useCallback(async () => {
    if (!isLoggedIn || !userIdentifier) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_identifier', userIdentifier)
        .order('created_at', { ascending: true });
      if (error) return;
      if (data) {
        setChatMessages(data as ChatMessage[]);
        const unread = (data as ChatMessage[]).filter(m => m.sender === 'admin' && !m.is_read).length;
        setUnreadCount(unread);
      }
    } catch {
      /* ignore */
    }
  }, [isLoggedIn, userIdentifier]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadChatMessages();
    const interval = setInterval(loadChatMessages, CHAT_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isLoggedIn, loadChatMessages]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  async function sendChatMessage() {
    const text = chatInput.trim();
    if (!text || !userIdentifier) return;
    setChatSending(true);
    setChatInput('');
    try {
      const { error } = await supabase.from('chat_messages').insert({
        user_identifier: userIdentifier,
        country: activeCountryName || null,
        sender: 'user',
        message: text,
        is_read: false,
      });
      if (!error) loadChatMessages();
    } catch {
      /* ignore */
    } finally {
      setChatSending(false);
    }
  }

  function formatChatTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString(clockLocale, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  const countryKey = useMemo(() =>
    getColKey(globalHeaders, 1) || globalHeaders.find(h => h.toUpperCase().includes('COUNTRY')) || 'Country',
    [globalHeaders]);

  const phoneKey = useMemo(() =>
    globalHeaders.find(h => {
      const u = h.toUpperCase();
      return u.includes('PHONE') || u.includes('TEL') || u.includes('MOBILE') || u.includes('WHATSAPP');
    }), [globalHeaders]);

  const updateMsgKey = getColKey(globalHeaders, 8);
  const statusKey = getColKey(globalHeaders, 9);
  const linkKey = getColKey(globalHeaders, 10);
  const profileImageKey = getColKey(globalHeaders, 15);
  const userMsgKey = getColKey(globalHeaders, 16);
  const reportKey = getColKey(globalHeaders, 17);

  const displayHeaders = useMemo(() =>
    globalHeaders.filter(h => {
      if (h.toUpperCase().includes('NO')) return false;
      if (h === reportKey || h === profileImageKey || h === userMsgKey || h === updateMsgKey) return false;
      return true;
    }), [globalHeaders, reportKey, profileImageKey, userMsgKey, updateMsgKey]);

  const appliedCount = useMemo(() => countries.filter(c => {
    const sJ = statusKey ? String(c.record[statusKey] || '').trim() : '';
    return getProgressPct(sJ) === 100;
  }).length, [countries, statusKey]);
  const pendingCount = countries.length - appliedCount;
  const progressPct = useMemo(() => {
    if (countries.length === 0) return 0;
    const total = countries.reduce((sum, c) => {
      const sJ = statusKey ? String(c.record[statusKey] || '').trim() : '';
      return sum + getProgressPct(sJ);
    }, 0);
    return Math.round(total / countries.length);
  }, [countries, statusKey]);

  const notifications = useMemo(() => {
    if (!updateMsgKey) return [];
    return globalUserData
      .map((row, idx) => ({
        idx,
        country: String(row[countryKey] || `Record ${idx + 1}`),
        code: getCountryCode(String(row[countryKey] || '')),
        message: row[updateMsgKey] ? String(row[updateMsgKey]) : '',
      }))
      .filter(n => n.message);
  }, [globalUserData, updateMsgKey, countryKey]);

  const userMessages = useMemo(() => {
    if (!userMsgKey) return [];
    return globalUserData
      .map((row, idx) => ({
        idx,
        country: String(row[countryKey] || `Record ${idx + 1}`),
        code: getCountryCode(String(row[countryKey] || '')),
        message: row[userMsgKey] ? String(row[userMsgKey]) : '',
      }))
      .filter(m => m.message);
  }, [globalUserData, userMsgKey, countryKey]);

  const updateMessages = notifications;

  const activeProfileImage = activeRecord && profileImageKey ? String(activeRecord[profileImageKey] || '') : '';
  const activeReportContent = activeRecord && reportKey ? String(activeRecord[reportKey] || '') : '';
  const activePhone = activeRecord && phoneKey ? String(activeRecord[phoneKey] || '') : '';
  const activeCountryName = activeRecord ? String(activeRecord[countryKey] || '') : '';
  const activeCountryCode = getCountryCode(activeCountryName);
  const activeStatusJ = activeRecord && statusKey ? String(activeRecord[statusKey] || '') : '';
  const activeProgressPct = activeRecord ? getProgressPct(activeStatusJ) : 0;
  const activeSticker = activeRecord ? getStatusSticker(activeStatusJ) : { type: 'red', label: '' };
  const activeColIMsg = activeRecord && updateMsgKey ? String(activeRecord[updateMsgKey] || '') : '';
  const hasNoApp = activeRecord && activeSticker.type === 'red' && activeColIMsg.trim() !== '';

  const actionButtons = useMemo(() => {
    if (!activeRecord) return [];
    const buttons: { label: string; url: string }[] = [];
    const colIValue = updateMsgKey ? String(activeRecord[updateMsgKey] || '') : '';
    const colKValue = linkKey ? String(activeRecord[linkKey] || '') : '';
    if (isValidUrl(colIValue)) buttons.push({ label: L.viewUpdate, url: colIValue.trim() });
    if (isValidUrl(colKValue)) buttons.push({ label: L.openLink, url: colKValue.trim() });
    return buttons;
  }, [activeRecord, updateMsgKey, linkKey, L]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    const q = searchQuery.toLowerCase();
    return countries.filter(c => c.name.toLowerCase().includes(q));
  }, [countries, searchQuery]);

  function loadRecords(rows: RecordData[]) {
    setGlobalUserData(rows);
    const headers = Object.keys(rows[0]);
    setGlobalHeaders(headers);

    const cKey = getColKey(headers, 1) || headers.find(h => h.toUpperCase().includes('COUNTRY')) || 'Country';
    const sKey = getColKey(headers, 9) || headers.find(h => h.toUpperCase().includes('STATUS') || h.toUpperCase().includes('APPLIED'));

    setCountries(rows.map((row, index) => {
      const countryName = String(row[cKey] || `Record ${index + 1}`);
      const statusJ = sKey ? String(row[sKey] || '').trim() : '';
      const applied = statusJ !== '' && statusJ.toUpperCase() !== 'NO APPLIED';
      return { name: countryName, code: getCountryCode(countryName), record: row, applied };
    }));

    const firstRow = rows[0];
    const nameKey = headers.find(h => h.toUpperCase() === 'NAME');
    const lastNameKey = headers.find(h => h.toUpperCase() === 'LASTNAME');
    let name = nameKey ? `${firstRow[nameKey] || ''} ${lastNameKey ? firstRow[lastNameKey] || '' : ''}`.trim() : '';
    if (!name) name = String(firstRow[cKey] || '');
    setUserName(name);
    setActiveRecord(firstRow);
    setActiveMenuIdx(0);
    setActiveView('form');

    const uKey = getColKey(headers, 8);
    setUpdateMsg(uKey && firstRow[uKey] ? String(firstRow[uKey]) : '');
    setShowUpdate(true);
    setIsLoggedIn(true);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setErrorMsg(L.loginErrorEmpty);
      setShowError(true);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      if (passport.trim() === DEMO_USERNAME && password.trim() === DEMO_PASSWORD) {
        loadRecords(demoRecords);
        return;
      }
      const response = await fetch(`${GOOGLE_SHEETS_ENDPOINT}?passport=${encodeURIComponent(passport.trim())}&password=${encodeURIComponent(password.trim())}`);
      if (!response.ok) throw new Error('Request failed');
      const result: unknown = await response.json();
      const data = (result as { status?: string; data?: RecordData[]; message?: string }) || {};
      if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
        loadRecords(data.data);
      } else {
        setErrorMsg(data.message || L.loginErrorFail);
        setShowError(true);
      }
    } catch {
      setErrorMsg(L.loginErrorConn);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  }

  function selectCountry(idx: number) {
    setActiveMenuIdx(idx);
    setActiveView('form');
    setActiveRecord(countries[idx].record);
    setSidebarOpen(false);
    const uKey = getColKey(globalHeaders, 8);
    if (uKey && countries[idx].record[uKey]) {
      setUpdateMsg(String(countries[idx].record[uKey]));
      setShowUpdate(true);
    } else {
      setUpdateMsg('');
    }
    const sKey = getColKey(globalHeaders, 9);
    const statusJ = sKey ? String(countries[idx].record[sKey] || '').trim() : '';
    const colIMsg = uKey ? String(countries[idx].record[uKey] || '').trim() : '';
    if (statusJ === '' && colIMsg !== '') {
      setShowNoAppModal(true);
    } else {
      setShowNoAppModal(false);
    }
  }

  function showAllRecords() {
    setActiveMenuIdx(-1);
    setActiveView('table');
    setUpdateMsg('');
  }

  function openNotifModal(n: { country: string; code: string; message: string }) {
    setActiveNotif(n);
    setShowNotifModal(true);
    setShowNotifications(false);
  }

  function downloadForm() {
    if (!activeRecord) return;
    const headers = globalHeaders.filter(h => !h.toUpperCase().includes('NO'));
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Application Form - ${userName}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}h1{color:#1c819d}h2{color:#15233c;border-bottom:2px solid #e5ecf2;padding-bottom:8px}.field{margin-bottom:12px}.field label{display:block;font-size:11px;color:#8594a7;text-transform:uppercase;margin-bottom:4px}.field .val{font-size:14px;font-weight:500}.section{margin-bottom:30px}</style></head><body>`;
    html += `<h1>Application Form</h1><h2>${userName}</h2>`;
    html += `<div class="section"><h2>Personal Information</h2>`;
    headers.forEach(h => {
      const val = String(activeRecord[h] ?? '');
      if (val) html += `<div class="field"><label>${h}</label><div class="val">${val}</div></div>`;
    });
    html += `</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Application_Form_${userName.replace(/\s/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setGlobalUserData([]);
    setGlobalHeaders([]);
    setCountries([]);
    setUserName('');
    setActiveRecord(null);
    setPassport('');
    setPassword('');
    setSearchQuery('');
    setShowNotifications(false);
    setShowReports(false);
    setShowChat(false);
  }

  function switchLanguage(lang: Lang) {
    setLanguage(lang);
    setShowSettings(false);
  }

  const weekdays = [L.mon, L.tue, L.wed, L.thu, L.fri, L.sat, L.sun];
  const monthInfo = getMonthInfo(language);
  const clockLocale = language === 'fa' ? 'fa-IR' : undefined;
  const profileImg = activeProfileImage || FALLBACK_AVATAR;

  if (appLoading) {
    return (
      <div className="app-loader-screen" dir={L.dir}>
        <div className="app-loader-content">
          <img className="app-loader-logo" src={COMPANY_LOGO_URL} alt="Visa Immigration VIM" />
          <div className="app-loader-spinner" />
          <p>{L.loadingText}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="login-screen" dir={L.dir}>
        <div className="login-visual">
          <div className="login-slide s1" style={{ backgroundImage: `url(https://images.pexels.com/photos/4922086/pexels-photo-4922086.jpeg?auto=compress&cs=tinysrgb&h=900&w=600)` }} />
          <div className="login-slide s2" style={{ backgroundImage: `url(https://images.pexels.com/photos/2763394/pexels-photo-2763394.jpeg?auto=compress&cs=tinysrgb&h=900&w=600)` }} />
          <div className="login-overlay">
            <img className="login-brand-mark logo-image" src={COMPANY_LOGO_URL} alt="Visa Immigration VIM" />
            <h1 className="login-brand-title">Visa Immigration VIM</h1>
            <p>Follow & Manage your Refugee case file</p>
          </div>
          <div className="login-lang-switch">
            <button className={language === 'en' ? 'lang-active' : ''} onClick={() => setLanguage('en')}>EN</button>
            <button className={language === 'fa' ? 'lang-active' : ''} onClick={() => setLanguage('fa')}>فارسی</button>
          </div>
        </div>
        <div className="login-panel">
          <div className="login-form-wrap">
            <span className="eyebrow">{L.secureAccess}</span>
            <h2>{L.loginHeader}</h2>
            <p className="login-subtitle">{L.loginSub}</p>
            <form onSubmit={handleLogin}>
              <label className="login-field">
                <span>{L.passPh}</span>
                <input value={passport} onChange={(e) => setPassport(e.target.value)} placeholder={L.passPh} autoComplete="username" />
              </label>
              <label className="login-field">
                <span>{L.secPh}</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={L.secPh} autoComplete="current-password" />
              </label>
              <button className="login-submit" disabled={!canSubmit || loading}>
                {loading ? <><Loader2 size={16} className="spin" /> {L.loginBtnLoading}</> : L.loginBtn}
              </button>
            </form>
            <small className="login-powered">{L.loginPowered}</small>
            <small className="demo-credentials">Demo access: <strong>{DEMO_USERNAME}</strong> / <strong>{DEMO_PASSWORD}</strong></small>
          </div>
        </div>
        {loading && <div className="loading-overlay"><div className="spinner" /><p>{L.loginBtnLoading}</p></div>}
        {showError && (
          <div className="modal-backdrop" onMouseDown={() => setShowError(false)}>
            <div className="error-modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="error-icon"><TriangleAlert size={28} /></div>
              <h3>{L.errorTitle}</h3>
              <p>{errorMsg || L.errorDefault}</p>
              <button className="error-close" onClick={() => setShowError(false)}>{L.understood}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell" dir={L.dir}>
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <img className="brand-mark logo-image" src={COMPANY_LOGO_URL} alt="Visa Immigration VIM" />
          <div><strong>Visa Immigration</strong><span>VIM CRM</span></div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="sidebar-nav">
          <span className="nav-label">{L.workspace}</span>
          <button className="nav-item active"><LayoutDashboard size={18} /> <span>{L.dashboard}</span></button>
          <button className="nav-item" onClick={showAllRecords}><Users size={18} /> <span>{L.clientDir}</span><span className="nav-count">{globalUserData.length}</span></button>
          <button className="nav-item" onClick={() => setShowReports(true)}><FileText size={18} /> <span>{L.reports}</span></button>
          <button className="nav-item" onClick={() => setShowEmbassy(true)}><Building2 size={18} /> <span>{L.embassyTitle}</span></button>
          <span className="nav-label country-heading">{L.countries} <span>+{countries.length}</span></span>
          <button className={`nav-item show-all-btn ${activeMenuIdx === -1 ? 'active-menu' : ''}`} onClick={showAllRecords}>
            <Table2 size={16} /> <span>{L.showAll}</span>
          </button>
          <div className="country-list">
            {filteredCountries.map((country) => {
              const idx = countries.indexOf(country);
              return (
                <button key={idx} className={`country-item ${activeMenuIdx === idx ? 'selected' : ''}`} onClick={() => selectCountry(idx)}>
                  <CountryFlag code={country.code} name={country.name} size={20} />
                  <span className="country-name">{country.name}</span>
                  {((): JSX.Element => {
                    const row = country.record;
                    const sJ = statusKey ? String(row[statusKey] || '') : '';
                    const sticker = getStatusSticker(sJ);
                    if (sticker.type === 'gold') return <span className="badge-icon status-gold" title={sticker.label}><span className="sticker-dot" /></span>;
                    if (sticker.type === 'red') return <span className="badge-icon unregistered"><X size={11} /></span>;
                    return <span className="badge-icon registered"><Check size={11} /></span>;
                  })()}
                </button>
              );
            })}
          </div>
        </div>
        <div className="sidebar-bottom">
          <button className="help-link"><CircleHelp size={17} /> {L.helpCenter}</button>
          <div className="profile-card">
            <img src={profileImg} alt={userName} onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }} />
            <div className="profile-copy"><strong>{userName || 'User'}</strong><span>{L.mentor}</span></div>
            <button onClick={handleLogout} aria-label={L.logOut}><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <div className="welcome"><span>{L.overview}</span><h1>{greeting}</h1></div>
          <div className="top-actions">
            <div className="digital-clock">
              <Clock size={15} />
              <span className="clock-time">{currentTime.toLocaleTimeString(clockLocale)}</span>
              <span className="clock-date">{currentTime.toLocaleDateString(clockLocale, { month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="lang-switch-top">
              <button className={language === 'en' ? 'lang-active' : ''} onClick={() => switchLanguage('en')}>EN</button>
              <button className={language === 'fa' ? 'lang-active' : ''} onClick={() => switchLanguage('fa')}>فا</button>
            </div>
            <div className="search-box"><Search size={17} /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={L.searchPh} aria-label="Search" /></div>
            <button className="icon-button notification" onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }} aria-label="Notifications">
              <Bell size={19} />
              {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
            </button>
            <button className="icon-button" onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); }} aria-label="Settings"><Settings size={19} /></button>
            <button className="user-menu">
              <img src={profileImg} alt="User" onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }} />
              <span>{userName}</span>
              <ChevronDown size={15} />
            </button>
          </div>
          {showSettings && (
            <div className="settings-popover">
              <strong>{L.preferences}</strong>
              <label>{L.language}
                <select value={language} onChange={(e) => switchLanguage(e.target.value as Lang)}>
                  <option value="en">English</option>
                  <option value="fa">فارسی</option>
                </select>
              </label>
              <button onClick={() => setShowUpdate(true)}>{L.restoreUpdate}</button>
            </div>
          )}
          {showNotifications && (
            <div className="notification-dropdown">
              <strong>{L.notifications}</strong>
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div className="notification-item" key={n.idx} onClick={() => openNotifModal(n)}>
                    <CountryFlag code={n.code} name={n.country} size={28} />
                    <div className="notif-content">
                      <strong>{n.country}</strong>
                      <span>{n.message}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="notification-empty">{L.noNotifications}</div>
              )}
            </div>
          )}
        </header>

        <div className="content-wrap">
          {showUpdate && updateMsg && (
            <div className="update-banner" id="updateMsgCard">
              <div className="update-icon"><Target size={20} /></div>
              <div>
                <strong>{L.updateMsgTitle}</strong>
                <span>{updateMsg}</span>
              </div>
              <button onClick={() => setShowUpdate(false)}>{L.gotIt}</button>
              <X size={17} onClick={() => setShowUpdate(false)} className="banner-close" />
            </div>
          )}

          <section className="dashboard-grid">
            <div className="dashboard-main">
              <div className="stats-row">
                <div className="stat-card brand-stat">
                  <img className="orb logo-image" src={COMPANY_LOGO_URL} alt="VIM" />
                  <div><span>Visa Immigration</span><strong>CRM</strong></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green"><FileText size={21} /></div>
                  <div><span>{L.totalRecords}</span><strong>{globalUserData.length}</strong><small>{L.recordsCount}</small></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon blue"><Check size={21} /></div>
                  <div><span>{L.appliedCountries}</span><strong>{appliedCount}</strong><small>{L.countriesCount}</small></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon gold"><Clock size={21} /></div>
                  <div><span>{L.pendingCountries}</span><strong>{pendingCount}</strong><small>{L.countriesCount}</small></div>
                </div>
              </div>

              <div className="section-heading">
                <div><span className="eyebrow">{L.caseOverview}</span><h2>{L.overviewTitle}</h2></div>
              </div>
              <div className="performance-grid">
                <div className="progress-card">
                  <div className="progress-ring">
                    <svg viewBox="0 0 120 120">
                      <circle className="ring-bg" cx="60" cy="60" r="50" />
                      <circle className="ring-value" cx="60" cy="60" r="50" style={{ strokeDasharray: `${(progressPct / 100) * 314} 314` }} />
                    </svg>
                    <strong>{progressPct}%</strong>
                  </div>
                  <span>{L.yourProgress}</span>
                  <div className="progress-breakdown">
                    <div className="breakdown-item"><Check size={14} className="breakdown-icon applied" /> <span>{L.applied}: <strong>{appliedCount}</strong></span></div>
                    <div className="breakdown-item"><Clock size={14} className="breakdown-icon pending" /> <span>{L.pending}: <strong>{pendingCount}</strong></span></div>
                  </div>
                </div>
                <div className="team-progress">
                  <div className="team-title"><span>{L.caseStatus}</span><span>{L.progress}</span></div>
                  {countries.map((country, idx) => {
                    const row = country.record;
                    const sJ = statusKey ? String(row[statusKey] || '') : '';
                    const pct = getProgressPct(sJ);
                    return (
                      <div className="team-row" key={idx} onClick={() => selectCountry(idx)}>
                        <CountryFlag code={country.code} name={country.name} size={28} />
                        <div className="member-name"><strong>{country.name}</strong><span>{sJ.trim() === STATUS_IN_PROGRESS ? L.statusInProgress : (sJ.trim() ? sJ.trim() : L.pending)}</span></div>
                        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                        <strong className="rate-number">{pct}%</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="section-heading clients-heading">
                <div><span className="eyebrow">{L.clientDir}</span><h2>{L.showAll}</h2></div>
              </div>

              {activeView === 'form' && activeRecord && (
                <>
                  <div className="form-profile-header">
                    <img src={activeProfileImage || FALLBACK_AVATAR} alt={userName} onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }} />
                    <div className="form-profile-info">
                      <h3>{userName}</h3>
                      <div className="form-profile-country">
                        <CountryFlag code={activeCountryCode} name={activeCountryName} size={18} />
                        <span>{activeCountryName}</span>
                        {activeSticker.type === 'gold' && <span className="badge-icon status-gold" title={activeSticker.label}><span className="sticker-dot" /></span>}
                        {activeSticker.type === 'default' && <span className="badge-icon registered"><Check size={11} /></span>}
                        {activeSticker.type === 'red' && <span className="badge-icon unregistered"><X size={11} /></span>}
                      </div>
                    </div>
                    <div className="form-profile-actions">
                      {activePhone && (
                        <a href={whatsappLink(activePhone)} target="_blank" rel="noopener noreferrer" className="whatsapp-btn" title={L.contactWhatsapp}>
                          <WhatsAppIcon size={18} />
                        </a>
                      )}
                      <button className="view-form-btn" onClick={() => setShowFormViewer(true)}>
                        <Eye size={16} /> {L.viewForm}
                      </button>
                      {activeReportContent && (
                        <button className="report-btn" onClick={() => setShowReports(true)}>
                          <FileText size={16} /> {L.viewReport}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="active-progress-bar">
                    <div className="apb-label"><span>{L.yourProgress}</span><strong>{activeProgressPct}%</strong></div>
                    <div className="apb-track"><div className="apb-fill" style={{ width: `${activeProgressPct}%` }} /></div>
                  </div>

                  {actionButtons.length > 0 && (
                    <div className="action-buttons">
                      {actionButtons.map((btn, i) => (
                        <a key={i} href={btn.url} target="_blank" rel="noopener noreferrer" className="action-btn">
                          <ExternalLink size={15} /> {btn.label}
                        </a>
                      ))}
                    </div>
                  )}

                  <div id="applicationFormView" className="app-form-view">
                    {displayHeaders.map((header) => (
                      <div className="form-field-box" key={header}>
                        <label>{header}</label>
                        <div className="form-field-val">{String(activeRecord[header] ?? '')}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeView === 'table' && (
                <div id="tableWrapper" className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th className="th-avatar"></th>
                        {displayHeaders.map((h) => <th key={h}>{h}</th>)}
                        <th className="th-action"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalUserData.map((row, idx) => {
                        const phone = phoneKey ? String(row[phoneKey] || '') : '';
                        const img = profileImageKey ? String(row[profileImageKey] || '') : '';
                        return (
                          <tr key={idx}>
                            <td><img src={img || FALLBACK_AVATAR} className="table-avatar" alt="" onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }} /></td>
                            {displayHeaders.map((h) => <td key={h}>{String(row[h] ?? '')}</td>)}
                            <td>
                              {phone && (
                                <a href={whatsappLink(phone)} target="_blank" rel="noopener noreferrer" className="whatsapp-btn" title={L.contactWhatsapp}>
                                  <WhatsAppIcon size={14} />
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeView === 'form' && !activeRecord && (
                <div className="application-card">
                  <div><span className="eyebrow">{L.activeRegion}</span><h3>{L.applications}</h3><p>{L.formPlaceholder}</p></div>
                </div>
              )}
            </div>

            <aside className="right-rail">
              <div className="calendar-card">
                <div className="rail-title"><strong>{L.schedule}</strong><button><CalendarDays size={16} /> {monthInfo.monthName} <ChevronDown size={14} /></button></div>
                <div className="calendar-nav"><ChevronLeft size={15} /><strong>{monthInfo.monthName} {monthInfo.year}</strong><ChevronRight size={15} /></div>
                <div className="weekdays">{weekdays.map((d) => <span key={d}>{d}</span>)}</div>
                <div className="calendar-days">
                  {Array.from({ length: 42 }, (_, i) => {
                    const dayNum = i - monthInfo.firstDay + 1;
                    const isValid = dayNum >= 1 && dayNum <= monthInfo.daysInMonth;
                    const isToday = isValid && dayNum === monthInfo.today;
                    const isWeekend = i % 7 > 4;
                    return <span className={`${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`} key={i}>{isValid ? dayNum : ''}</span>;
                  })}
                </div>
                <div className="legend"><span><i className="blue-dot" />{L.legendApplied}</span><span><i className="red-dot" />{L.legendPending}</span></div>
              </div>

              <div className="rail-title upcoming-title"><strong>{L.upcoming}</strong><button className="text-button">{L.viewCalendar} <ChevronRight size={14} /></button></div>
              <div className="schedule-list">
                {updateMessages.length > 0 ? (
                  updateMessages.map((item) => (
                    <div className="schedule-item blue" key={item.idx} onClick={() => selectCountry(item.idx)}>
                      <div className="schedule-date"><CountryFlag code={item.code} name={item.country} size={24} /></div>
                      <span>{item.message}</span>
                      <ChevronRight size={15} />
                    </div>
                  ))
                ) : (
                  <div className="schedule-item empty"><span>{L.noUpdates}</span></div>
                )}
              </div>

              <div className="quick-action">
                <span>{L.quickAction}</span>
                <strong>{L.needHand}</strong>
                <p>{L.quickDesc}</p>
                <button onClick={() => showAllRecords()}>{L.openClientDir} <ChevronRight size={15} /></button>
              </div>
            </aside>
          </section>
        </div>
      </main>

      {showNotifModal && activeNotif && (
        <div className="modal-backdrop" onMouseDown={() => setShowNotifModal(false)}>
          <div className="notif-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <div className="notif-modal-header-left">
                <Bell size={20} />
                <h3>{L.notifications}</h3>
              </div>
              <button onClick={() => setShowNotifModal(false)}><X size={20} /></button>
            </div>
            <div className="notif-modal-body">
              <div className="notif-modal-country">
                <CountryFlag code={activeNotif.code} name={activeNotif.country} size={32} />
                <strong>{activeNotif.country}</strong>
              </div>
              <div className="notif-modal-message">
                <span className="notif-modal-msg-label">{L.updateMsgTitle}</span>
                <p>{activeNotif.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFormViewer && activeRecord && (
        <div className="modal-backdrop" onMouseDown={() => setShowFormViewer(false)}>
          <div className="form-viewer-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="form-viewer-header">
              <div className="form-viewer-header-left">
                <FileText size={20} />
                <h3>{L.formViewerTitle}</h3>
              </div>
              <div className="form-viewer-header-right">
                <button className="form-viewer-download" onClick={downloadForm}>
                  <Download size={16} /> {L.downloadForm}
                </button>
                <button onClick={() => setShowFormViewer(false)}><X size={20} /></button>
              </div>
            </div>
            <div className="form-viewer-meta">
              <img src={activeProfileImage || FALLBACK_AVATAR} alt={userName} onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }} />
              <div>
                <strong>{userName}</strong>
                <span className="form-viewer-country">
                  <CountryFlag code={activeCountryCode} name={activeCountryName} size={16} />
                  {activeCountryName}
                </span>
              </div>
            </div>
            <div className="form-viewer-content">
              {globalHeaders.filter(h => !h.toUpperCase().includes('NO')).map((header) => {
                const val = String(activeRecord[header] ?? '');
                if (!val) return null;
                return (
                  <div className="form-viewer-field" key={header}>
                    <label>{header}</label>
                    <div className="form-viewer-val">{val}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showEmbassy && (
        <div className="modal-backdrop" onMouseDown={() => setShowEmbassy(false)}>
          <div className="embassy-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="embassy-header">
              <div className="embassy-header-left">
                <Building2 size={20} />
                <h3>{L.embassyTitle}</h3>
              </div>
              <button onClick={() => setShowEmbassy(false)}><X size={20} /></button>
            </div>
            <div className="embassy-search-wrap">
              <Search size={16} />
              <input value={embassySearch} onChange={(e) => setEmbassySearch(e.target.value)} placeholder={L.embassySearchPh} />
            </div>
            <div className="embassy-content">
              {embassyData
                .filter(e => embassySearch.trim() === '' || e.country.toLowerCase().includes(embassySearch.toLowerCase()))
                .map((e) => (
                  <div className="embassy-country-card" key={e.country}>
                    <div className="embassy-country-header">
                      <img src={`https://flagcdn.com/w40/${e.flag}.png`} alt={e.country} className="country-flag-img" onError={(ev) => { ev.currentTarget.style.display = 'none'; }} />
                      <strong>{e.country}</strong>
                    </div>
                    {e.embassies.map((emb, i) => (
                      <div className="embassy-card" key={i}>
                        <div className="embassy-card-name">{emb.name}</div>
                        <div className="embassy-card-row"><MapPin size={13} /> <span>{emb.address}</span></div>
                        <div className="embassy-card-row"><Phone size={13} /> <a href={`tel:${emb.phone}`}>{emb.phone}</a></div>
                        <div className="embassy-card-row"><Mail size={13} /> <a href={`mailto:${emb.email}`}>{emb.email}</a></div>
                        <div className="embassy-card-row"><Globe size={13} /> <a href={emb.website} target="_blank" rel="noopener noreferrer">{emb.website}</a></div>
                        <div className="embassy-card-row"><Clock size={13} /> <span>{emb.hours}</span></div>
                        <div className="embassy-card-row embassy-emergency"><TriangleAlert size={13} /> <span>{emb.emergency}</span></div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {showNoAppModal && (
        <div className="modal-backdrop" onMouseDown={() => setShowNoAppModal(false)}>
          <div className="no-app-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="no-app-header">
              <div className="no-app-header-left">
                <CircleHelp size={22} />
                <h3>{L.noAppTitle}</h3>
              </div>
              <button onClick={() => setShowNoAppModal(false)}><X size={20} /></button>
            </div>
            <div className="no-app-body">
              <div className="no-app-icon"><CircleHelp size={36} /></div>
              <p className="no-app-subtitle">{L.noAppSubtitle}</p>
              <div className="no-app-message">
                <span className="no-app-msg-label">{L.noAppMsgLabel}</span>
                <p>{activeColIMsg}</p>
              </div>
              <button className="no-app-close" onClick={() => setShowNoAppModal(false)}>{L.closeBtn}</button>
            </div>
          </div>
        </div>
      )}

      {showReports && (
        <div className="modal-backdrop" onMouseDown={() => setShowReports(false)}>
          <div className="reports-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="reports-header">
              <div className="reports-header-left">
                <FileText size={20} />
                <h3>{L.reportTitle}</h3>
              </div>
              <button onClick={() => setShowReports(false)}><X size={20} /></button>
            </div>
            {activeRecord ? (
              <>
                <div className="reports-meta">
                  <img src={activeProfileImage || FALLBACK_AVATAR} alt={userName} onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }} />
                  <div className="reports-meta-info">
                    <strong>{userName}</strong>
                    <span className="reports-meta-country">
                      <CountryFlag code={activeCountryCode} name={activeCountryName} size={16} />
                      {activeCountryName}
                    </span>
                  </div>
                </div>
                <div className="reports-content">
                  {activeReportContent ? (
                    <p>{activeReportContent}</p>
                  ) : (
                    <p className="no-report-msg">{L.noReport}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="reports-content"><p className="no-report-msg">{L.noReport}</p></div>
            )}
          </div>
        </div>
      )}

      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-left">
              <img src={profileImg} alt={userName} className="chat-header-avatar" onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }} />
              <div className="chat-header-info">
                <strong>{L.liveMessages}</strong>
                <span>{userName}</span>
              </div>
            </div>
            <button onClick={() => setShowChat(false)}><X size={18} /></button>
          </div>
          <div className="chat-messages" ref={chatMessagesRef}>
            {chatMessages.length > 0 ? (
              chatMessages.map((m) => (
                <div key={m.id} className={`chat-bubble ${m.sender === 'user' ? 'chat-bubble-out' : 'chat-bubble-in'}`}>
                  <div className="chat-bubble-text">{m.message}</div>
                  <div className="chat-bubble-meta">
                    <span>{m.sender === 'user' ? L.chatYou : L.chatAdmin}</span>
                    <span>{formatChatTime(m.created_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="chat-empty">{L.noMessages}</div>
            )}
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              placeholder={L.chatPlaceholder}
              disabled={chatSending}
            />
            <button onClick={sendChatMessage} disabled={chatSending || !chatInput.trim()}>
              {chatSending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}

      {activePhone && (
        <a href={whatsappLink(activePhone)} target="_blank" rel="noopener noreferrer" className="floating-whatsapp" title={L.contactWhatsapp}>
          <WhatsAppIcon size={24} />
        </a>
      )}

      <button className={`floating-chat ${unreadCount > 0 ? 'chat-pulse' : ''}`} onClick={() => { setShowChat(!showChat); if (!showChat) setUnreadCount(0); }} aria-label={L.liveMessages}>
        <MessageCircle size={24} />
        {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
      </button>

      {showInactivityWarn && (
        <div className="modal-backdrop inactivity-backdrop">
          <div className="inactivity-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="inactivity-icon"><Clock size={32} /></div>
            <h3>{L.inactivityTitle}</h3>
            <p>{L.inactivityMsg}</p>
            <button className="inactivity-stay-btn" onClick={() => resetInactivity()}>{L.stayLoggedIn}</button>
          </div>
        </div>
      )}

      {showError && (
        <div className="modal-backdrop" onMouseDown={() => setShowError(false)}>
          <div className="error-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="error-icon"><TriangleAlert size={28} /></div>
            <h3>{L.errorTitle}</h3>
            <p>{errorMsg || L.errorDefault}</p>
            <button className="error-close" onClick={() => setShowError(false)}>{L.understood}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
