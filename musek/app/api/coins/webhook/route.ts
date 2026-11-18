
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
    .digest("base64");

  const expectedBuffer = Buffer.from(expected, "base64");
  const receivedBuffer = Buffer.from(received, "base64");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
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
      console.error("Webhook signature header is missing.");

      return NextResponse.json(
        { error: "Missing Square signature." },
        { status: 401 }
      );
    }

    const exactMatch = signatureMatches(
      signatureKey,
      notificationUrl,
      rawBody,
      receivedSignature
    );

    if (!exactMatch) {
      let requestUrl = "";
      let configuredUrlDetails = {};
      let incomingUrlDetails = {};

      try {
        const configured = new URL(notificationUrl);
        const incoming = new URL(request.url);

        requestUrl = request.url;

        configuredUrlDetails = {
          host: configured.host,
          path: configured.pathname,
          queryParameterNames: [...configured.searchParams.keys()].sort(),
        };

        incomingUrlDetails = {
          host: incoming.host,
          path: incoming.pathname,
          queryParameterNames: [...incoming.searchParams.keys()].sort(),
        };
      } catch {
        console.error("Could not inspect webhook URL metadata.");
      }

      console.error("Square signature diagnostic:", {
        signatureMismatch: true,
        signatureKeyLength: signatureKey.length,
        signatureKeyHasOuterWhitespace:
          signatureKey !== signatureKey.trim(),
        notificationUrlLength: notificationUrl.length,
        notificationUrlHasOuterWhitespace:
          notificationUrl !== notificationUrl.trim(),
        notificationUrlHasTrailingSlash:
          notificationUrl.endsWith("/"),
        configuredUrlDetails,
        incomingUrlDetails,
        incomingUrlMatchesConfiguredUrl:
          requestUrl === notificationUrl,
        trimmedKeyWouldMatch: signatureMatches(
          signatureKey.trim(),
          notificationUrl,
          rawBody,
          receivedSignature
        ),
        trimmedUrlWouldMatch: signatureMatches(
          signatureKey,
          notificationUrl.trim(),
          rawBody,
          receivedSignature
        ),
      });

      return NextResponse.json(
        { error: "Invalid Square signature." },
        { status: 401 }
      );
    }

    let event;

    try {
      event = JSON.parse(rawBody);
    } catch {
      console.error("Webhook rejected: Invalid JSON payload.");

      return NextResponse.json(
        { error: "Invalid webhook payload." },
        { status: 400 }
      );
    }

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
      payment?.amount_money?.currency !== "CAD" ||
      !payment?.order_id ||
      !payment?.id ||
      !Number.isInteger(payment?.amount_money?.amount)
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
      console.error("Coin credit failed:", error);

      return NextResponse.json(
        { error: "Could not credit the coin purchase." },
        { status: 500 }
      );
    }

    console.log("Coin purchase successfully processed:", payment.id);

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
