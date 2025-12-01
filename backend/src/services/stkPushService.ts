import axios from 'axios';
import crypto from 'crypto';

interface STKPushRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: string;
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface CallbackResponse {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

class STKPushService {
  private baseURL: string;
  private consumerKey: string;
  private consumerSecret: string;
  private passkey: string;
  private callbackURL: string;

  constructor() {
    this.baseURL = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.passkey = process.env.MPESA_PASSKEY || '';
    this.callbackURL = process.env.MPESA_CALLBACK_URL || `${process.env.BACKEND_URL}/api/payments/stk-callback`;
  }

  /**
   * Generate access token for M-Pesa API
   */
  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(businessShortCode: string, passkey: string, timestamp: string): string {
    const dataToEncode = businessShortCode + passkey + timestamp;
    return Buffer.from(dataToEncode).toString('base64');
  }

  /**
   * Format phone number to 254XXXXXXXXX format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add 254 if it starts with 0
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    }
    
    // Add 254 if it doesn't start with 254
    if (!cleaned.startsWith('254')) {
      return '254' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Initiate STK Push payment
   */
  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    businessShortCode: string,
    accountReference: string,
    transactionDesc: string
  ): Promise<STKPushResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = this.generatePassword(businessShortCode, this.passkey, timestamp);
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const requestData: STKPushRequest = {
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // Round to nearest integer
        PartyA: formattedPhone,
        PartyB: businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackURL,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('STK Push error:', error.response?.data || error.message);
      throw new Error(`STK Push failed: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  /**
   * Query STK Push status
   */
  async querySTKPushStatus(checkoutRequestID: string, businessShortCode: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = this.generatePassword(businessShortCode, this.passkey, timestamp);

      const requestData = {
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('STK Push query error:', error.response?.data || error.message);
      throw new Error(`STK Push query failed: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  /**
   * Process STK Push callback
   */
  processCallback(callbackData: CallbackResponse): {
    merchantRequestID: string;
    checkoutRequestID: string;
    resultCode: number;
    resultDesc: string;
    isSuccessful: boolean;
    mpesaReceiptNumber?: string;
    transactionDate?: string;
    amount?: number;
  } {
    const { stkCallback } = callbackData.Body;
    
    const result = {
      merchantRequestID: stkCallback.MerchantRequestID,
      checkoutRequestID: stkCallback.CheckoutRequestID,
      resultCode: stkCallback.ResultCode,
      resultDesc: stkCallback.ResultDesc,
      isSuccessful: stkCallback.ResultCode === 0
    };

    // Extract additional details if payment was successful
    if (result.isSuccessful && stkCallback.CallbackMetadata?.Item) {
      const items = stkCallback.CallbackMetadata.Item;
      
      for (const item of items) {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            (result as any).mpesaReceiptNumber = item.Value;
            break;
          case 'TransactionDate':
            (result as any).transactionDate = item.Value;
            break;
          case 'Amount':
            (result as any).amount = item.Value;
            break;
        }
      }
    }

    return result;
  }
}

export default new STKPushService();

