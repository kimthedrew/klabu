import { prisma } from '../prismaClient';

export const PAYMENT_SETTINGS_SINGLETON_ID = 'global';

export type StkPushVisibility = 'INHERIT' | 'SHOW' | 'HIDE';

export const normalizeStkPushVisibility = (value?: string | null): StkPushVisibility => {
  if (value === 'SHOW' || value === 'HIDE') {
    return value;
  }
  return 'INHERIT';
};

export const computeEffectiveStkPushEnabled = (
  isGlobalEnabled: boolean,
  stallVisibility?: string | null
): boolean => {
  if (!isGlobalEnabled) {
    return false;
  }

  const visibility = normalizeStkPushVisibility(stallVisibility);
  if (visibility === 'HIDE') {
    return false;
  }
  return true;
};

export const getOrCreatePaymentSettings = async () => {
  return prisma.paymentSettings.upsert({
    where: { id: PAYMENT_SETTINGS_SINGLETON_ID },
    update: {},
    create: {
      id: PAYMENT_SETTINGS_SINGLETON_ID,
      isStkPushEnabled: true
    }
  });
};
