"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { LogOut } from "lucide-react";
import { db } from "~/lib/firebase"; // Ensure Firebase is initialized
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

export function SettingsPage() {
  const { data: session, status } = useSession();
  const USER_ID = session?.user?.id;

  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  // Initialize numeric states with default values to keep inputs controlled
  const [timeBetweenListings, setTimeBetweenListings] = useState<number>(5);
  const [deleteListingsHours, setDeleteListingsHours] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  // show alert state
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

  interface UserData {
    apiKey?: string;
    apiSecret?: string;
    timeBetweenListings?: number;
    deleteListingsHours?: number;
  }

  // Fetch API Keys from Firestore
  useEffect(() => {
    const fetchApiKeys = async () => {
      const docRef = doc(db, "users", USER_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData; // Cast to your defined type
        setApiKey(typeof data.apiKey === "string" ? data.apiKey : "");
        setApiSecret(typeof data.apiSecret === "string" ? data.apiSecret : "");

        const updateData: Partial<UserData> = {};
        if (data.timeBetweenListings === undefined || data.timeBetweenListings === null) {
          setTimeBetweenListings(5);
          updateData.timeBetweenListings = 5;
        } else {
          setTimeBetweenListings(data.timeBetweenListings);
        }
        if (data.deleteListingsHours === undefined || data.deleteListingsHours === null) {
          setDeleteListingsHours(1);
          updateData.deleteListingsHours = 1;
        } else {
          setDeleteListingsHours(data.deleteListingsHours);
        }
        if (Object.keys(updateData).length > 0) {
          await setDoc(docRef, updateData, { merge: true });
        }
      }
    };

    if (status === "authenticated" && USER_ID) {
      fetchApiKeys().catch((error) => {
        console.error("Error fetching API keys and Timing:", error);
      });
    }
  }, [status, USER_ID]);

  // Save API Keys to Firestore
  const handleSave = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "users", USER_ID);
      await setDoc(
        docRef,
        { apiKey, apiSecret, deleteListingsHours, timeBetweenListings },
        { merge: true }
      );
      showAlert("API Keys and Timing updated successfully!");
    } catch (error) {
      console.error("Error saving API keys and Timing:", error);
      showAlert("Failed to save API keys.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <div className="container mx-auto p-4">
        <div className="space-y-8">
          <h1 className="text-2xl font-bold text-primary">Settings</h1>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Timing Settings */}
            <Card className="border-primary/20 bg-card">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="listingTime" className="text-sm font-medium text-primary">
                      Set time between listings (seconds):
                    </label>
                    <Input
                      id="listingTime"
                      type="number"
                      min="5"
                      value={timeBetweenListings}
                      onChange={(e) => setTimeBetweenListings(Number(e.target.value))}
                      className="bg-background border-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="deleteTime" className="text-sm font-medium text-primary">
                      Delete listings older than (hours):
                    </label>
                    <Input
                      id="deleteTime"
                      type="number"
                      min="1"
                      value={deleteListingsHours}
                      onChange={(e) => setDeleteListingsHours(Number(e.target.value))}
                      className="bg-background border-primary/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Keys */}
            <Card className="border-primary/20 bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary">API KEYS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="apiSecret" className="text-sm font-medium text-primary">
                    API Secret:
                  </label>
                  <Input
                    id="apiSecret"
                    type="text"
                    placeholder="input your API Secret"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="font-mono bg-background border-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="apiKey" className="text-sm font-medium text-primary">
                    API Key:
                  </label>
                  <Input
                    id="apiKey"
                    type="text"
                    placeholder="input your API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono bg-background border-primary/20"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Settings"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/90"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <Dialog open={alertModal} onOpenChange={setAlertModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ALERT!</DialogTitle>
          </DialogHeader>
          <div
            className="flex items-center justify-center text-md underline flex-col mx-auto w-full"
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
