"use client"

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { db } from "~/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useSession } from "next-auth/react";
import axios from "axios";

export default function SubscriptionManagement() {
  const { data: session, status } = useSession();
  const USER_ID = session?.user?.id;
  const [subscriptionCode, setSubscriptionCode] = useState("");
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [durationDays, setDurationDays] = useState(7);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [alertModal, setAlertModal] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertModal(true);
    setTimeout(() => {
      setAlertModal(false);
      setAlertMessage("");
    }, 60000); // 1 minute
  };

  // Countdown timer effect – updates every second and saves "subStatus" to Firestore
  useEffect(() => {
    let interval;
    if (subscriptionDetails && subscriptionDetails.expires_at) {
      interval = setInterval(() => {
        const expires = new Date(subscriptionDetails.expires_at);
        const now = new Date();
        const diff = expires.getTime() - now.getTime();
        let newStatus;
        if (diff <= 0) {
          newStatus = "Expired";
          setTimeRemaining("Expired");
          if (!subscriptionDetails.subStatus || subscriptionDetails.subStatus !== "Expired") {
            setSubscriptionDetails((prev: any) => ({ ...prev, subStatus: "Expired" }));
            const docRef = doc(db, "users", USER_ID);
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
          if (!subscriptionDetails.subStatus || subscriptionDetails.subStatus !== "Active") {
            setSubscriptionDetails((prev: any) => ({ ...prev, subStatus: "Active" }));
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
      fetchSubscription().catch((err) => {
        // Error handling (if needed) without logging sensitive info to the console.
      });
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
        const updatedSub = {
          subscription_key: response.data.subscription_key,
          expires_at: response.data.expires_at,
          subStatus: "Active",
        };
        setSubscriptionDetails(updatedSub);
        const docRef = doc(db, "users", USER_ID);
        await setDoc(docRef, updatedSub, { merge: true });
        showAlert("Subscription activated successfully!");

        // For non-admin users, remove the used code from the admin's Firestore record
        if (USER_ID) {
          const adminDocRef = doc(db, "users", "pcSsHaAKZQdJb7lPNZIZq3wuwZJ2");
          const adminSnap = await getDoc(adminDocRef);
          if (adminSnap.exists() && adminSnap.data().generated_subscription_codes) {
            let codes = adminSnap.data().generated_subscription_codes;
            if (codes.includes(subscriptionCode)) {
              codes = codes.filter((c: string) => c !== subscriptionCode);
              await setDoc(adminDocRef, { generated_subscription_codes: codes }, { merge: true });
            }
          }
        }
      } else {
        showAlert("Activation failed!");
      }
    } catch (error: any) {
      // Instead of logging errors to the console, display them via the alert modal.
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        showAlert("Subscription activation failed, " + error.response.data.detail + ".");
      } else {
        showAlert("Subscription activation failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle generating a subscription code (admin only)
  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const response = await axios.get("http://localhost:8000/api/generate-subscription-code", {
        params: { user_token: USER_ID, duration: durationDays.toString() }
      });
      if (response.data && response.data.subscription_code) {
        const generatedCode = response.data.subscription_code;
        setSubscriptionCode(generatedCode);
        const adminDocRef = doc(db, "users", USER_ID);
        const adminSnap = await getDoc(adminDocRef);
        let codes = [];
        if (adminSnap.exists() && adminSnap.data().generated_subscription_codes) {
          codes = adminSnap.data().generated_subscription_codes;
        }
        codes.push(generatedCode);
        await setDoc(adminDocRef, { generated_subscription_codes: codes }, { merge: true });
        showAlert("Generated subscription code: " + generatedCode);
      }
    } catch (error) {
      showAlert("Failed to generate code");
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

      <Dialog open={alertModal} onOpenChange={setAlertModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ALERT!</DialogTitle>
          </DialogHeader>
          <div
            className="flex items-center justify-center text-md flex-col mx-auto w-full"
            dangerouslySetInnerHTML={{ __html: alertMessage }}
          />
          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
            <Button onClick={() => setAlertModal(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
