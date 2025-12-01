import express from 'express';
import Joi from 'joi';
import { prisma } from '../prismaClient';
import stkPushService from '../services/stkPushService';

const router = express.Router();

// Validation schemas
const initiateSTKPushSchema = Joi.object({
  orderId: Joi.string().required(),
  phoneNumber: Joi.string().pattern(/^[0-9+\-\s()]+$/).required()
});

// Initiate STK Push payment
router.post('/stk-push', async (req, res) => {
  try {
    const { error, value } = initiateSTKPushSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { orderId, phoneNumber } = value;

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        stall: {
          include: {
            stallOwner: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentStatus !== 'PENDING') {
      return res.status(400).json({ error: 'Payment already processed for this order' });
    }

    // Use centralized shortcode from env for STK Push
    const businessShortCode = process.env.MPESA_SHORTCODE as string;
    if (!businessShortCode) {
      return res.status(500).json({ error: 'M-Pesa shortcode not configured on server' });
    }

    // Calculate total amount
    const totalAmount = order.totalAmount + order.deliveryFee;

    // Initiate STK Push
    const stkResponse = await stkPushService.initiateSTKPush(
      phoneNumber,
      totalAmount,
      businessShortCode,
      orderId,
      `Payment for order ${orderId}`
    );

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount: totalAmount,
        status: 'PENDING',
        paymentMethod: 'STK_PUSH',
        merchantRequestID: stkResponse.MerchantRequestID,
        checkoutRequestID: stkResponse.CheckoutRequestID,
        resultCode: parseInt(stkResponse.ResponseCode),
        resultDesc: stkResponse.ResponseDescription
      }
    });

    res.json({
      message: 'STK Push initiated successfully',
      checkoutRequestID: stkResponse.CheckoutRequestID,
      customerMessage: stkResponse.CustomerMessage,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount
      }
    });

  } catch (error: any) {
    console.error('STK Push initiation error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate STK Push',
      message: error.message 
    });
  }
});

// STK Push callback handler
router.post('/stk-callback', async (req, res) => {
  try {
    const callbackData = req.body;
    
    // Process the callback
    const result = stkPushService.processCallback(callbackData);
    
    console.log('STK Push callback received:', result);

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { merchantRequestID: result.merchantRequestID },
          { checkoutRequestID: result.checkoutRequestID }
        ]
      },
      include: {
        order: true
      }
    });

    if (!payment) {
      console.error('Payment record not found for callback:', result);
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Update payment status
    const updateData: any = {
      resultCode: result.resultCode,
      resultDesc: result.resultDesc,
      status: result.isSuccessful ? 'CONFIRMED' : 'FAILED'
    };

    if (result.isSuccessful) {
      updateData.mpesaReceiptNumber = result.mpesaReceiptNumber;
      updateData.transactionDate = result.transactionDate;
      updateData.confirmedAt = new Date();
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: updateData
    });

    // Update order status if payment was successful
    if (result.isSuccessful) {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'CONFIRMED',
          status: 'CONFIRMED',
          paymentCode: result.mpesaReceiptNumber
        }
      });

      // Notify that payment was successful
      const { io } = await import('../index');
      io.emit('payment-confirmed', {
        orderId: payment.orderId,
        stallId: payment.order.stallId,
        customerName: payment.order.customerName,
        totalAmount: payment.amount
      });

      // Create ledger entry: STK_PUSH to centralized shortcode => YOU_OWE stall owner amount excluding delivery fee
      try {
        const order = await prisma.order.findUnique({
          where: { id: payment.orderId },
          include: { stall: { include: { stallOwner: true } } }
        });
        if (order && order.stall && order.stall.stallOwner) {
          await prisma.ledgerEntry.create({
            data: {
              entityType: 'STALL_OWNER',
              entityId: order.stall.stallOwner.id,
              sourceType: 'ORDER',
              sourceId: order.id,
              direction: 'YOU_OWE',
              amount: order.totalAmount, // exclude delivery fee by rule
              notes: 'STK Push payment received by platform; remit to stall owner'
            }
          });
        }
      } catch (e) {
        console.error('Failed to create ledger entry for STK payment:', e);
      }
    }

    res.json({ message: 'Callback processed successfully' });

  } catch (error) {
    console.error('STK Push callback error:', error);
    res.status(500).json({ error: 'Failed to process callback' });
  }
});

// Query STK Push status
router.get('/stk-status/:checkoutRequestID', async (req, res) => {
  try {
    const { checkoutRequestID } = req.params;

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: { checkoutRequestID },
      include: {
        order: {
          include: {
            stall: {
              include: {
                stallOwner: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // If payment is already confirmed or failed, return current status
    if (payment.status !== 'PENDING') {
      return res.json({
        status: payment.status,
        resultCode: payment.resultCode,
        resultDesc: payment.resultDesc,
        mpesaReceiptNumber: payment.mpesaReceiptNumber,
        confirmedAt: payment.confirmedAt
      });
    }

    // Query M-Pesa for current status using centralized shortcode
    const businessShortCode = process.env.MPESA_SHORTCODE as string;
    if (!businessShortCode) {
      return res.status(500).json({ error: 'M-Pesa shortcode not configured on server' });
    }

    const queryResult = await stkPushService.querySTKPushStatus(checkoutRequestID, businessShortCode);

    // Update payment record with query result
    const updateData: any = {
      resultCode: queryResult.ResultCode,
      resultDesc: queryResult.ResultDesc
    };

    if (queryResult.ResultCode === 0) {
      updateData.status = 'CONFIRMED';
      updateData.confirmedAt = new Date();
      
      // Update order status
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'CONFIRMED',
          status: 'CONFIRMED'
        }
      });
    } else if (queryResult.ResultCode !== 103) { // 103 means still processing
      updateData.status = 'FAILED';
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: updateData
    });

    res.json({
      status: updatedPayment.status,
      resultCode: updatedPayment.resultCode,
      resultDesc: updatedPayment.resultDesc,
      mpesaReceiptNumber: updatedPayment.mpesaReceiptNumber,
      confirmedAt: updatedPayment.confirmedAt
    });

  } catch (error: any) {
    console.error('STK Push status query error:', error);
    res.status(500).json({ 
      error: 'Failed to query STK Push status',
      message: error.message 
    });
  }
});

export default router;

