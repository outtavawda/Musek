
import { NextResponse } from "next/server";
import {
  createHmac,
  timingSafeEqual,
} from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const signatureKey =
      process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    const notificationUrl =
      process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;

    const accessToken =
      process.env.SQUARE_ACCESS_TOKEN;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const locationId =
      process.env.SQUARE_LOCATION_ID;

    if (
      !signatureKey ||
      !notificationUrl ||
      !accessToken ||
      !supabaseUrl ||
      !serviceKey ||
      !locationId
    ) {
      return NextResponse.json(
        { error: "Webhook configuration is incomplete." },
        { status: 500 }
      );
    }

    // Preserve the exact raw request body for signature verification.
    const rawBody = await request.text();

    const receivedSignature = request.headers.get(
      "x-square-hmacsha256-signature"
    );

    if (!receivedSignature) {
      return NextResponse.json(
        { error: "Missing Square signature." },
        { status: 401 }
      );
    }

    // Verify that this notification came from Square.
    const expectedSignature = createHmac(
      "sha256",
      signatureKey
    )
      .update(notificationUrl + rawBody)
      .digest("base64");

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "base64"
    );

    const receivedBuffer = Buffer.from(
      receivedSignature,
      "base64"
    );

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return NextResponse.json(
        { error: "Invalid Square signature." },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);

    // Only process completed payment updates.
    if (event.type !== "payment.updated") {
      return NextResponse.json({ received: true });
    }

    const paymentId = event.data?.object?.payment?.id;

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID missing." },
        { status: 400 }
      );
    }

    // Ask Square directly for the payment details.
    const paymentResponse = await fetch(
      `https://connect.squareupsandbox.com/v2/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Square-Version": "2026-09-16",
        },
        cache: "no-store",
      }
    );

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error("Square payment lookup failed:", paymentData);

      return NextResponse.json(
        { error: "Could not verify payment with Square." },
        { status: 502 }
      );
    }

    const payment = paymentData.payment;

    if (
      payment?.status !== "COMPLETED" ||
      payment?.location_id !== locationId ||
      payment?.currency !== "CAD" ||
      !payment?.order_id ||
      !payment?.id ||
      !Number.isInteger(payment?.amount_money?.amount)
    ) {
      return NextResponse.json({
        received: true,
        credited: false,
      });
    }

    // Use a server-only Supabase client.
    const admin = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Credit coins only through the protected database function.
    const { error } = await admin.rpc(
      "credit_coin_purchase",
      {
        p_square_order_id: payment.order_id,
        p_square_payment_id: payment.id,
        p_amount_cents: payment.amount_money.amount,
      }
    );

    if (error) {
      console.error("Coin credit failed:", error);

      return NextResponse.json(
        { error: "Could not credit the coin purchase." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      received: true,
      credited: true,
    });
  } catch (error) {
    console.error("Square webhook error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
