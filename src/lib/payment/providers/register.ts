import { paymentService } from "../service";

import { IontixTestProvider } from "./iontix-test";
import { MidtransProvider } from "./midtrans";

let registered = false;

export function registerPaymentProviders() {
  if (registered) {
    return;
  }

  paymentService.registerProvider(
    new IontixTestProvider(),
  );

  const hasMidtransConfig =
    Boolean(
      process.env.MIDTRANS_SERVER_KEY?.trim(),
    );

  if (hasMidtransConfig) {
    paymentService.registerProvider(
      new MidtransProvider(),
    );
  }

  registered = true;
}
