
"use client";

import { useCallback, useEffect, useState } from "react";
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

type JoinedLabel = {
  label_id: string;
  joined_at: string;
};

export default function ArtistInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [labels, setLabels] = useState<LabelProfile[]>([]);
  const [joinedLabels, setJoinedLabels] = useState<LabelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please sign in to view your artist invitations.");
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
      setError(invitationError.message);
      setLoading(false);
      return;
    }

    const { data: joinedData, error: joinedError } = await supabase
      .from("label_artists")
      .select("label_id, joined_at")
      .eq("artist_id", user.id);

    if (joinedError) {
      setError(joinedError.message);
      setLoading(false);
      return;
    }

    const pendingInvitations = (invitationData || []) as Invitation[];
    const joined = (joinedData || []) as JoinedLabel[];

    const labelIds = Array.from(
      new Set([
        ...pendingInvitations.map((invitation) => invitation.label_id),
        ...joined.map((relationship) => relationship.label_id),
      ])
    );

    let labelProfiles: LabelProfile[] = [];

    if (labelIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, label_name, display_name")
        .in("id", labelIds);

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      labelProfiles = (profileData || []) as LabelProfile[];
    }

    setInvitations(pendingInvitations);
    setLabels(labelProfiles);

    setJoinedLabels(
      joined
        .map((relationship) =>
          labelProfiles.find(
            (profile) => profile.id === relationship.label_id
          )
        )
        .filter((profile): profile is LabelProfile => Boolean(profile))
    );

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function respondToInvitation(
    invitationId: string,
    response: "accepted" | "declined"
  ) {
    setBusyId(invitationId);
    setMessage("");
    setError("");

    const { error: responseError } = await supabase.rpc(
      "respond_to_label_invitation",
      {
        p_invitation_id: invitationId,
        p_response: response,
      }
    );

    if (responseError) {
      setError(responseError.message);
      setBusyId(null);
      return;
    }

    setMessage(
      response === "accepted"
        ? "You have accepted the label invitation."
        : "You have declined the label invitation."
    );

    await loadData();
    setBusyId(null);
  }

  function getLabelName(labelId: string) {
    const label = labels.find((item) => item.id === labelId);

    return label?.label_name || label?.display_name || "Record Label";
  }

  return (
    <section
      style={{
        marginTop: "40px",
        padding: "24px",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "14px",
      }}
    >
      <p className="eyebrow">RECORD LABELS</p>
      <h2>Artist Invitations</h2>

      <p className="muted">
        View invitations from record labels and manage your label
        memberships.
      </p>

      {loading ? (
        <p className="muted" style={{ marginTop: "20px" }}>
          Loading your invitations...
        </p>
      ) : (
        <>
          {error && (
            <p style={{ color: "#f87171", marginTop: "16px" }}>
              {error}
            </p>
          )}

          {message && (
            <p style={{ color: "#4ade80", marginTop: "16px" }}>
              {message}
            </p>
          )}

          <div style={{ marginTop: "24px" }}>
            <h3>Pending Invitations</h3>

            {invitations.length === 0 ? (
              <p className="muted" style={{ marginTop: "12px" }}>
                You have no pending label invitations.
              </p>
            ) : (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  style={{
                    padding: "16px",
                    marginTop: "12px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                  }}
                >
                  <strong>{getLabelName(invitation.label_id)}</strong>

                  <p className="muted" style={{ marginTop: "6px" }}>
                    Invitation received{" "}
                    {new Date(invitation.created_at).toLocaleDateString(
                      "en-CA"
                    )}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "16px",
                    }}
                  >
                    <button
                      type="button"
                      disabled={busyId === invitation.id}
                      onClick={() =>
                        respondToInvitation(invitation.id, "accepted")
                      }
                      className="primaryButton"
                    >
                      {busyId === invitation.id
                        ? "Please wait..."
                        : "Accept Invitation"}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === invitation.id}
                      onClick={() =>
                        respondToInvitation(invitation.id, "declined")
                      }
                      className="secondaryButton"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: "28px" }}>
            <h3>My Record Labels</h3>

            {joinedLabels.length === 0 ? (
              <p className="muted" style={{ marginTop: "12px" }}>
                You have not joined a record label yet.
              </p>
            ) : (
              joinedLabels.map((label) => (
                <div
                  key={label.id}
                  style={{
                    padding: "14px",
                    marginTop: "10px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                  }}
                >
                  <strong>{getLabelName(label.id)}</strong>
                  <p className="muted" style={{ marginTop: "5px" }}>
                    Artist membership active
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
