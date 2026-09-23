import { PopupSubmissionsView } from '@/components/popups/popup-submissions-view';

export default function PopupSubmissionsPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Everyone who submitted a popup form on the storefront, with the popup that prompted them. Sign-ups from the
        old banner pop-ups were carried over here.
      </p>
      <PopupSubmissionsView />
    </div>
  );
}
