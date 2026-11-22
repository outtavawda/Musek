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
  const expected = createHmac("sha256", key)
    .update(url + body)
    .digest();

  let receivedBuffer: Buffer;

  try {
    receivedBuffer = Buffer.from(received, "base64");
    if (receivedBuffer.toString("base64") !== received) return false;
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
    const squareApiBase =
      process.env.SQUARE_ENVIRONMENT === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

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

    if (
      !signatureMatches(
        signatureKey,
        notificationUrl,
        rawBody,
        receivedSignature
      )
    ) {
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
      `${squareApiBase}/v2/payments/${encodeURIComponent(paymentId)}`,
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

    // Intermediate payment states are normal; Square will send another
    // payment.updated event when the payment reaches a final state.
    if (payment?.status !== "COMPLETED") {
      return NextResponse.json({
        received: true,
        credited: false,
        outcome: "not_completed",
      });
    }

    // A completed payment must satisfy every MUSEK checkout invariant.
    if (
      payment?.location_id !== locationId ||
      payment?.amount_money?.currency !== "CAD" ||
      typeof payment?.order_id !== "string" ||
      !payment.order_id ||
      payment?.id !== paymentId ||
      !Number.isSafeInteger(payment?.amount_money?.amount) ||
      payment.amount_money.amount <= 0
    ) {
      console.error("Completed Square payment failed MUSEK validation.", {
        paymentId,
        orderId: payment?.order_id ?? null,
        locationMatches: payment?.location_id === locationId,
        currency: payment?.amount_money?.currency ?? null,
      });

      // Do not silently acknowledge a completed payment that could not be
      // credited. A non-2xx response allows Square to retry delivery.
      return NextResponse.json(
        { error: "Completed payment requires reconciliation." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: creditResult, error } = await admin.rpc(
      "credit_coin_purchase_v2",
      {
        p_square_order_id: payment.order_id,
        p_square_payment_id: payment.id,
        p_amount_cents: payment.amount_money.amount,
      }
    );

    if (error) {
      console.error("Coin credit failed:", error.message);
      return NextResponse.json(
        { error: "Could not credit the coin purchase." },
        { status: 500 }
      );
    }

    if (creditResult === "credited") {
      console.log("Square payment credited:", payment.id);
      return NextResponse.json({
        received: true,
        credited: true,
        outcome: "credited",
      });
    }

    if (creditResult === "already_processed") {
      console.log("Square payment was already credited:", payment.id);
      return NextResponse.json({
        received: true,
        credited: false,
        outcome: "already_processed",
      });
    }

    if (
      creditResult === "not_found" ||
      creditResult === "amount_mismatch" ||
      creditResult === "not_eligible"
    ) {
      console.error("Square payment requires reconciliation:", {
        paymentId: payment.id,
        orderId: payment.order_id,
        outcome: creditResult,
      });
      return NextResponse.json(
        { error: `Payment reconciliation required: ${creditResult}.` },
        { status: 500 }
      );
    }

    console.error("Unexpected coin credit result:", creditResult);
    return NextResponse.json(
      { error: "Unexpected coin credit result." },
      { status: 500 }
    );
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
