import { HELP_GUIDE_SECTIONS } from '@/src/data/helpGuide';
import { APP_VERSION } from '@/src/data/changelog';
import { UserGuideContent } from '@/src/components/UserGuideContent';

export const metadata = {
  title: 'User Guide — Tally',
};

export default function GuidePage() {
  return <UserGuideContent sections={HELP_GUIDE_SECTIONS} version={APP_VERSION} />;
}
