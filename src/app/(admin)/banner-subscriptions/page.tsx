import { redirect } from 'next/navigation';

// Banner pop-ups (and their "Subscribe now" emails) moved to the popup system.
export default function BannerSubscriptionsPage() {
  redirect('/popup-submissions');
}
