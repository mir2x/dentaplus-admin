'use client';

import { use } from 'react';
import { PopupEditor } from '@/components/popups/popup-editor';

export default function PopupEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PopupEditor id={id} />;
}
