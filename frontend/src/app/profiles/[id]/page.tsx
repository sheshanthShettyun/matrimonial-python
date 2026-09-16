"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { profileApi, Profile, interestApi } from "@/lib/api";
import { PixelButton } from "@/components/PixelButton";
import { ProfileCard } from "@/components/ProfileCard";
import confetti from "canvas-confetti";

import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/UserMenu";

export default function ProfileDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile: myProfile } = useAuth();
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isMatched, setIsMatched] = useState(false);
  const [showMailNotification, setShowMailNotification] = useState(false);

  // DEMO HARDCODE: Sriyaan (user_id 1) -> Priya (user_id 2) always gets
  // the mail + effects moment, regardless of the real mutual-match state.
  const PRIYA_DEMO_USER_ID = 2;
  const SRIYAAN_DEMO_SENDER_ID = 1;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await profileApi.getById(Number(id));
        setTargetProfile(res.data);
      } catch {
        setError("Profile not found");
      }
    };
    load();
  }, [id]);

  // Records WHO matched: the phone pops up only for Priya (user_id 2).
  const recordMatch = (theirId: number) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("isMatched", "true");
    localStorage.setItem("matchedUserId", String(theirId));
    window.dispatchEvent(new CustomEvent("heartmate_matched", { detail: { userId: theirId } }));
  };

  // Check if already matched with this person on page load
  useEffect(() => {
    const checkExistingMatch = async () => {
      const myId = user?.userId;
      const theirId = targetProfile?.user?.userId;
      if (!myId || !theirId || myId === theirId) return;
      try {
        const res = await interestApi.checkMatch(myId, theirId);
        if (res.data.matched && typeof window !== "undefined") {
          setIsMatched(true);
          setMessage("It's a Match! ♥");
          recordMatch(theirId);
        }
      } catch {
        // Silently ignore — match check is best-effort
      }
    };
    checkExistingMatch();
  }, [user?.userId, targetProfile?.user?.userId]);

  // Real-time Chroma Key (Green Screen Removal) via Canvas
  useEffect(() => {
    let animId: number;
    const renderFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && !video.paused && !video.ended) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          if (video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const l = frame.data.length / 4;
          for (let i = 0; i < l; i++) {
            const r = frame.data[i * 4 + 0];
            const g = frame.data[i * 4 + 1];
            const b = frame.data[i * 4 + 2];
            // Green screen detection threshold
            if (g > 80 && g > r * 1.15 && g > b * 1.15) {
              frame.data[i * 4 + 3] = 0; // Make transparent
            }
          }
          ctx.putImageData(frame, 0, 0);
        }
      }
      animId = requestAnimationFrame(renderFrame);
    };
    renderFrame();
    return () => cancelAnimationFrame(animId);
  }, []);

  const triggerMatch = () => {
    setShowMailNotification(false);

    setMessage("It's a Match! ♥");
    setIsMatched(true);

    const theirId = targetProfile?.user?.userId;
    if (theirId) recordMatch(theirId);
    
    // Trigger confetti
    const end = Date.now() + 3 * 1000;
    const colors = ['#ff007f', '#ff7eb3'];
    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());

    // Play video
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleSendInterest = async () => {
    const senderId = user?.userId;
    if (!senderId) {
      alert("Please log in to send interest");
      return;
    }
    if (senderId === targetProfile?.user?.userId) {
      alert("Cannot send interest to yourself");
      return;
    }
    try {
      await interestApi.send(senderId, targetProfile!.user!.userId!);

      // DEMO HARDCODE: Sriyaan -> Priya shows matched immediately, then the
      // mail notification pops after 3s (clicking it plays the effects).
      // Bypasses the real mutual-match check below.
      if (senderId === SRIYAAN_DEMO_SENDER_ID && targetProfile!.user!.userId === PRIYA_DEMO_USER_ID) {
        setMessage("It's a Match! ♥");
        setIsMatched(true);
        recordMatch(PRIYA_DEMO_USER_ID);
        setTimeout(() => {
          setShowMailNotification(true);
        }, 3000);
        return;
      }

      // Check if this send created a mutual match
      try {
        const matchRes = await interestApi.checkMatch(senderId, targetProfile!.user!.userId!);
        if (matchRes.data.matched) {
          setTimeout(() => {
            setShowMailNotification(true);
          }, 3000);
          return;
        }
      } catch {
        // Fall through to default message if match check fails
      }

      setMessage("Interest sent! Waiting for their response.");

    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Could not send interest.";
      // DEMO HARDCODE: seed data already holds a PENDING Sriyaan->Priya interest,
      // which makes re-sending fail — still play the demo moment: matched now,
      // mail pops after 3s.
      if (senderId === SRIYAAN_DEMO_SENDER_ID && targetProfile?.user?.userId === PRIYA_DEMO_USER_ID && msg.includes("already pending")) {
        setMessage("It's a Match! ♥");
        setIsMatched(true);
        recordMatch(PRIYA_DEMO_USER_ID);
        setTimeout(() => {
          setShowMailNotification(true);
        }, 3000);
        return;
      }
      setError(msg);
    }
  };

  const [showDetailsModal, setShowDetailsModal] = useState(false);

  if (error) return (
    <main className="match-page">
      <div className="match-stage">
        <div className="pixel-alert-error">{error}</div>
      </div>
    </main>
  );

  if (!targetProfile) return (
    <main className="match-page">
      <div className="match-stage">
        <p style={{ fontFamily: "Press Start 2P", fontSize: "0.6rem" }}>Loading...</p>
      </div>
    </main>
  );

  return (
    <main className="match-page" style={{ position: "relative", overflow: "hidden" }}>
      <UserMenu />
      {/* Details Modal */}
      {showDetailsModal && targetProfile && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 200,
          padding: "1rem"
        }}>
          <div className="pixel-border pixel-card" style={{ maxWidth: "450px", width: "100%", padding: "1.5rem", backgroundColor: "#fff" }}>
            <h2 style={{ fontFamily: "Press Start 2P", fontSize: "0.8rem", color: "var(--pixel-pink)", marginBottom: "1rem" }}>
              {targetProfile.user?.name}'s Full Profile
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "1rem", fontFamily: "Press Start 2P", fontSize: "0.5rem" }}>
              <div>
                <strong style={{ color: "var(--pixel-pink)" }}>Age:</strong> {targetProfile.age}
              </div>
              <div>
                <strong style={{ color: "var(--pixel-pink)" }}>Gender:</strong> {targetProfile.gender}
              </div>
              <div>
                <strong style={{ color: "var(--pixel-pink)" }}>City:</strong> {targetProfile.city}
              </div>
              <div>
                <strong style={{ color: "var(--pixel-pink)" }}>Education:</strong> {targetProfile.education || "N/A"}
              </div>
              <div>
                <strong style={{ color: "var(--pixel-pink)" }}>Occupation:</strong> {targetProfile.occupation || "N/A"}
              </div>
              <div>
                <strong style={{ color: "var(--pixel-pink)" }}>Email:</strong> {targetProfile.user?.email || "N/A"}
              </div>
            </div>
            {targetProfile.about && (
              <div style={{ marginBottom: "1.5rem" }}>
                <p style={{ fontFamily: "Press Start 2P", fontSize: "0.5rem", color: "var(--pixel-pink)", marginBottom: "0.4rem" }}>About</p>
                <p style={{ fontFamily: "Press Start 2P", fontSize: "0.5rem", color: "var(--pixel-ink)", lineHeight: 1.6 }}>{targetProfile.about}</p>
              </div>
            )}
            <PixelButton variant="secondary" onClick={() => setShowDetailsModal(false)}>
              Close
            </PixelButton>
          </div>
        </div>
      )}

      {/* Mail Notification */}
      {showMailNotification && (
        <div 
          onClick={triggerMatch}
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            fontSize: "3rem",
            cursor: "pointer",
            zIndex: 100,
            animation: "bounceMail 1s infinite alternate"
          }}
        >
          💌
        </div>
      )}

      <div className="match-stage" style={{ display: "block", padding: "2rem clamp(1rem, 4vw, 4rem)", position: "relative", zIndex: 10 }}>
        <PixelButton variant="secondary" onClick={() => router.back()} style={{ marginBottom: "1.5rem" }}>
          ← Back
        </PixelButton>
        {message && <div className="pixel-alert-success" style={{ textAlign: "center", fontSize: "1rem" }}>{message}</div>}

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", flexWrap: "wrap", marginTop: "2rem" }}>
          
          {/* My Profile */}
          <div style={{ transform: isMatched ? "rotate(-5deg) scale(1.05)" : "none", transition: "transform 0.5s ease" }}>
            <h2 style={{ fontFamily: "Press Start 2P", fontSize: "0.6rem", color: "var(--pixel-pink)", textAlign: "center", marginBottom: "1rem" }}>You</h2>
            {myProfile ? (
              <div style={{ width: 320 }}>
                <ProfileCard profile={myProfile} showActionButton={false} />
              </div>
            ) : (
              <div className="pixel-border" style={{ width: 320, padding: "2rem", textAlign: "center", fontFamily: "Press Start 2P", fontSize: "0.5rem" }}>
                No Profile Found for You
              </div>
            )}
          </div>

          {/* Big Heart pop */}
          {isMatched && (
            <div style={{ animation: "popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards", fontSize: "4rem", color: "#ff007f", textShadow: "0 0 20px #ff7eb3", zIndex: 20 }}>
              ♥
            </div>
          )}
          {!isMatched && (
            <div style={{ fontSize: "2rem", color: "var(--pixel-border)" }}>
              ?
            </div>
          )}

          {/* Target Profile */}
          <div style={{ transform: isMatched ? "rotate(5deg) scale(1.05)" : "none", transition: "transform 0.5s ease" }}>
            <h2 style={{ fontFamily: "Press Start 2P", fontSize: "0.6rem", color: "var(--pixel-pink)", textAlign: "center", marginBottom: "1rem" }}>Them</h2>
            <div style={{ width: 320 }}>
              <ProfileCard 
                profile={targetProfile} 
                showActionButton={true}
                onAction={() => setShowDetailsModal(true)} 
              />
            </div>
          </div>

        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "3rem" }}>
          {!isMatched && (
            <PixelButton onClick={handleSendInterest} style={{ fontSize: "1rem", padding: "1rem 2rem" }}>
              Send Interest
            </PixelButton>
          )}
        </div>
      </div>

      {/* Hidden source video */}
      <video
        ref={videoRef}
        src="/cats.mp4"
        style={{ display: "none" }}
        muted
        playsInline
        loop
      />

      {/* Chroma key processed canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "400px",
          height: "auto",
          zIndex: 50,
          opacity: isMatched ? 1 : 0,
          transition: "opacity 0.5s ease",
          pointerEvents: "none",
        }}
      />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounceMail {
          0% { transform: translateY(0); }
          100% { transform: translateY(-10px); }
        }
      `}} />
    </main>
  );
}
