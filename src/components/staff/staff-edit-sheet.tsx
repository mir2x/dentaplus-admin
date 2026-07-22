'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { StaffMember } from '@/types/api';
import { ADMIN_PAGE_GROUPS } from '@/lib/admin-pages';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Props {
  editing: StaffMember | 'new' | null;
  onClose: () => void;
}

export function StaffEditSheet({ editing, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          <StaffForm key={editing === 'new' ? 'new' : editing.id} editing={editing} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function StaffForm({ editing, onClose }: { editing: StaffMember | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';

  const [email, setEmail] = useState(isEdit ? editing.email : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState(isEdit ? (editing.displayName ?? '') : '');
  const [isActive, setIsActive] = useState(isEdit ? editing.isActive : true);
  const [fullAccess, setFullAccess] = useState(isEdit ? editing.allowedPages.length === 0 : true);
  const [allowedPages, setAllowedPages] = useState<string[]>(isEdit ? editing.allowedPages : []);

  const togglePage = (href: string, checked: boolean) =>
    setAllowedPages((cur) => (checked ? [...cur, href] : cur.filter((p) => p !== href)));

  const save = useMutation({
    mutationFn: () => {
      const allowedPagesPayload = fullAccess ? [] : allowedPages;
      if (isEdit) {
        return api.patch(`/admin/staff/${editing.id}`, {
          displayName: displayName || undefined,
          isActive,
          allowedPages: allowedPagesPayload,
          ...(password ? { password } : {}),
        });
      }
      return api.post('/admin/staff', {
        email,
        password,
        displayName: displayName || undefined,
        allowedPages: allowedPagesPayload,
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Staff member saved' : 'Staff member created');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      onClose();
    },
    onError: () => toast.error('Save failed'),
  });

  const canSave = isEdit
    ? true
    : email.trim().length > 0 && password.trim().length >= 8;

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? 'Edit staff member' : 'Add staff'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isEdit}
            placeholder="name@dentaplus.com.au"
          />
        </Field>
        <Field label={isEdit ? 'Reset password (optional)' : 'Password'}>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep current password' : 'At least 8 characters'}
              className="pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Field label="Display name">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>

        {isEdit && (
          <div className="flex items-center justify-between">
            <Label className="font-normal">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        )}

        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <Label>Full admin access</Label>
            <Switch checked={fullAccess} onCheckedChange={setFullAccess} />
          </div>

          {!fullAccess && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Choose exactly which admin pages this staff member can see.
              </p>
              {ADMIN_PAGE_GROUPS.map((group) => (
                <div key={group.label ?? 'general'} className="space-y-1.5">
                  {group.label && (
                    <p className="text-xs font-medium uppercase text-muted-foreground">{group.label}</p>
                  )}
                  {group.items.map((item) => (
                    <div key={item.href} className="flex items-center justify-between">
                      <Label className="font-normal">{item.label}</Label>
                      <Switch
                        checked={allowedPages.includes(item.href)}
                        onCheckedChange={(checked) => togglePage(item.href, checked)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full" disabled={save.isPending || !canSave} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : isEdit ? 'Save staff member' : 'Create staff member'}
        </Button>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
