//import { request } from "http";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { env } from "~/env.mjs";
import { buffer } from "micro";
import { prisma } from "~/server/db";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia",
});

export const config = {
    api: {
        bodyParser: false,
    },
};

const webhook = async (req: NextApiRequest, res: NextApiResponse) => {
    console.log("=== Webhook Request Started ===");
    
    if (req.method !== "POST") {
        console.log("Invalid method:", req.method);
        res.setHeader("Allow", "POST");
        res.status(405).end("Method Not Allowed");
        return;
    }

    // Send response immediately to prevent timeout
    res.json({ received: true });

    try {
        console.log("Reading request body");
        let buf;
        try {
            buf = await buffer(req);
            console.log("Request body read successfully, length:", buf.length);
            console.log("Request body preview:", buf.toString().substring(0, 100));
        } catch (bufferError) {
            console.error("Error reading request body:", bufferError);
            if (bufferError instanceof Error) {
                console.error("Buffer error details:", {
                    message: bufferError.message,
                    stack: bufferError.stack
                });
            }
            return;
        }
        
        const sig = req.headers["stripe-signature"] as string;
        console.log("Stripe signature present:", !!sig);
        console.log("Stripe signature:", sig);
        
        if (!sig) {
            console.error("No Stripe signature found");
            return;
        }

        // Log the first few characters of the webhook secret to verify it's set
        const webhookSecret = env.STRIPE_WEB_HOOK_SECRET;
        if (!webhookSecret) {
            console.error("STRIPE_WEB_HOOK_SECRET is not set");
            return;
        }
        console.log("Webhook secret present:", webhookSecret.substring(0, 10) + "...");

        console.log("Constructing Stripe event...");
        let event;
        try {
            event = stripe.webhooks.constructEvent(
                buf,
                sig,
                webhookSecret
            );
            console.log("Event constructed successfully:", {
                type: event.type,
                id: event.id
            });
        } catch (constructError) {
            console.error("Error constructing event:", constructError);
            if (constructError instanceof Error) {
                console.error("Construction error details:", {
                    message: constructError.message,
                    stack: constructError.stack
                });
            }
            return;
        }

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log("Processing checkout session:", {
                id: session.id,
                metadata: session.metadata,
                amount_total: session.amount_total,
                payment_status: session.payment_status
            });

            if (!session.metadata?.userId) {
                console.error("User ID missing in session metadata");
                return;
            }

            console.log("Updating credits for user:", session.metadata.userId);
            try {
                const updatedUser = await prisma.user.update({
                    where: {
                        id: session.metadata.userId,
                    },
                    data: {
                        credits: {
                            increment: 100,
                        },
                    },
                });

                console.log(`Successfully updated credits for user ${session.metadata.userId}. New credit balance: ${updatedUser.credits}`);
            } catch (dbError) {
                console.error("Database error updating credits:", dbError);
                if (dbError instanceof Error) {
                    console.error("Database error details:", {
                        message: dbError.message,
                        stack: dbError.stack
                    });
                }
                throw dbError;
            }
        } else {
            console.log(`Unhandled event type ${event.type}`);
        }
    } catch (err) {
        console.error("Error processing webhook:", err);
        if (err instanceof Error) {
            console.error("Error details:", {
                message: err.message,
                stack: err.stack
            });
        }
    }
    
    console.log("=== Webhook Request Completed ===");
};

export default webhook;