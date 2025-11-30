import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Coupon, GiftCard, OrderStatus, PaymentStatus } from '@prisma/client';
import { validateStock } from './utils/stock-validator';
import { calculateTotal } from './utils/checkout-calculator';
import { CheckoutBody, CheckoutBodySchema } from './dto/checkout.dto';

@Injectable()
export class CheckoutsService {
  constructor(private prisma: PrismaService) {}
  private async clearCart(userId: string, cl = this.prisma) {
    return cl.cart.update({
      where: { userId },
      data: { items: { deleteMany: {} } },
    });
  }

  /**
   * STEP 1 — Start Checkout
   * Validates cart, applies discounts, and creates an order draft.
   */
  async startCheckout(userId: string, body: CheckoutBody) {
    // ✅ Validate request body via Zod schema
    const parsed = CheckoutBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error);
    }
    const {
      cartId,
      addressId,
      address,
      paymentMethod,
      couponCode,
      giftCardCode,
    } = parsed.data;

    // ✅ Fetch user's cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: { include: { sizes: true } } },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // ✅ Validate stock
    validateStock(cart.items);

    // ✅ Calculate totals
    const subtotal = calculateTotal(cart.items);

    // ✅ Initialize discounts
    let discountAmount = 0;
    let appliedCoupon: Coupon | null = null;
    let appliedGiftCard: GiftCard | null = null;

    // --- Coupon logic ---
    if (couponCode) {
      appliedCoupon = await this.validateCoupon(userId, couponCode, subtotal);
      discountAmount += this.calculateCouponDiscount(appliedCoupon, subtotal);
    }

    // --- Gift Card logic ---
    if (giftCardCode) {
      appliedGiftCard = await this.validateGiftCard(giftCardCode);
      const usableAmount = Math.min(
        Number(appliedGiftCard.balance),
        subtotal - discountAmount,
      );
      discountAmount += usableAmount;
    }

    const finalAmount = Math.max(0, subtotal - discountAmount);

    // ✅ Address handling
    let finalAddressId = addressId ?? null;

    if (!finalAddressId && address) {
      const newAddress = await this.prisma.address.create({
        data: {
          userId,
          line1: address.line1,
          line2: address.line2 ?? null,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country ?? 'India', // 👈 ensure always string
        },
      });
      finalAddressId = newAddress.id;
    }

    if (!finalAddressId) {
      throw new BadRequestException('Shipping address is required');
    }

    // ✅ Create pending order
    const order = await this.prisma.order.create({
      data: {
        userId,
        addressId: finalAddressId,
        totalAmount: new Decimal(finalAmount),
        discountAmount: new Decimal(discountAmount),
        taxAmount: new Decimal(0),
        shippingCost: new Decimal(0),
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: item.productPrice ?? item.product.price,
            size: item.size,
          })),
        },
      },
      include: { items: true, address: true },
    });

    return {
      message: 'Checkout initiated successfully',
      orderId: order.id,
      subtotal,
      discountAmount,
      finalAmount,
      appliedCoupon: appliedCoupon?.code,
      appliedGiftCard: appliedGiftCard?.code,
      address: order.address,
      paymentMethod,
    };
  }

  /**
   * STEP 2 — Confirm Payment
   * Called after Razorpay (or any gateway) success verification.
   */
  async confirmPayment(
    userId: string,
    orderId: string,
    paymentData: {
      razorpayPaymentId: string;
      razorpayOrderId: string;
      signature: string;
      amount: number;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // ✅ Record payment
      const payment = await tx.payment.create({
        data: {
          userId,
          orderId,
          razorpayPaymentId: paymentData.razorpayPaymentId,
          razorpayOrderId: paymentData.razorpayOrderId,
          signature: paymentData.signature,
          amount: new Decimal(paymentData.amount),
          status: PaymentStatus.PAID,
        },
      });

      // ✅ Update order
      await tx.order.update({
        where: { id: orderId },
        data: {
          latestPaymentId: payment.id,
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      // ✅ Decrease stock
      for (const item of order.items) {
        await tx.productSize.updateMany({
          where: {
            productId: item.productId,
            size: item.size!,
          },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // ✅ Empty cart
      await this.clearCart(order.userId);
      // await tx.cart.update({
      //   where: { userId },
      //   data: { items: { deleteMany: {} } },
      // });

      return {
        message: 'Payment confirmed & order finalized successfully',
        orderId: order.id,
        paymentId: payment.id,
      };
    });
  }

  // ----------------------------------------------------------------------
  // 💡 Helper methods — Coupon & GiftCard validators
  // ----------------------------------------------------------------------

  private async validateCoupon(userId: string, code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.active)
      throw new BadRequestException('Invalid or inactive coupon');

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate)
      throw new BadRequestException('Coupon not yet active');
    if (coupon.endDate && now > coupon.endDate)
      throw new BadRequestException('Coupon expired');

    if (coupon.minPurchase && subtotal < coupon.minPurchase)
      throw new BadRequestException(
        `Minimum purchase ₹${coupon.minPurchase} required`,
      );

    const alreadyUsed = await this.prisma.couponUsage.findFirst({
      where: { userId, couponId: coupon.id },
    });
    if (alreadyUsed)
      throw new BadRequestException('Coupon already used by this user');

    return coupon;
  }

  private calculateCouponDiscount(coupon: Coupon, subtotal: number) {
    if (coupon.discountType === 'PERCENTAGE') {
      let discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
      return discount;
    } else if (coupon.discountType === 'FIXED') {
      return coupon.discountValue;
    }
    return 0;
  }

  private async validateGiftCard(code: string) {
    const giftCard = await this.prisma.giftCard.findUnique({ where: { code } });
    if (!giftCard || !giftCard.isActive)
      throw new BadRequestException('Invalid or inactive gift card');
    if (giftCard.expiresAt && new Date() > giftCard.expiresAt)
      throw new BadRequestException('Gift card expired');
    if (Number(giftCard.balance) <= 0)
      throw new BadRequestException('Gift card has no balance');
    return giftCard;
  }
}
