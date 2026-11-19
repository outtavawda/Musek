
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Artist = {
  id: string;
  display_name: string | null;
  artist_name: string | null;
  avatar_url: string | null;
  location: string | null;
};

type Invitation = {
  id: string;
  artist_id: string;
  status: string;
  created_at: string;
};

export default function ArtistManagement() {
  const supabase = createClient();

  const [labelId, setLabelId] = useState("");
  const [search, setSearch] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roster, setRoster] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please sign in to manage your artists.");
      setLoading(false);
      return;
    }

    setLabelId(user.id);

    const { data: invitationData, error: invitationError } =
      await supabase
        .from("label_artist_invitations")
        .select("id, artist_id, status, created_at")
        .eq("label_id", user.id)
        .order("created_at", { ascending: false });

    if (invitationError) {
      setMessage(invitationError.message);
    } else {
      setInvitations(invitationData || []);
    }

    const { data: relationshipData, error: relationshipError } =
      await supabase
        .from("label_artists")
        .select("artist_id")
        .eq("label_id", user.id);

    if (relationshipError) {
      setMessage(relationshipError.message);
      setLoading(false);
      return;
    }

    const artistIds = (relationshipData || []).map(
      (relationship) => relationship.artist_id
    );

    if (artistIds.length > 0) {
      const { data: artistData } = await supabase
        .from("user_profiles")
        .select("id, display_name, artist_name, avatar_url, location")
        .in("id", artistIds);

      setRoster(artistData || []);
    } else {
      setRoster([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function searchArtists() {
    setMessage("");
    setArtists([]);

    if (search.trim().length < 2) {
      setMessage("Enter at least two characters to search.");
      return;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, display_name, artist_name, avatar_url, location")
      .eq("account_type", "artist")
      .eq("is_public", true)
      .or(
        `artist_name.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`
      )
      .limit(20);

    if (error) {
      setMessage(error.message);
      return;
    }

    setArtists(data || []);

    if (!data || data.length === 0) {
      setMessage("No public artists found.");
    }
  }

  async function inviteArtist(artistId: string) {
    if (!labelId) return;

    setBusyId(artistId);
    setMessage("");

    const { error } = await supabase
      .from("label_artist_invitations")
      .insert({
        label_id: labelId,
        artist_id: artistId,
      });

    if (error) {
      setMessage(
        error.code === "23505"
          ? "An invitation is already pending for this artist."
          : error.message
      );
    } else {
      setMessage("Artist invitation sent successfully!");
      await loadData();
    }

    setBusyId("");
  }

  async function cancelInvitation(invitationId: string) {
    setBusyId(invitationId);
    setMessage("");

    const { error } = await supabase.rpc(
      "cancel_label_invitation",
      { p_invitation_id: invitationId }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Invitation cancelled.");
      await loadData();
    }

    setBusyId("");
  }

  function artistName(artist: Artist | undefined) {
    return artist?.artist_name || artist?.display_name || "Artist";
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-gray-300">
        Loading artist management...
      </div>
    );
  }

  return (
    <section className="mt-8 space-y-8">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Find Artists</h2>
        <p className="mt-2 text-sm text-gray-400">
          Search public MUSEK artist profiles and invite artists
          to join your label.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") searchArtists();
            }}
            placeholder="Search artist name..."
            className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-purple-500"
          />

          <button
            onClick={searchArtists}
            className="rounded-lg bg-purple-600 px-6 py-3 font-semibold hover:bg-purple-500"
          >
            Search Artists
          </button>
        </div>

        {artists.length > 0 && (
          <div className="mt-6 space-y-3">
            {artists.map((artist) => {
              const alreadySigned = roster.some(
                (member) => member.id === artist.id
              );

              const pending = invitations.some(
                (invitation) =>
                  invitation.artist_id === artist.id &&
                  invitation.status === "pending"
              );

              return (
                <div
                  key={artist.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-800 p-4"
                >
                  <div className="flex items-center gap-3">
                    {artist.avatar_url ? (
                      <img
                        src={artist.avatar_url}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-800 font-bold">
                        {artistName(artist).charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <p className="font-semibold">
                        {artistName(artist)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {artist.location || "Location not listed"}
                      </p>
                    </div>
                  </div>

                  {alreadySigned ? (
                    <span className="text-sm text-green-400">
                      Already signed
                    </span>
                  ) : pending ? (
                    <span className="text-sm text-yellow-400">
                      Invitation pending
                    </span>
                  ) : (
                    <button
                      onClick={() => inviteArtist(artist.id)}
                      disabled={busyId === artist.id}
                      className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500 disabled:opacity-50"
                    >
                      {busyId === artist.id ? "Sending..." : "Invite Artist"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">My Artists</h2>
        <p className="mt-2 text-sm text-gray-400">
          Artists who have accepted your label invitations.
        </p>

        {roster.length === 0 ? (
          <p className="mt-5 text-gray-400">
            No artists have joined your label yet.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {roster.map((artist) => (
              <div
                key={artist.id}
                className="flex items-center gap-3 rounded-xl border border-gray-800 p-4"
              >
                {artist.avatar_url ? (
                  <img
                    src={artist.avatar_url}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-800 font-bold">
                    {artistName(artist).charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="font-semibold">{artistName(artist)}</p>
                  <p className="text-sm text-green-400">
                    Signed artist
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Sent Invitations</h2>

        {invitations.filter((item) => item.status === "pending").length === 0 ? (
          <p className="mt-5 text-gray-400">
            You have no pending invitations.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {invitations
              .filter((item) => item.status === "pending")
              .map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 p-4"
                >
                  <div>
                    <p className="font-semibold">Artist invitation</p>
                    <p className="text-sm text-yellow-400">Pending</p>
                  </div>

                  <button
                    onClick={() => cancelInvitation(invitation.id)}
                    disabled={busyId === invitation.id}
                    className="rounded-lg border border-red-500 px-4 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50"
                  >
                    {busyId === invitation.id ? "Cancelling..." : "Cancel"}
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {message && (
        <p className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-sm text-gray-200">
          {message}
        </p>
      )}
    </section>
  );
}
