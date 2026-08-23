// Account details shown to customers at checkout for the manual (non-Stripe)
// payment methods. These are RapidVite's own receiving accounts - customers
// send money here, then upload a screenshot of the transaction as proof.
//
// To change a number/name later, just edit the values below - nothing else
// needs to change.

export interface ManualPaymentAccount {
  logo: string; // path under /public
  accountHolder: string;
  phone?: string;
  accountNumber?: string;
  email?: string;
}

export const MANUAL_PAYMENT_ACCOUNTS: Record<"moncash" | "natcash" | "sogebank", ManualPaymentAccount> = {
  moncash: {
    logo: "/images/payment/moncash.png",
    accountHolder: "Chad Roy",
    phone: "47498002",
  },
  natcash: {
    logo: "/images/payment/natcash.png",
    accountHolder: "Chad Roy",
    phone: "47498002",
  },
  sogebank: {
    logo: "/images/payment/sogebank.png",
    accountHolder: "Chad Roy",
    accountNumber: "123456789",
    email: "rapidvit@gmail.com",
  },
};
