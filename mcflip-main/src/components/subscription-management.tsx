"use client"

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useSession } from "next-auth/react";
import axios from "axios";

export default function SubscriptionManagement() {
  const { data: session, status } = useSession();
  const USER_ID = session?.user?.id;
  const [subscriptionCode, setSubscriptionCode] = useState("");
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  // For admin: duration in days (numeric input)
  const [durationDays, setDurationDays] = useState(7);
  // Local state for the countdown display
  const [timeRemaining, setTimeRemaining] = useState("");

  // Countdown timer effect – updates every second and saves "subStatus" to Firestore
  useEffect(() => {
    let interval;
    if (subscriptionDetails && subscriptionDetails.expires_at) {
      interval = setInterval(() => {
        const expires = new Date(subscriptionDetails.expires_at);
        const now = new Date();
        const diff = expires - now;
        // Determine status based on time remaining
        let newStatus;
        if (diff <= 0) {
          newStatus = "Expired";
          setTimeRemaining("Expired");
          // Update Firestore only once when status changes to "Expired"
          if (!subscriptionDetails.subStatus || subscriptionDetails.subStatus !== "Expired") {
            setSubscriptionDetails((prev) => ({ ...prev, subStatus: "Expired" }));
            const docRef = doc(db, "users", USER_ID);
            // Do not await here to avoid blocking the timer
            setDoc(docRef, { subStatus: "Expired" }, { merge: true });
          }
          clearInterval(interval);
        } else {
          newStatus = "Active";
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / (1000 * 60)) % 60);
          const seconds = Math.floor((diff / 1000) % 60);
          setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
          // Update Firestore if status is not "Active"
          if (!subscriptionDetails.subStatus || subscriptionDetails.subStatus !== "Active") {
            setSubscriptionDetails((prev) => ({ ...prev, subStatus: "Active" }));
            const docRef = doc(db, "users", USER_ID);
            setDoc(docRef, { subStatus: "Active" }, { merge: true });
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [subscriptionDetails, USER_ID]);

  // Fetch subscription details from Firestore for the current user
  useEffect(() => {
    const fetchSubscription = async () => {
      if (USER_ID) {
        const docRef = doc(db, "users", USER_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.subscription_key) {
            setSubscriptionDetails({
              subscription_key: data.subscription_key,
              expires_at: data.expires_at,
              subStatus: data.subStatus || "Active",
            });
          }
        }
      }
    };
    if (status === "authenticated" && USER_ID) {
      fetchSubscription().catch(err => console.error(err));
    }
  }, [status, USER_ID]);

  // Handle subscription activation (for non-admin users)
  const handleActivate = async () => {
    if (!subscriptionCode) return;
    setLoading(true);
    try {
      const payload = {
        user_token: USER_ID,
        subscription_code: subscriptionCode,
      };
      const response = await axios.post("http://localhost:8000/api/activate-subscription", payload);
      if (response.data && response.data.subscription_key) {
        // Update local subscription details with subStatus "Active"
        const updatedSub = {
          subscription_key: response.data.subscription_key,
          expires_at: response.data.expires_at,
          subStatus: "Active",
        };
        setSubscriptionDetails(updatedSub);
        const docRef = doc(db, "users", USER_ID);
        await setDoc(
          docRef,
          updatedSub,
          { merge: true }
        );
        alert("Subscription activated successfully!");

        // For non-admin users, remove the used code from the admin's Firestore record
        if (USER_ID) {
          const adminDocRef = doc(db, "users", "pcSsHaAKZQdJb7lPNZIZq3wuwZJ2");
          const adminSnap = await getDoc(adminDocRef);
          if (adminSnap.exists() && adminSnap.data().generated_subscription_codes) {
            let codes = adminSnap.data().generated_subscription_codes;
            if (codes.includes(subscriptionCode)) {
              codes = codes.filter(c => c !== subscriptionCode);
              await setDoc(adminDocRef, { generated_subscription_codes: codes }, { merge: true });
            }
          }
        }
      } else {
        alert("Activation failed!");
      }
    } catch (error) {
      console.error("Activation error", error);
      alert("Subscription activation failed. " + error.response?.data?.detail);
    } finally {
      setLoading(false);
    }
  };

  // Handle generating a subscription code (admin only)
  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      // Call the backend endpoint with the admin's token and duration in days (as a string)
      const response = await axios.get("http://localhost:8000/api/generate-subscription-code", {
        params: { user_token: USER_ID, duration: durationDays.toString() }
      });
      if (response.data && response.data.subscription_code) {
        const generatedCode = response.data.subscription_code;
        setSubscriptionCode(generatedCode);
        // Also store the generated code in the admin's Firestore document
        const adminDocRef = doc(db, "users", USER_ID);
        const adminSnap = await getDoc(adminDocRef);
        let codes = [];
        if (adminSnap.exists() && adminSnap.data().generated_subscription_codes) {
          codes = adminSnap.data().generated_subscription_codes;
        }
        codes.push(generatedCode);
        await setDoc(adminDocRef, { generated_subscription_codes: codes }, { merge: true });
        alert("Generated subscription code: " + generatedCode);
      }
    } catch (error) {
      console.error("Error generating code", error);
      alert("Failed to generate code");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-background text-foreground dark">
      <h1 className="text-2xl font-bold">Subscription Management</h1>
      
      {subscriptionDetails ? (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle>Active Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Your subscription is {subscriptionDetails.subStatus}.</p>
            <p>
              Expires: {new Date(subscriptionDetails.expires_at).toLocaleString()}
            </p>
            <div className="space-y-1">
              <p>Time Remaining: {timeRemaining}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have an active subscription.</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-muted">
        <CardHeader>
          <CardTitle>Activate Subscription</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Enter your subscription code"
            className="flex-grow"
            value={subscriptionCode}
            onChange={(e) => setSubscriptionCode(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={handleActivate}
            disabled={loading || !USER_ID}
          >
            {loading ? "Activating..." : "Activate"}
          </Button>
          {/* Show code generation UI only if the logged‑in user is the admin */}
          {USER_ID === "pcSsHaAKZQdJb7lPNZIZq3wuwZJ2" && (
            <>
              <Input
                type="number"
                placeholder="Enter duration in days"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-40"
              />
              <Button
                variant="outline"
                onClick={handleGenerateCode}
                disabled={generating}
              >
                {generating ? "Generating..." : "Generate Code"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}