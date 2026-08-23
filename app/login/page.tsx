import { AppKitSsoEntry } from '@/components/auth/AppKitSsoEntry';
import { NarinylandAuthPage } from '@/components/auth/NarinylandAuthPage';

export default function LoginPage() {
  return (
    <>
      <AppKitSsoEntry />
      <NarinylandAuthPage mode="login" />
    </>
  );
}
