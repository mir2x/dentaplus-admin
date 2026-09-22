import { Suspense } from 'react';
import { NewInvoiceView } from '@/components/invoices/new-invoice-view';

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoiceView />
    </Suspense>
  );
}
