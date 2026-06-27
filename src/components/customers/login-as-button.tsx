'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'http://localhost:3001';

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * "Log in as customer": asks the backend to mint that customer's session, then
 * opens the storefront's /login-as handoff in a new tab. Tokens ride in the URL
 * fragment (not sent to the server) for the storefront to store.
 */
export function LoginAsButton({
  customerId,
  variant = 'outline',
  size = 'sm',
}: {
  customerId: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}) {
  const [loading, setLoading] = useState(false);

  async function go(e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(true);
    try {
      const { data } = await api.post(`/admin/customers/${customerId}/impersonate`);
      const url =
        `${STOREFRONT_URL}/login-as#at=${encodeURIComponent(data.accessToken)}` +
        `&rt=${encodeURIComponent(data.refreshToken)}`;
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('Could not start a session for this customer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} size={size} disabled={loading} onClick={go}>
      <LogIn className="size-4" /> {loading ? 'Starting…' : 'Login as user'}
    </Button>
  );
}
