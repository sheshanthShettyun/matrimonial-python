"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { interestApi, Interest, profileApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PixelButton } from "@/components/PixelButton";
import { UserMenu } from "@/components/UserMenu";
import { PixelAvatar } from "@/components/PixelAvatar";

function InterestsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [sent, setSent] = useState<Interest[]>([]);
  const [received, setReceived] = useState<Interest[]>([]);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [profilePhotos, setProfilePhotos] = useState<Record<number, string>>({});

  const currentUserId = user?.userId;

  const loadInterests = async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError("");
    try {
      const s = await interestApi.getSent(currentUserId);
      const r = await interestApi.getReceived(currentUserId);
      setSent(s.data);
      setReceived(r.data);
      const allInterests = [...s.data, ...r.data];

      // Fetch profile photos for all unique partner userIds
      const partnerIds = new Set<number>();
      allInterests.forEach(interest => {
        if (interest.sender?.userId) partnerIds.add(interest.sender.userId);
        if (interest.receiver?.userId) partnerIds.add(interest.receiver.userId);
      });

      const photoResults = await Promise.allSettled(
        Array.from(partnerIds).map(id => profileApi.getByUserId(id))
      );
      const photoMap: Record<number, string> = {};
      photoResults.forEach(result => {
        if (result.status === "fulfilled") {
          const profile = result.value.data;
          if (profile.user?.userId && profile.photoUrl) {
            photoMap[profile.user.userId] = profile.photoUrl;
          }
        }
      });
      setProfilePhotos(photoMap);
    } catch {
      setError("Failed to load interests from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) loadInterests();
  }, [currentUserId]);

  const handleAccept = async (id: number, partnerUserId?: number) => {
    try {
      await interestApi.accept(id);
      await loadInterests();

      // Check if this accept created a mutual match → unlock chat
      if (currentUserId && partnerUserId) {
        try {
          const matchRes = await interestApi.checkMatch(currentUserId, partnerUserId);
          if (matchRes.data.matched && typeof window !== "undefined") {
            localStorage.setItem("isMatched", "true");
            localStorage.setItem("matchedUserId", String(partnerUserId));
            window.dispatchEvent(new CustomEvent("heartmate_matched", { detail: { userId: partnerUserId } }));
          }
        } catch {
          // Silently ignore — match check is best-effort
        }
      }
    } catch {
      setError("Failed to accept interest");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await interestApi.reject(id);
      await loadInterests();
    } catch {
      setError("Failed to reject interest");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this interest record?")) return;
    try {
      await interestApi.delete(id);
      await loadInterests();
    } catch {
      setError("Failed to delete interest");
    }
  };

  const displayed = activeTab === "received" ? received : sent;

  return (
    <main className="match-page" style={{ minHeight: "100vh" }}>
      <UserMenu />
      <div className="match-stage" style={{ display: "block", padding: "2rem clamp(1rem, 4vw, 4rem)", maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Navigation & Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <PixelButton variant="secondary" onClick={() => router.push("/")}>
            ← Back to Catalog
          </PixelButton>
          <h1 className="pixel-page-title" style={{ margin: 0, fontSize: "1.1rem" }}>
            My Interests
          </h1>
        </div>

        {error && <div className="pixel-alert-error">{error}</div>}

        {/* Tab Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <PixelButton
            variant={activeTab === "received" ? "primary" : "secondary"}
            onClick={() => setActiveTab("received")}
            style={{ flex: 1 }}
          >
            Received Requests ({received.length})
          </PixelButton>
          <PixelButton
            variant={activeTab === "sent" ? "primary" : "secondary"}
            onClick={() => setActiveTab("sent")}
            style={{ flex: 1 }}
          >
            Sent Requests ({sent.length})
          </PixelButton>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <p style={{ fontFamily: "Press Start 2P", fontSize: "0.6rem", color: "var(--pixel-ink)", textAlign: "center" }}>
            Loading interest records...
          </p>
        )}

        {/* Empty State */}
        {!loading && displayed.length === 0 && (
          <div className="pixel-border pixel-card" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <p style={{ fontFamily: "Press Start 2P", fontSize: "0.6rem", color: "var(--pixel-pink)", marginBottom: "0.5rem" }}>
              NO INTEREST RECORDS FOUND
            </p>
            <p style={{ fontFamily: "Press Start 2P", fontSize: "0.45rem", color: "var(--pixel-ink)", margin: 0 }}>
              {activeTab === "received"
                ? "You haven't received any interest requests yet."
                : "You haven't sent any interest requests yet."}
            </p>
          </div>
        )}

        {/* Display List */}
        {!loading && displayed.map((interest) => {
          const partner = activeTab === "received" ? interest.sender : interest.receiver;
          const partnerUserId = partner?.userId;
          const photoUrl = partnerUserId ? profilePhotos[partnerUserId] : undefined;
          const statusColor =
            interest.status === "ACCEPTED"
              ? "#27ae60"
              : interest.status === "REJECTED"
              ? "#e74c3c"
              : "var(--pixel-pink)";

          return (
            <div
              key={interest.interestId}
              className="pixel-border pixel-card"
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <PixelAvatar
                  gender={
                    (interest as any).senderProfile?.gender ||
                    (interest as any).receiverProfile?.gender ||
                    ["Priya", "Ananya", "Meera", "Diya", "Isha", "Nisha", "Aditi"].some(n =>
                      partner?.name?.includes(n)
                    ) ? "Female" : "Male"
                  }
                  photoUrl={photoUrl}
                  name={partner?.name}
                  size="card"
                />
                <div>
                  <h3 style={{ fontFamily: "Press Start 2P", fontSize: "0.65rem", color: "var(--pixel-pink)", margin: "0 0 0.3rem" }}>
                    {partner?.name || "Unknown Candidate"}
                  </h3>
                  <p style={{ fontFamily: "Press Start 2P", fontSize: "0.45rem", color: "var(--pixel-ink)", margin: 0 }}>
                    {partner?.email}
                  </p>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "0.4rem",
                      fontFamily: "Press Start 2P",
                      fontSize: "0.45rem",
                      color: statusColor,
                      padding: "2px 6px",
                      border: `2px solid ${statusColor}`,
                    }}
                  >
                    STATUS: {interest.status}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {activeTab === "received" && interest.status === "PENDING" && (
                  <>
                    <PixelButton onClick={() => handleAccept(interest.interestId!, interest.sender?.userId)}>
                      Accept ♥
                    </PixelButton>
                    <PixelButton variant="danger" onClick={() => handleReject(interest.interestId!)}>
                      Reject ✖
                    </PixelButton>
                  </>
                )}
                {activeTab === "sent" && (
                  <PixelButton variant="danger" onClick={() => handleDelete(interest.interestId!)}>
                    Delete 🗑️
                  </PixelButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default function InterestsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InterestsContent />
    </Suspense>
  );
}
