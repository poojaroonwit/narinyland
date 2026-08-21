import { login as hostedAppKitLogin } from './auth';

export * from './auth';

export async function login(): Promise<void> {
  if (typeof window === 'undefined') return;
  const onLocalAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
  if (onLocalAuthPage) {
    await hostedAppKitLogin();
    return;
  }
  window.location.assign('/login');
}

export async function loginWithAppKit(): Promise<void> {
  await hostedAppKitLogin();
}
