
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const COIN_PACKAGES = {
  "100": { coins: 100, amount: 100 },
  "500": { coins: 500, amount: 500 },
  "1000": { coins: 1000, amount: 1000 },
} as const;

type PackageKey = keyof typeof COIN_PACKAGES;

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase configuration is incomplete." },
        { status: 500 }
      );
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options: CookieOptions;
            }[]
          ) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(
        "Coin checkout authentication failed:",
        authError?.message
      );

      return NextResponse.json(
        { error: "Please log in before buying coins." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const packageKey = String(body.package);

    if (
      !Object.prototype.hasOwnProperty.call(
        COIN_PACKAGES,
        packageKey
      )
    ) {
      return NextResponse.json(
        { error: "Invalid coin package." },
        { status: 400 }
      );
    }

    const selectedPackage =
      COIN_PACKAGES[packageKey as PackageKey];

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const squareApiBase =
      process.env.SQUARE_ENVIRONMENT === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (
      !accessToken ||
      !locationId ||
      !serviceKey ||
      !siteUrl
    ) {
      return NextResponse.json(
        { error: "Payment server configuration is incomplete." },
        { status: 500 }
      );
    }

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

    const squareResponse = await fetch(
      `${squareApiBase}/v2/online-checkout/payment-links`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2026-09-16",
        },
        body: JSON.stringify({
          idempotency_key: randomUUID(),
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
            redirect_url: `${siteUrl}/dashboard?coinPurchase=returned`,
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
