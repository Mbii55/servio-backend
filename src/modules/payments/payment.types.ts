// src/modules/payments/payment.types.ts

export type PaymentTransactionStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'expired';

export type PaymentProvider = 
  | 'cash'
  | 'noqoody';

export interface PaymentTransaction {
  id: string;
  booking_id: string;
  transaction_reference: string;
  gateway_transaction_id?: string;
  gateway_order_id?: string;
  provider: PaymentProvider;
  amount: string;
  currency: string;
  status: PaymentTransactionStatus;
  gateway_request_payload?: any;
  gateway_response_payload?: any;
  gateway_callback_payload?: any;
  payment_url?: string;
  return_url?: string;
  cancel_url?: string;
  callback_url?: string;
  customer_ip?: string;
  user_agent?: string;
  initiated_at: Date;
  completed_at?: Date;
  failed_at?: Date;
  refunded_at?: Date;
  expires_at?: Date;
  error_code?: string;
  error_message?: string;
  refund_amount?: string;
  refund_reason?: string;
  refunded_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePaymentTransactionParams {
  bookingId: string;
  provider: PaymentProvider;
  amount: number;
  currency?: string;
  returnUrl?: string;
  cancelUrl?: string;
  callbackUrl?: string;
  customerIp?: string;
  userAgent?: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  transactionId: string;
  transactionReference: string;
  paymentUrl?: string;
  sessionId?: string;
  uuid?: string;
  message?: string;
  error?: string;
}

export interface PaymentCallbackData {
  transactionReference: string;
  gatewayTransactionId?: string;
  status: PaymentTransactionStatus;
  gatewayData?: any;
}

export interface RefundPaymentParams {
  transactionId: string;
  amount?: number;
  reason?: string;
  refundedBy: string;
}

export interface PaymentLog {
  id: string;
  payment_transaction_id: string;
  log_type: 'request' | 'response' | 'callback' | 'error' | 'status_change';
  message?: string;
  data?: any;
  created_at: Date;
}

// ✅ Noqoody-specific types based on actual API documentation

/**
 * Noqoody Generate Payment Link Request
 */
export interface NoqoodyPaymentRequest {
  ProjectCode: string;
  Description: string;
  Amount: number;
  CustomerEmail: string;
  CustomerMobile: string;
  CustomerName: string;
  SecureHash: string;
  Reference: string;
}

/**
 * Noqoody Generate Payment Link Response
 */
export interface NoqoodyPaymentResponse {
  PaymentUrl: string;
  ProjectCode: string;
  Reference: string;
  Description: string;
  Amount: number;
  CustomerEmail: string;
  CustomerName: string;
  CustomerMobile: string;
  SessionId: string;
  Uuid: string;
  success: boolean;
  code: string;
  message: string;
  errors: any[];
}

/**
 * Noqoody Token Response
 */
export interface NoqoodyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  userName: string;
  Name: string;
  Role: string;
  ImageLocation: string;
  Email: string;
  '.issued': string;
  '.expires': string;
}

/**
 * Noqoody Payment Channel
 */
export interface NoqoodyPaymentChannel {
  ID: number;
  ChannelName: string;
  ImageLocation: string;
  PaymentURL: string;
  ServiceTypeID: number;
  ServiceTypeName: string;
}

/**
 * Noqoody Transaction Detail
 */
export interface NoqoodyTransactionDetail {
  MerchantName: string;
  TransactionDescription: string;
  Amount: number;
  Reference: string;
  MobileNumber: string;
  Email: string;
  CustomerEmail: string;
  CustomerMobile: string;
  CustomerName: string;
  MerchantLogo: string;
  Website: string;
  RedirectURl: string;
}

/**
 * Noqoody Payment Channels Response
 */
export interface NoqoodyPaymentChannelsResponse {
  PaymentChannels: NoqoodyPaymentChannel[];
  TransactionDetail: NoqoodyTransactionDetail;
  ServiceTypeList: Array<{
    ID: number;
    Text: string;
  }>;
  success: boolean;
  code: string;
  message: string;
  errors: any[];
}

/**
 * Noqoody Validate Payment Response
 */
export interface NoqoodyValidatePaymentResponse {
  success: boolean;
  code: string;
  message: string;
  data?: {
    Status?: string;
    TransactionId?: string;
    Reference?: string;
    Amount?: number;
    PaymentDate?: string;
    [key: string]: any;
  };
}

/**
 * Noqoody Callback/Webhook Payload (structure may vary)
 * Note: Based on typical payment gateway patterns
 * Update this based on actual Noqoody webhook documentation
 */
export interface NoqoodyCallbackPayload {
  Reference?: string;
  TransactionId?: string;
  Status?: string;
  Amount?: number;
  SessionId?: string;
  Uuid?: string;
  PaymentDate?: string;
  [key: string]: any;
}

/**
 * Noqoody Account Details Response
 */
export interface NoqoodyUserProject {
  ID: number;
  ProjectName: string;
  ProjectDescription: string;
  ProjectCode: string;
  ClientSecret: string;
  AccessURL: string;
  IsActive: boolean;
  ServicesList: Array<{
    ID: number;
    ServiceID: number;
    IsActive: boolean;
    ServiceName: string;
    ServiceDescription: string;
    RedirctUrl: string;
  }>;
}

export interface NoqoodyAccountDetailsResponse {
  UserProjects: NoqoodyUserProject[];
  success: boolean;
  code: string;
  message: string;
  errors: any[];
}