
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const COIN_PACKAGES = {
  "100": { coins: 100, amount: 100 },
  "500": { coins: 500, amount: 500 },
  "1000": { coins: 1000, amount: 1000 },
} as const;

export async function POST(request: Request) {
  try {
    // Confirm the fan is logged in.
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in before buying coins." },
        { status: 401 }
      );
    }

    // Read the selected package.
    const body = await request.json();
    const selectedPackage =
      COIN_PACKAGES[String(body.package as string)];

    if (!selectedPackage) {
      return NextResponse.json(
        { error: "Invalid coin package." },
        { status: 400 }
      );
    }

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (
      !accessToken ||
      !locationId ||
      !supabaseUrl ||
      !serviceKey ||
      !siteUrl
    ) {
      return NextResponse.json(
        { error: "Payment server configuration is incomplete." },
        { status: 500 }
      );
    }

    // Create a server-only Supabase client.
    const admin = createAdminClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const idempotencyKey = randomUUID();

    // Create a Square-hosted Sandbox checkout.
    const squareResponse = await fetch(
      "https://connect.squareupsandbox.com/v2/online-checkout/payment-links",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2026-09-16",
        },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          order: {
            location_id: locationId,
            reference_id: user.id,
            line_items: [
              {
                name: `${selectedPackage.coins} MUSEK Coins`,
                quantity: "1",
                base_price_money: {
                  amount: selectedPackage.amount,
                  currency: "CAD",
                },
              },
            ],
          },
          checkout_options: {
            redirect_url: `${siteUrl}/buy-coins?checkout=complete`,
          },
        }),
      }
    );

    const squareData = await squareResponse.json();

    if (
      !squareResponse.ok ||
      !squareData.payment_link?.url ||
      !squareData.payment_link?.order_id
    ) {
      console.error("Square checkout error:", squareData);

      return NextResponse.json(
        { error: "Square could not create the checkout." },
        { status: 502 }
      );
    }

    // Save the pending purchase before returning the checkout link.
    const { error: purchaseError } = await admin
      .from("coin_purchases")
      .insert({
        user_id: user.id,
        coins: selectedPackage.coins,
        amount_cad: selectedPackage.amount / 100,
        status: "pending",
        square_order_id: squareData.payment_link.order_id,
      });

    if (purchaseError) {
      console.error("Purchase record error:", purchaseError);

      return NextResponse.json(
        { error: "Could not save the purchase record." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl: squareData.payment_link.url,
    });
  } catch (error) {
    console.error("Coin checkout error:", error);

    return NextResponse.json(
      { error: "An unexpected checkout error occurred." },
      { status: 500 }
    );
  }
}
