declare module "midtrans-client" {
  type SnapConfig = {
    isProduction?: boolean;
    serverKey: string;
    clientKey?: string;
  };

  type SnapTransactionParameter = {
    transaction_details: {
      order_id: string;
      gross_amount: number;
    };

    customer_details?: {
      first_name?: string;
      email?: string;
      phone?: string;
    };

    item_details?: Array<{
      id: string;
      price: number;
      quantity: number;
      name: string;
    }>;
  };

  type SnapTransactionResponse = {
    token?: string;
    redirect_url?: string;
  };

  type StatusResponse = {
    order_id?: string;
    transaction_id?: string;
    transaction_status?: string;
    status_code?: string;
    gross_amount?: string;
    currency?: string;
    fraud_status?: string;
    transaction_time?: string;
    settlement_time?: string;
    expiry_time?: string;
    payment_type?: string;
    status_message?: string;
  };

  interface SnapInstance {
    createTransaction(
      parameter: SnapTransactionParameter,
    ): Promise<SnapTransactionResponse>;

    transaction: {
      status(
        orderId: string,
      ): Promise<StatusResponse>;
    };
  }

  interface SnapConstructor {
    new (
      config: SnapConfig,
    ): SnapInstance;
  }

  const midtransClient: {
    Snap: SnapConstructor;
  };

  export default midtransClient;
}
