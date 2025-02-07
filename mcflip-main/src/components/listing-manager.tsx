"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { collection, doc, setDoc, getDocs, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase"; 
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import {
  Package,
  Settings,
  Boxes,
  CreditCard,
  Import,
  Link2,
  ClipboardList,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function ListingManager() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteOption, setDeleteOption] = useState<string>("");
  const [daysToDelete, setDaysToDelete] = useState<number>(30);
  const [importUrls, setImportUrls] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  interface ResponseData {
    data?: { id: string; name: string; image_urls: string[]; price?: number }[];
  }

  const [responseData, setResponseData] = useState<ResponseData | null>(null);

  const { data: session, status } = useSession();
  const userID = session?.user?.id;
  console.log(userID)

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchListings(session.user.id).catch((error) => {
        console.error("Error fetching listings:", error);
      });
    }
  }, [status, session]);

  const fetchListings = async (userId: string) => {
    const userCollection = collection(db, "users", userId, "importedListings");
  
    const querySnapshot = await getDocs(userCollection);
    let savedListings = querySnapshot.docs.map((doc) => doc.data());
  
    // Ensure savedListings is an array of items, not an array of objects containing listings arrays
    savedListings = savedListings.flatMap((entry) => entry.listings || []);
  
    setResponseData({ data: savedListings });
    console.log("Fetched listings from Firestore:", savedListings);
  }; 

  const listings = [
    { id: "1", name: "20k floor launchers", icon: "📦" },
    { id: "2", name: "MSK MATERIAL BUNDLE", icon: "🎁" },
    { id: "3", name: "RUSTY MECHANICAL PARTS", icon: "⚙️" },
    { id: "4", name: "msk and pre-quest carry", icon: "🎮" },
    { id: "5", name: "20k zap-o-max", icon: "⚡" },
    { id: "6", name: "VENTURE XP 50k", icon: "📈" },
    { id: "7", name: "STURDY TWINE", icon: "🧵" },
  ];

  const filteredListings = listings.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(listings.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleItemSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    }
  };

  const dataResponse = responseData?.data;

  const handlePostListing = async () => {
    setIsProcessing(true);

    try {
      // Validate if there's data to process
      if (!dataResponse || dataResponse.length === 0) {
        console.log("No listing data available for posting.");
        return;
      }

      // Format the data according to the API's expected structure
      const formattedData = {
        listings: dataResponse.map((listing) => ({
          id: listing.id,
          kind: listing.kind,
          description: listing.description,
          owner: listing.owner,
          category: listing.category,
          name: listing.name,
          price: listing.price,
          accept_currency: listing.accept_currency,
          upc: listing.upc,
          cognitoidp_client: listing.cognitoidp_client,
          tags: listing.tags,
          digital: listing.digital,
          digital_deliverable: listing.digital_deliverable,
          photo: listing.photo,
          status: listing.status,
          shipping_fee: listing.shipping_fee,
          shipping_paid_by: listing.shipping_paid_by,
          shipping_within_days: listing.shipping_within_days,
          expire_in_days: listing.expire_in_days,
          visibility: listing.visibility,
        })),
      };

      console.log("Posting listings:", formattedData);

      // Make the API call with the properly formatted data
      const response = await axios.post(
        "http://localhost:8000/api/post-listings",
        formattedData,
      );

      if (response.data?.message) {
        console.log("Listings posted successfully:", response.data);
        alert(response.data.message);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error posting listings:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to create listings";
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // const handleImport = async () => {
  //   setIsImporting(true);
  //   try {
  //     const urls = importUrls.split("\n").filter((url) => url.trim() !== "");
  //     console.log(`Importing ${urls.length} URLs:`, urls);
  
  //     const response = await axios.post(
  //       "http://localhost:8000/api/import-listings",
  //       { urls }
  //     );
  
  //     console.log("Import successful:", response.data);
  //     const newListings = response.data.data;
  
  //     // Save imported data to Firestore
  //     const userId = userID; // Replace with actual user ID from authentication
  //     const userDocRef = doc(db, "users", userId, "importedListings", "allListings");
  
  //     // Fetch the existing document
  //     const docSnap = await getDoc(userDocRef);
  
  //     if (docSnap.exists()) {
  //       // Merge new listings with existing ones
  //       const existingListings = docSnap.data().listings || [];
  //       const mergedListings = [...existingListings, ...newListings];
  
  //       // Update Firestore with merged listings
  //       await setDoc(userDocRef, { listings: mergedListings }, { merge: true });
  //     } else {
  //       // If document doesn't exist, create a new one
  //       await setDoc(userDocRef, { listings: newListings });
  //     }
  
  //     console.log("Data saved to Firestore as a single document.");
  //     fetchListings(userId); // Refresh listings
  
  //   } catch (error) {
  //     console.error("Error importing URLs:", error);
  //   } finally {
  //     setIsImporting(false);
  //     setIsImportModalOpen(false);
  //     setImportUrls("");
  //   }
  // };

  const handleImport = async () => {
  setIsImporting(true);
  try {
    const urls = importUrls.split("\n").filter((url) => url.trim() !== "");
    console.log(`Importing ${urls.length} URLs:`, urls);

    const response = await axios.post(
      "http://localhost:8000/api/import-listings",
      { urls }
    );

    // Ensure response data exists
    if (!response.data || !response.data.data) {
      throw new Error("Invalid API response format");
    }

    let newListings = response.data.data; // Use let instead of const

    // Ensure `newListings` is an array
    if (!Array.isArray(newListings)) newListings = [];

    console.log("New Listings:", newListings);

    const userId = userID; // Replace with actual user ID
    const userDocRef = doc(db, "users", userId, "importedListings", "allListings");

    // Fetch the existing document
    const docSnap = await getDoc(userDocRef);

    let existingListings = [];
    if (docSnap.exists() && docSnap.data()?.listings) {
      existingListings = docSnap.data().listings;
    }

    // Ensure `existingListings` is an array
    if (!Array.isArray(existingListings)) existingListings = [];

    const mergedListings = [...existingListings, ...newListings];

    // Update Firestore
    await setDoc(userDocRef, { listings: mergedListings }, { merge: true });

    console.log("Data saved to Firestore.");
    fetchListings(userId); // Refresh listings

  } catch (error) {
    console.error("Error importing URLs:", error);
  } finally {
    setIsImporting(false);
    setIsImportModalOpen(false);
    setImportUrls("");
  }
};

    


  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      switch (deleteOption) {
        case "expired":
          console.log("Deleting expired listings");
          break;
        case "older":
          console.log(`Deleting listings older than ${daysToDelete} days`);
          break;
        case "all":
          console.log("Deleting all listings");
          break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      console.error("Error deleting listings:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setDeleteOption("");
    }
  };

  const handlePostingToggle = async () => {
    setIsProcessing(true);
    try {
      if (!isPosting) {
        // Start posting action
        await startPosting();
        setIsPosting(true);
      } else {
        // Stop posting action
        await stopPosting();
        setIsPosting(false);
      }
    } catch (error) {
      console.error("Error toggling posting:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const startPosting = async () => {
    // Simulate API call or actual posting logic
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Started posting listings");
  };

  const stopPosting = async () => {
    // Simulate API call or actual stopping logic
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Stopped posting listings");
  };

  return (
    <div className="dark min-h-screen bg-background p-4 text-foreground">
      <h2 className="mb-4 text-xl font-bold text-white">Create New Listing</h2>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <Card className="border-accent bg-card p-4">
            <div className="space-y-2">
              <Button
                className={`w-full ${
                  isProcessing
                    ? "cursor-not-allowed bg-gray-500"
                    : isPosting
                      ? "bg-destructive hover:bg-destructive/90"
                      : "bg-accent hover:bg-accent/90"
                } text-accent-foreground`}
                // onClick={handlePostingToggle}
                onClick={handlePostListing}
                disabled={isProcessing}
              >
                {isProcessing
                  ? "Processing..."
                  : isPosting
                    ? "Stop Posting"
                    : "Post Listings"}
              </Button>
              <Button className="w-full bg-[#9333EA] text-white hover:bg-[#9333EA]/90">
                CUSTOM ORDER
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Listings
              </Button>
            </div>
          </Card>

          <Card className="border-accent bg-card p-4">
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsImportModalOpen(true)}
              >
                <Import className="mr-2 h-4 w-4" />
                Import URL
              </Button>
              <Button variant="outline" className="w-full">
                <Link2 className="mr-2 h-4 w-4" />
                Get Bulk Links
              </Button>
              <Button variant="outline" className="w-full">
                <ClipboardList className="mr-2 h-4 w-4" />
                Check Listings
              </Button>
            </div>
          </Card>
        </div>

        <Card className="border-accent bg-card p-4">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Available Listings to Post
          </h3>
          <div className="mb-4 flex items-center justify-between">
            <Input
              placeholder="Search by name"
              className="w-2/3"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex items-center space-x-2">
              <Switch
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm text-white">
                Select All
              </label>
            </div>
          </div>

          <div className="space-y-2">
            {responseData?.data && (
              <div className="space-y-2">
                {responseData.data.map(
                  (item: {
                    id: string;
                    name: string;
                    image_urls: string[];
                    price?: number;
                  }) => (
                    <div
                      key={item.id}
                      className="flex items-center space-x-3 rounded-lg border border-border p-2 text-xl text-white hover:bg-accent hover:text-accent-foreground"
                    >
                      <Switch
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) =>
                          handleItemSelect(item.id, checked)
                        }
                      />
                      <img
                        src={`http://localhost:8000/static/${item.image_urls[0]}`}
                        alt={item.name}
                        className="h-10 w-10 rounded-full"
                      />
                      <span className="text-xl">{item.name}</span>
                      <span>
                        {item.price ? `$${item.price}` : "Price not available"}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}

            {filteredListings.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-3 rounded-lg border border-border p-2 text-white hover:bg-accent hover:text-accent-foreground"
              >
                <Switch
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={(checked) =>
                    handleItemSelect(item.id, checked)
                  }
                />
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="link" className="text-muted-foreground" onClick={() => signOut( )}>
          Logout
        </Button>
      </div>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import URLs</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Paste URLs here, one per line"
            value={importUrls}
            onChange={(e) => setImportUrls(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              onClick={() => setIsImportModalOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importUrls.trim() === "" || isImporting}
              className={isImporting ? "bg-primary/70" : ""}
            >
              {isImporting
                ? "Importing..."
                : `Import (${importUrls.split("\n").filter((url) => url.trim() !== "").length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Listings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select onValueChange={setDeleteOption} value={deleteOption}>
              <SelectTrigger>
                <SelectValue placeholder="Select delete option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expired">Remove expired</SelectItem>
                <SelectItem value="older">Remove older than</SelectItem>
                <SelectItem value="all">Remove all</SelectItem>
              </SelectContent>
            </Select>

            {deleteOption === "older" && (
              <div className="space-y-2">
                <label htmlFor="days" className="text-sm text-muted-foreground">
                  Days
                </label>
                <Input
                  id="days"
                  type="number"
                  value={daysToDelete}
                  onChange={(e) => setDaysToDelete(Number(e.target.value))}
                  min={1}
                  className="w-full"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsDeleteModalOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={!deleteOption || isDeleting}
              className={isDeleting ? "bg-destructive/70" : ""}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
