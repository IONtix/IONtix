import { paymentService } from "../service";
import { IontixTestProvider } from "./iontix-test";

let registered = false;

export function registerPaymentProviders() {
  if (registered) {
    return;
  }

  paymentService.registerProvider(new IontixTestProvider());

  registered = true;
}
