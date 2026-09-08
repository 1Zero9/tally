import type { CustomCategoryItem } from '../types/expense';
import { getCustomCategories } from './categories';

/**
 * Keyword → built-in category guesses, checked in order (first hit wins).
 * Substring match against an upper-cased description/name. Tuned for Irish
 * merchants; deliberately conservative — returns null rather than guess wildly.
 */
const RULES: { category: string; keywords: string[] }[] = [
  { category: 'transport', keywords: [
    'CIRCLE K', 'APPLEGREEN', 'MAXOL', 'TOP OIL', 'TEXACO', 'SHELL', 'ESSO', ' BP ', 'PETROL', 'FUEL', 'DIESEL',
    'EFLOW', 'M50', 'TOLL', 'PAYZONE', 'DUBLIN PORT', 'DART', 'LUAS', 'IARNROD', 'IRISH RAIL', 'BUS EIREANN',
    'DUBLIN BUS', 'LEAP CARD', 'PARK RITE', 'PARKRITE', 'NCPS', 'Q PARK', 'QPARK', 'APCOA', 'PARKING', 'PARKING TAG',
    'CAR SERVICE', 'TYRE', 'ADVANCE PITSTOP', ' NCT ', 'ROAD TAX',
  ]},
  { category: 'shopping', keywords: [
    'TESCO', 'DUNNES', 'LIDL', 'ALDI', 'SUPERVALU', 'CENTRA', 'SPAR', 'M&S FOOD', 'MARKS AND SPENCER FOOD',
    'GROCER', 'SUPERMARKET', 'IKEA', 'DEALZ', 'PENNEYS HOME', 'HOMESTORE', 'HALFORDS', 'WOODIES', 'B&Q', 'AMAZON',
  ]},
  { category: 'dining', keywords: [
    'STARBUCKS', 'COSTA', 'INSOMNIA', 'MCDONALD', 'SUPERMAC', ' KFC', 'BURGER KING', 'DELIVEROO', 'JUST EAT',
    'JUSTEAT', 'UBER EATS', 'UBEREATS', 'NANDO', 'DOMINO', 'PIZZA', 'CAFE', 'COFFEE', 'RESTAURANT', 'BISTRO',
    'DELI', 'BAKERY', 'CHIPPER', 'TAKEAWAY', 'EDDIE ROCKET', 'FIVE GUYS',
  ]},
  { category: 'entertainment', keywords: [
    'NETFLIX', 'SPOTIFY', 'DISNEY', 'APPLE.COM/BILL', 'APPLE TV', 'YOUTUBEPREMIUM', 'YOUTUBE PREMIUM', 'PRIME VIDEO',
    'NOW TV', 'AUDIBLE', 'PATREON', 'TWITCH', 'CINEMA', 'ODEON', 'OMNIPLEX', 'IMC ', 'DAZN', 'PLAYSTATION',
    'XBOX', 'NINTENDO', 'STEAM GAMES', 'STEAMGAMES',
  ]},
  { category: 'ai-tech', keywords: [
    'OPENAI', 'CHATGPT', 'ANTHROPIC', 'CLAUDE.AI', 'CURSOR', 'GITHUB', 'MIDJOURNEY', 'VERCEL', 'AWS', 'AMAZON WEB',
    'GOOGLE CLOUD', 'GCLOUD', 'DIGITALOCEAN', 'HEROKU', 'CLOUDFLARE', 'ADOBE', 'MICROSOFT 365', 'MSFT',
    'DROPBOX', 'NOTION', 'FIGMA', 'LINEAR.APP', 'RAYCAST', '1PASSWORD', 'NORDVPN',
  ]},
  { category: 'health', keywords: [
    'PHARMACY', ' BOOTS', 'HICKEY', 'LLOYDS', 'MCCABES', 'MCCAULEY', 'CHEMIST', 'DENTAL', 'DENTIST', 'DOCTOR',
    ' GP ', 'MEDICAL', 'PHYSIO', 'CHIROPRAC', 'OPTICIAN', 'SPECSAVERS', 'VISION EXPRESS', 'HOSPITAL', 'CLINIC',
  ]},
  { category: 'insurance', keywords: [
    'INSURANCE', ' AXA', 'AVIVA', 'ZURICH', 'ALLIANZ', ' FBD', '123.IE', 'LIBERTY INSURANCE', 'ITS4WOMEN',
    'VHI', 'LAYA', 'IRISH LIFE HEALTH', 'MOTOR TAX', 'NCTS',
  ]},
  { category: 'utilities', keywords: [
    'ELECTRIC IRELAND', 'BORD GAIS', 'SSE AIRTRICITY', 'ENERGIA', 'PINERGY', 'FLOGAS', 'PREPAYPOWER',
    ' EIR ', 'VODAFONE', ' THREE ', '3 IRELAND', 'VIRGIN MEDIA', ' SKY ', 'SKY IRELAND', 'GOMO', ' 48 ',
    'IRISH WATER', 'UISCE', 'TV LICENCE', 'BROADBAND',
  ]},
  { category: 'housing', keywords: [
    'RENT', 'MORTGAGE', 'PROPERTY TAX', ' LPT', 'MANAGEMENT FEE', 'MANAGEMENT COMPANY', 'MGMT FEE',
    'PANDA', 'GREYSTAR', 'CITY BIN', 'THORNTONS RECYCLING', 'BIN CHARGE', 'WASTE',
  ]},
  { category: 'education', keywords: [
    'SCHOOL', 'COLLEGE', 'UNIVERSITY', ' UCD', ' TCD', ' DCU', ' NUI', 'TUITION', 'CRECHE', 'CRÈCHE',
    'MONTESSORI', 'AFTERSCHOOL', 'AFTER SCHOOL', 'TUSLA', 'BOOK HAVEN', 'SCHOOLBOOKS',
  ]},
  { category: 'lifestyle', keywords: [
    ' GYM', 'LEISURE CENTRE', 'SWIM', 'GAA', 'SOCCER', 'FOOTBALL CLUB', 'TENNIS', 'DANCE', 'KARATE', 'JUDO',
    'SCOUTS', 'GIRL GUIDES', 'PARKRUN', 'FLYEFIT', 'BEN DUNNE', 'ICON HEALTH',
  ]},
  { category: 'personal', keywords: [
    'PENNEYS', 'PRIMARK', 'ZARA', ' H&M', 'HANDM', 'RIVER ISLAND', 'NEXT RETAIL', 'TK MAXX', 'TKMAXX',
    'BARBER', 'HAIR', 'SALON', 'BEAUTY', 'NAILS', ' SOAK', 'THE BODY SHOP', 'BOOTS BEAUTY', 'BROWN THOMAS',
    'SHOE', 'SCHUH', 'FOOTWEAR',
  ]},
  { category: 'travel', keywords: [
    'RYANAIR', 'AER LINGUS', 'AERLINGUS', 'AIRLINE', 'AIRPORT', 'BOOKING.COM', 'AIRBNB', 'HOTEL', 'HOSTEL',
    'EXPEDIA', 'TRIVAGO', 'TRAVEL REPUBLIC', 'CAR HIRE', 'EUROPCAR', 'HERTZ', 'IRISH FERRIES', 'STENA LINE',
  ]},
  { category: 'banking', keywords: [
    'ATM', 'CASH WITHDRAWAL', 'CSH WD', 'LODGEMENT', 'BANK CHARGE', 'MAINTAINING ACC', 'MAINTAIN ACC',
    'ACCOUNT FEE', 'OVERDRAFT', 'INTEREST', 'STAMP DUTY', 'GOVERNMENT DUTY', 'STMP DTY', 'CONTACTLESS FEE',
  ]},
  { category: 'pets', keywords: [
    ' VET', 'VETERINARY', 'PETSTOP', 'PET STOP', 'MAXI ZOO', 'PETMANIA', 'PET SHOP', 'PETWORLD', 'DOGGY',
  ]},
  { category: 'big-ticket', keywords: [
    'LOAN REPAYMENT', 'CREDIT UNION LOAN', 'PCP', 'HIRE PURCHASE', 'DID ELECTRICAL', 'CURRYS', 'HARVEY NORMAN',
  ]},
];

/**
 * Best-guess category id for a description / name. Tries the keyword rules
 * first, then the household's own custom category names (a significant word
 * of a custom category name appearing in the text). Returns null if nothing
 * is a confident match.
 */
export function suggestCategory(text: string | null | undefined, categoryRows?: CustomCategoryItem[]): string | null {
  if (!text) return null;
  const hay = ` ${text.toUpperCase().replace(/[^A-Z0-9&./ ]+/g, ' ').replace(/\s+/g, ' ')} `;

  for (const rule of RULES) {
    if (rule.keywords.some((k) => hay.includes(k.toUpperCase()))) return rule.category;
  }

  for (const c of getCustomCategories(categoryRows)) {
    const words = c.name.toUpperCase().split(/[^A-Z0-9]+/).filter((w) => w.length > 3);
    if (words.some((w) => hay.includes(` ${w}`) || hay.includes(`${w} `))) return c.id;
  }

  return null;
}
