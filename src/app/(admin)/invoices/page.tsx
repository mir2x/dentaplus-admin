import { Suspense } from 'react';
import { InvoicesView } from '@/components/invoices/invoices-view';

export default function InvoicesPage() {
  return (
    <Suspense>
      <InvoicesView />
    </Suspense>
  );
}
