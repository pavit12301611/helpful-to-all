/**
 * Payment integration interface (deliberately NOT implemented in v1).
 *
 * OpenHub does not process money: taking donations requires payment licensing,
 * KYC, tax handling and refund policies that differ per country. Instead this
 * module defines the seam a future integration would plug into, and campaigns
 * show the organiser's own verified payment instructions.
 *
 * To add a provider later: implement PaymentProvider, register it in
 * `providers`, and gate it behind an explicit admin approval workflow.
 */

export type CheckoutRequest = {
  campaignId: string;
  amountCents: number;
  currency: string;
  description: string;
  returnUrl: string;
};

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

export interface PaymentProvider {
  readonly key: string;
  readonly label: string;
  isConfigured(): boolean;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
}

class NullPaymentProvider implements PaymentProvider {
  readonly key = 'none';
  readonly label = 'No payment provider configured';

  isConfigured(): boolean {
    return false;
  }

  async createCheckout(): Promise<CheckoutResult> {
    return {
      ok: false,
      reason:
        'OpenHub does not process payments. Contact the organiser directly and verify the campaign before sending anything.',
    };
  }
}

const providers: Record<string, PaymentProvider> = {
  none: new NullPaymentProvider(),
};

export function paymentProvider(key?: string | null): PaymentProvider {
  return (key && providers[key]) || providers.none;
}

export function registerPaymentProvider(provider: PaymentProvider): void {
  providers[provider.key] = provider;
}
