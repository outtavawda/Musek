
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Invitation = {
  id: string;
  label_id: string;
  status: string;
  created_at: string;
};

type LabelProfile = {
  id: string;
  label_name: string | null;
  display_name: string | null;
};

export default function ArtistInvitations() {
  const supabase = useMemo(() => createClient(), []);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [labels, setLabels] = useState<LabelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("Please sign in to view your invitations.");
        setLoading(false);
        return;
      }

      const { data: invitationData, error: invitationError } =
        await supabase
          .from("label_artist_invitations")
          .select("id, label_id, status, created_at")
          .eq("artist_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

      if (invitationError) {
        throw invitationError;
      }

      const { data: relationshipData, error: relationshipError } =
        await supabase
          .from("label_artists")
          .select("label_id")
          .eq("artist_id", user.id);

      if (relationshipError) {
        throw relationshipError;
      }

      const labelIds = Array.from(
        new Set([
          ...(invitationData ?? []).map((item) => item.label_id),
          ...(relationshipData ?? []).map((item) => item.label_id),
        ])
      );

      let labelData: LabelProfile[] = [];

      if (labelIds.length > 0) {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, label_name, display_name")
          .in("id", labelIds);

        if (error) {
          throw error;
        }

        labelData = data ?? [];
      }

      setInvitations(invitationData ?? []);
      setLabels(labelData);
    } catch (error) {
      console.error("Artist invitation loading error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load artist invitations."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  async function respondToInvitation(
    invitationId: string,
    response: "accepted" | "declined"
  ) {
    setProcessingId(invitationId);
    setMessage("");

    try {
      const { error } = await supabase.rpc(
        "respond_to_label_invitation",
        {
          p_invitation_id: invitationId,
          p_response: response,
        }
      );

      if (error) {
        throw error;
      }

      setMessage(
        response === "accepted"
          ? "Invitation accepted successfully."
          : "Invitation declined."
      );

      await loadInvitations();
    } catch (error) {
      console.error("Invitation response error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update the invitation."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function getLabelName(labelId: string) {
    const label = labels.find((item) => item.id === labelId);

    return (
      label?.label_name ||
      label?.display_name ||
      "Record Label"
    );
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold">
          Record Label Invitations
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Loading invitations...
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">
          Record Label Invitations
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          View invitations from record labels and manage your
          label memberships.
        </p>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-gray-100 p-3 text-sm">
          {message}
        </div>
      )}

      <div className="space-y-3">
        {invitations.length === 0 ? (
          <p className="text-sm text-gray-500">
            You have no pending record label invitations.
          </p>
        ) : (
          invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="rounded-lg border border-gray-200 p-4"
            >
              <h3 className="font-semibold">
                {getLabelName(invitation.label_id)}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                This record label has invited you to join its roster.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={processingId === invitation.id}
                  onClick={() =>
                    respondToInvitation(invitation.id, "accepted")
                  }
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {processingId === invitation.id
                    ? "Please wait..."
                    : "Accept"}
                </button>

                <button
                  type="button"
                  disabled={processingId === invitation.id}
                  onClick={() =>
                    respondToInvitation(invitation.id, "declined")
                  }
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <h3 className="font-semibold">Your Record Labels</h3>

        {labels.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            You have not joined a record label yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {labels.map((label) => (
              <li
                key={label.id}
                className="rounded-lg bg-gray-50 p-3 text-sm font-medium"
              >
                {label.label_name ||
                  label.display_name ||
                  "Record Label"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
