
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function signatureMatches(
  key: string,
  url: string,
  body: string,
  received: string
): boolean {
  // Square signatures are Base64-encoded HMAC-SHA256 values.
  const expected = createHmac("sha256", key)
    .update(url + body)
    .digest();

  let receivedBuffer: Buffer;

  try {
    receivedBuffer = Buffer.from(received, "base64");

    // Reject malformed or non-canonical Base64 signatures.
    if (receivedBuffer.toString("base64") !== received) {
      return false;
    }
  } catch {
    return false;
  }

  return (
    expected.length === receivedBuffer.length &&
    timingSafeEqual(expected, receivedBuffer)
  );
}

export async function POST(request: Request) {
  try {
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (
      !signatureKey ||
      !notificationUrl ||
      !accessToken ||
      !supabaseUrl ||
      !serviceKey ||
      !locationId
    ) {
      console.error("Webhook configuration is incomplete.");

      return NextResponse.json(
        { error: "Webhook configuration is incomplete." },
        { status: 500 }
      );
    }

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

    const validSignature = signatureMatches(
      signatureKey,
      notificationUrl,
      rawBody,
      receivedSignature
    );

    if (!validSignature) {
      console.error("Square webhook rejected: Invalid signature.");

      return NextResponse.json(
        { error: "Invalid Square signature." },
        { status: 401 }
      );
    }

    let event: any;

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook payload." },
        { status: 400 }
      );
    }

    if (event.type !== "payment.updated") {
      return NextResponse.json({ received: true });
    }

    const paymentId = event.data?.object?.payment?.id;

    if (typeof paymentId !== "string" || !paymentId) {
      return NextResponse.json(
        { error: "Payment ID missing." },
        { status: 400 }
      );
    }

    const paymentResponse = await fetch(
      `https://connect.squareupsandbox.com/v2/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Square-Version": "2026-09-16",
        },
        cache: "no-store",
      }
    );

    if (!paymentResponse.ok) {
      console.error("Square payment lookup failed:", paymentResponse.status);

      return NextResponse.json(
        { error: "Could not verify payment with Square." },
        { status: 502 }
      );
    }

    const paymentData = await paymentResponse.json();
    const payment = paymentData.payment;

    if (
      payment?.status !== "COMPLETED" ||
      payment?.location_id !== locationId ||
      payment?.amount_money?.currency !== "CAD" ||
      typeof payment?.order_id !== "string" ||
      !payment.order_id ||
      payment?.id !== paymentId ||
      !Number.isSafeInteger(payment?.amount_money?.amount) ||
      payment.amount_money.amount <= 0
    ) {
      console.error("Payment not eligible for coin credit.");

      return NextResponse.json({
        received: true,
        credited: false,
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await admin.rpc("credit_coin_purchase", {
      p_square_order_id: payment.order_id,
      p_square_payment_id: payment.id,
      p_amount_cents: payment.amount_money.amount,
    });

    if (error) {
      console.error("Coin credit failed:", error.message);

      return NextResponse.json(
        { error: "Could not credit the coin purchase." },
        { status: 500 }
      );
    }

    console.log("Square payment processed:", payment.id);

    return NextResponse.json({
      received: true,
      credited: true,
    });
  } catch (error) {
    console.error(
      "Square webhook processing failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
