import { login as hostedAppKitLogin } from './auth';

export * from './auth';

export async function login(): Promise<void> {
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
}

export async function loginWithAppKit(): Promise<void> {
  await hostedAppKitLogin();
}
