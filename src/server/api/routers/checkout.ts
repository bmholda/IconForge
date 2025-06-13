import { createTRPCRouter, protectedProcedure} from "~/server/api/trpc";
import Stripe from 'stripe';
import { env } from "~/env.mjs";
import { TRPCError } from "@trpc/server";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia",
});

export const checkoutRouter = createTRPCRouter({
  createCheckout: protectedProcedure.mutation(async({ ctx }) => {
    try {
      console.log("Creating checkout session for user:", ctx.session.user.id);
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'us_bank_account'],
        metadata: {
          userId: ctx.session.user.id,
        },
        line_items: [{ 
          price: env.PRICE_ID, 
          quantity: 1
        }],
        mode: "payment",
        success_url: `${env.HOST_NAME}/generate?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.HOST_NAME}/generate`,
      });

      console.log("Checkout session created:", {
        sessionId: session.id,
        userId: ctx.session.user.id
      });

      return session;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create checkout session",
        cause: error,
      });
    }
  }),
});
