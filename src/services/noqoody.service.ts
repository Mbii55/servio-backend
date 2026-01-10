// src/services/noqoody.service.ts

import axios, { AxiosInstance } from 'axios';
import qs from 'qs';
import crypto from 'crypto';

interface NoqoodyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  userName: string;
}

interface NoqoodyGenerateLinksRequest {
  ProjectCode: string;
  Description: string;
  Amount: number;
  CustomerEmail: string;
  CustomerMobile: string;
  CustomerName: string;
  SecureHash: string;
  Reference: string;
}

interface NoqoodyGenerateLinksResponse {
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

interface NoqoodyTransactionStatus {
  success: boolean;
  code: string;
  message: string;
  data?: any;
}

class NoqoodyService {
  private client: AxiosInstance;
  private username: string;
  private password: string;
  private projectCode: string;
  private clientSecret: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    // Set credentials based on environment
    this.username = isProduction
      ? process.env.NOQOODY_LIVE_USERNAME || ''
      : process.env.NOQOODY_SANDBOX_USERNAME || '';

    this.password = isProduction
      ? process.env.NOQOODY_LIVE_PASSWORD || ''
      : process.env.NOQOODY_SANDBOX_PASSWORD || '';

    this.projectCode = isProduction
      ? process.env.NOQOODY_LIVE_PROJECT_CODE || ''
      : process.env.NOQOODY_SANDBOX_PROJECT_CODE || '';

    this.clientSecret = isProduction
      ? process.env.NOQOODY_LIVE_CLIENT_SECRET || ''
      : process.env.NOQOODY_SANDBOX_CLIENT_SECRET || '';

    this.baseUrl = isProduction
      ? process.env.NOQOODY_LIVE_URL || ''
      : process.env.NOQOODY_SANDBOX_URL || '';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  /**
   * Generate SHA256 secure hash for Noqoody
   * Format: {CustomerEmail}{CustomerName}{CustomerMobile}{Description}{ProjectCode}{Reference}{Amount}
   */
  private generateSecureHash(params: {
    customerEmail: string;
    customerName: string;
    customerMobile: string;
    description: string;
    reference: string;
    amount: number;
  }): string {
    const { customerEmail, customerName, customerMobile, description, reference, amount } = params;

    // Format amount to 2 decimal places
    const formattedAmount = amount.toFixed(2);

    // Concatenate in the required order
    const message = `${customerEmail}${customerName}${customerMobile}${description}${this.projectCode}${reference}${formattedAmount}`;

    // Generate HMAC SHA256 hash
    const hash = crypto
      .createHmac('sha256', this.clientSecret)
      .update(message)
      .digest('base64');

    return hash;
  }

  /**
   * Get access token (authenticate with Noqoody)
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const data = qs.stringify({
        grant_type: 'password',
        username: this.username,
        password: this.password,
      });

      const response = await this.client.post<NoqoodyTokenResponse>('/token', data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      
      // Set token expiry (subtract 5 minutes for safety margin)
      const expiresInMs = (response.data.expires_in - 300) * 1000;
      this.tokenExpiry = new Date(Date.now() + expiresInMs);

      console.log('✅ Noqoody token obtained successfully');
      return this.accessToken;

    } catch (error: any) {
      console.error('❌ Failed to get Noqoody access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Noqoody');
    }
  }

  /**
   * Generate payment link
   */
  async generatePaymentLink(params: {
    amount: number;
    customerEmail: string;
    customerMobile: string;
    customerName: string;
    description: string;
    reference: string;
  }): Promise<NoqoodyGenerateLinksResponse> {
    try {
      const token = await this.getAccessToken();

      // Generate secure hash
      const secureHash = this.generateSecureHash({
        customerEmail: params.customerEmail,
        customerName: params.customerName,
        customerMobile: params.customerMobile,
        description: params.description,
        reference: params.reference,
        amount: params.amount,
      });

      const requestData: NoqoodyGenerateLinksRequest = {
        ProjectCode: this.projectCode,
        Description: params.description,
        Amount: Number(params.amount.toFixed(2)), // Ensure 2 decimal places
        CustomerEmail: params.customerEmail,
        CustomerMobile: params.customerMobile,
        CustomerName: params.customerName,
        SecureHash: secureHash,
        Reference: params.reference,
      };

      console.log('📤 Generating Noqoody payment link:', {
        reference: params.reference,
        amount: params.amount,
      });

      const response = await this.client.post<NoqoodyGenerateLinksResponse>(
        '/api/PaymentLink/GenerateLinks',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to generate payment link');
      }

      console.log('✅ Payment link generated:', response.data.PaymentUrl);
      return response.data;

    } catch (error: any) {
      console.error('❌ Noqoody generate link error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to generate payment link');
    }
  }

  /**
   * Validate payment by reference number
   */
  async validatePayment(reference: string): Promise<NoqoodyTransactionStatus> {
    try {
      const token = await this.getAccessToken();

      console.log('🔍 Validating payment for reference:', reference);

      const response = await this.client.get<NoqoodyTransactionStatus>(
        `/api/Members/GetTransactionDetailStatusByClientReference/`,
        {
          params: { ReferenceNo: reference },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('✅ Payment validation response:', response.data);
      return response.data;

    } catch (error: any) {
      console.error('❌ Noqoody validate payment error:', error.response?.data || error.message);
      throw new Error('Failed to validate payment');
    }
  }

  /**
   * Get account details (for debugging/setup)
   */
  async getAccountDetails(): Promise<any> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/api/Members/GetUserSettings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;

    } catch (error: any) {
      console.error('❌ Noqoody get account details error:', error.response?.data || error.message);
      throw new Error('Failed to get account details');
    }
  }
}

export default new NoqoodyService();