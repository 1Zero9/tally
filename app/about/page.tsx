import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Bot, Check, FileSearch, Fingerprint, GitBranch, Landmark, LockKeyhole, Menu, ScanLine, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { TallyLogo } from '@/src/components/TallyLogo';
import styles from './about.module.css';

export const metadata: Metadata = {
  title: 'Tally — The household money ledger you can trust',
  description: 'Bring bills, accounts, income and real money movements into one shared household ledger — then reconcile it against your bank statements.',
};

const FEATURES = [
  { icon: FileSearch, eyebrow: 'Reconcile', title: 'Start with what actually happened', body: 'Import a CSV, PDF or photo of a statement. Tally extracts the rows, checks the balance change and lets you confirm every match.' },
  { icon: GitBranch, eyebrow: 'Trace', title: 'Follow every euro through the household', body: 'Separate spending from transfers between your own accounts. Money Map and Money Trails make the full journey visible.' },
  { icon: Users, eyebrow: 'Share', title: 'Keep one household source of truth', body: 'Partners use their own sign-ins while working from the same bills, accounts, goals, projects and records.' },
];

const CHECKS = [
  'Recurring bills and real income receipts',
  'Savings goals, debt progress and home projects',
  'CSV reports and restorable household snapshots',
  'Sensitive account details encrypted at rest',
];

export default function AboutPage() {
  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <Link href="/about" className={styles.brand} aria-label="Tally home">
          <TallyLogo size={34} />
          <span><strong>Tally</strong><small>Your household, in balance.</small></span>
        </Link>
        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a><a href="#inside-tally">Inside Tally</a><Link href="/guide">Guide</Link>
        </nav>
        <Link href="/" className={styles.signIn}>Sign in <ArrowRight size={16} aria-hidden="true" /></Link>
        <Menu className={styles.menuIcon} aria-hidden="true" />
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><span /> A shared ledger for real household money</p>
          <h1>Know where your money went. Show how it got there.</h1>
          <p className={styles.heroLead}>Tally brings bills, income, accounts and transfers into one checkable household record — then reconciles it against your real bank statements.</p>
          <div className={styles.heroActions}>
            <Link href="/" className={styles.primaryAction}>Sign in to Tally <ArrowRight size={17} aria-hidden="true" /></Link>
            <a href="#inside-tally" className={styles.textAction}>See what&apos;s inside <span aria-hidden="true">↓</span></a>
          </div>
          <p className={styles.inviteNote}><LockKeyhole size={15} aria-hidden="true" /> Invite-only. No open signup and no advertising.</p>
        </div>

        <div className={styles.heroVisual} aria-label="Tally product overview">
          <div className={styles.visualRail}><span>HOUSEHOLD LEDGER</span><span className={styles.railLine} /><strong>01</strong></div>
          <div className={styles.browserFrame}>
            <div className={styles.browserBar}><span /><span /><span /><small>Overview</small></div>
            <Image src="/about/overview.png" alt="Tally overview showing committed spending, upcoming bills and recent household expenses" width={1440} height={900} priority />
          </div>
          <div className={styles.proofCard}><ShieldCheck size={21} aria-hidden="true" /><span><strong>Every number has a trail.</strong> Open the record behind any total.</span></div>
        </div>
      </section>

      <section className={styles.factStrip} aria-label="Tally facts">
        <div><strong>CSV · PDF · PHOTO</strong><span>Statement imports</span></div>
        <div><strong>30 · 14 · 7 DAYS</strong><span>Contract reminders</span></div>
        <div><strong>14 DAILY COPIES</strong><span>Automatic backup history</span></div>
        <div><strong>YOUR DATA ONLY</strong><span>AI runs when you ask</span></div>
      </section>

      <section className={styles.problem} id="how-it-works">
        <div className={styles.sectionLabel}>THE TALLY DIFFERENCE <span>02</span></div>
        <div className={styles.problemHeading}>
          <h2>Most finance apps give you totals.<br />Tally gives you the evidence.</h2>
          <p>Household money rarely takes a straight path. Salary lands in one account, moves through another, pays a card and finally becomes a bill. Tally keeps those steps connected.</p>
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map(({ icon: Icon, eyebrow, title, body }, index) => (
            <article key={title} className={styles.feature}>
              <div className={styles.featureTop}><span className={styles.featureIcon}><Icon size={22} aria-hidden="true" /></span><span className={styles.featureNumber}>0{index + 1}</span></div>
              <p>{eyebrow}</p><h3>{title}</h3><span>{body}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.productStory} id="inside-tally">
        <div className={styles.storyImage}>
          <Image src="/about/money-map.png" alt="Tally Money Map tracing income through household accounts to spending" width={1440} height={900} />
          <span className={styles.imageTag}><GitBranch size={15} aria-hidden="true" /> Actual journey</span>
        </div>
        <div className={styles.storyCopy}>
          <div className={styles.sectionLabel}>MONEY MAP <span>03</span></div>
          <h2>See the route, not just the destination.</h2>
          <p>Tally distinguishes real spending from money moving between your own accounts. That keeps reports honest and makes complicated household flows understandable at a glance.</p>
          <ul>
            <li><Landmark size={18} aria-hidden="true" /> Money in, accounts and money out</li>
            <li><GitBranch size={18} aria-hidden="true" /> Named trails across several transfers</li>
            <li><Fingerprint size={18} aria-hidden="true" /> Dates, amounts and source records attached</li>
          </ul>
        </div>
      </section>

      <section className={styles.assistantStory}>
        <div className={styles.assistantCopy}>
          <div className={styles.sectionLabel}>ASK TALLY <span>04</span></div>
          <h2>Useful AI, with a short leash.</h2>
          <p>Ask a question about your household, scan a receipt or request a money-flow review. Tally uses only your household&apos;s records, only when you choose to run it.</p>
          <div className={styles.promptList}>
            <span><Bot size={17} aria-hidden="true" /> Where could we save this month?</span>
            <span><ScanLine size={17} aria-hidden="true" /> Add this bill from a photo</span>
            <span><Sparkles size={17} aria-hidden="true" /> What&apos;s going out next week?</span>
          </div>
          <Link href="/ai-transparency" className={styles.inlineLink}>Read the AI transparency note <ArrowRight size={15} /></Link>
        </div>
        <div className={styles.reportVisual}><Image src="/about/reports.png" alt="Tally reports showing household income and spending trends" width={1440} height={900} /></div>
      </section>

      <section className={styles.trust}>
        <div className={styles.trustIntro}><div className={styles.sectionLabel}>BUILT FOR TRUST <span>05</span></div><h2>A household record should belong to the household.</h2></div>
        <div className={styles.trustBody}>
          <p>Tally is designed around deliberate access, visible actions and recoverable data. Sensitive account fields stay encrypted until you reveal them.</p>
          <ul>{CHECKS.map((item) => <li key={item}><Check size={17} aria-hidden="true" /> {item}</li>)}</ul>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div><p>READY WHEN YOUR HOUSEHOLD IS</p><h2>Bring the whole money story into one place.</h2></div>
        <div><p>Tally is currently invite-only. If your household already has a workspace, use the email address your administrator invited.</p><Link href="/" className={styles.lightAction}>Sign in to Tally <ArrowRight size={17} /></Link></div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}><TallyLogo size={28} /><strong>Tally</strong></div><p>Your household, in balance.</p>
        <nav aria-label="Footer navigation"><Link href="/guide">Guide</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/technical-overview">Technical overview</Link></nav>
      </footer>
    </main>
  );
}
