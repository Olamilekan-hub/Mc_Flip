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
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isNumListingModalOpen, setIsNumListingModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteOption, setDeleteOption] = useState<string>("");
  const [daysToDelete, setDaysToDelete] = useState<number>(30);
  const [importUrls, setImportUrls] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingNumListing, setLoadingNumListing] = useState(false);
  const [numListing, setNumListing] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [fetchedList, setFetchedList] = useState([]);
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

const fetchKeys = async () => {
  const docRef = doc(db, "users", userID);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    setApiKey(typeof data.apiKey === "string" ? data.apiKey : "");
    setApiSecret(typeof data.apiSecret === "string" ? data.apiSecret : "");
  }
};

if (status === "authenticated" && userID) {
  fetchKeys().catch((error) => {
    console.error("Error fetching API keys:", error);
  });
}}, [status, session, userID]);


const fetchListings = async (userId: string) => {
    const userCollection = collection(db, "users", userId, "importedListings");
  
    const querySnapshot = await getDocs(userCollection);
    let savedListings = querySnapshot.docs.map((doc) => doc.data());
  
    // Ensure savedListings is an array of items, not an array of objects containing listings arrays
    savedListings = savedListings.flatMap((entry) => entry.listings || []);
  
     setFetchedList(savedListings);
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
  console.log(dataResponse)

  interface Listing {
    id: string;
    kind: string;
    description: string;
    owner: string;
    category: string;
    name: string;
    price: number;
    accept_currency: string;
    upc: string;
    cognitoidp_client: string;
    tags: string[];
    digital: boolean;
    digital_deliverable: string;
    photo: string;
    image_urls: string[];
    // status: string;
    shipping_fee: number;
    shipping_paid_by: string;
    shipping_within_days: number;
    expire_in_days: number;
    visibility: string;
    cover_photo: string;
    additional_images: [],
  }
  
  const formattedData: { listings: Listing[] } = {
    listings: (fetchedList ?? []).map((listing: Listing) => ({
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
      // status: listing.status,
      shipping_fee: listing.shipping_fee,
      shipping_paid_by: listing.shipping_paid_by,
      shipping_within_days: listing.shipping_within_days,
      expire_in_days: listing.expire_in_days,
      image_url: listing.photo[listing.cover_photo]?.view_url,
      additional_images: Object.values(listing.photo)
        .map(photo => photo.view_url)
        .filter(url => typeof url === "string" && url.trim() !== ""),
      cover_photo: listing.cover_photo? listing.cover_photo : "",
    })),
  };
  console.log(formattedData)

  // const mockDataResponse = [
  //   {
  //     owner: "user123",
  //     name: "nEW CS2 - Dragon Lore AWP",
  //     description: "Factory New Dragon Lore AWP Skin with 0.001 Float",
  //     upc: "CS2-DLORE-001",
  //     price: 150000, // $1,500.00
  //     accept_currency: "USD",
  //     shipping_within_days: 1,
  //     expire_in_days: 7,
  //     cognitoidp_client: "game_client_1",
  //     tags: ["Type:AWP", "Wear:Factory New", "Game:CS2"],
  //     digital_deliverable: "transfer",
  //     image_url: "https://dummyimage.com/600x400/ff9900/ffffff&text=Dragon+Lore+AWP",
  //     additional_images: [
  //       "https://dummyimage.com/600x400/006699/ffffff&text=Dragon+Lore+Side",
  //       "https://dummyimage.com/600x400/990066/ffffff&text=Dragon+Lore+Back"
  //     ]
  //   },
  //   {
  //     owner: "user456",
  //     name: "nEW Dota 2 Arcana Bundle",
  //     description: "Exclusive Arcana Bundle with Rare Immortals",
  //     upc: "DOTA2-ARC-002",
  //     price: 9999, // $99.99
  //     accept_currency: "USD",
  //     shipping_within_days: 1,
  //     expire_in_days: 7,
  //     cognitoidp_client: "game_client_2",
  //     tags: ["Type:Bundle", "Rarity:Arcana", "Game:Dota2"],
  //     digital_deliverable: "transfer",
  //     image_url: "https://dummyimage.com/600x400/663399/ffffff&text=Dota+2+Arcana"
  //   },
  //   {
  //     owner: "user789",
  //     name: "nEW CSGO - Butterfly Knife",
  //     description: "Factory New Butterfly Knife | Fade (100% Fade)",
  //     upc: "CSGO-BFLY-003",
  //     price: 89999, // $899.99
  //     accept_currency: "USD",
  //     shipping_within_days: 1,
  //     expire_in_days: 7,
  //     cognitoidp_client: "game_client_1",
  //     tags: ["Type:Knife", "Wear:Factory New", "Game:CSGO", "Pattern:Fade"],
  //     digital_deliverable: "transfer",
  //     image_url: "https://dummyimage.com/600x400/cc3300/ffffff&text=Butterfly+Knife+Fade",
  //     additional_images: [
  //       "https://dummyimage.com/600x400/cc6600/ffffff&text=Knife+Animation",
  //       "https://dummyimage.com/600x400/cc9900/ffffff&text=Pattern+Index"
  //     ]
  //   }
  // ];


  // const handlePostListing = async () => {
  //   setIsProcessing(true);

  //   try {
  //     // Validate if there's data to process
  //     if (!dataResponse || dataResponse.length === 0) {
  //       console.log("No listing data available for posting.");
  //       return;
  //     }

  //     // Format the data according to the API's expected structure
  //     const formattedData = {
  //       listings: dataResponse.map((listing) => ({
  //         id: listing.id,
  //         kind: listing.kind,
  //         description: listing.description,
  //         owner: listing.owner,
  //         category: listing.category,
  //         name: listing.name,
  //         price: listing.price,
  //         accept_currency: listing.accept_currency,
  //         upc: listing.upc,
  //         cognitoidp_client: listing.cognitoidp_client,
  //         tags: listing.tags,
  //         digital: listing.digital,
  //         digital_deliverable: listing.digital_deliverable,
  //         photo: listing.photo,
  //         status: listing.status,
  //         shipping_fee: listing.shipping_fee,
  //         shipping_paid_by: listing.shipping_paid_by,
  //         shipping_within_days: listing.shipping_within_days,
  //         expire_in_days: listing.expire_in_days,
  //         visibility: listing.visibility,
  //       })),
  //     };

  //     console.log("Posting listings:", formattedData);

  //     // Make the API call with the properly formatted data
  //     const response = await axios.post(
  //       "http://localhost:8000/api/post-listings",
  //       formattedData,
  //     );

  //     if (response.data?.message) {
  //       console.log("Listings posted successfully:", response.data);
  //       alert(response.data.message);
  //     } else {
  //       throw new Error("Invalid response from server");
  //     }
  //   } catch (error) {
  //     console.error("Error posting listings:", error);
  //     const errorMessage =
  //       error.response?.data?.detail ||
  //       error.message ||
  //       "Failed to create listings";
  //     alert(errorMessage);
  //   } finally {
  //     setIsProcessing(false);
  //   }
  // };

  const handlePostListing = async () => {
    setIsProcessing(true);
    const results = [];

    try {
        const dataResponse = formattedData.listings;

        if (!dataResponse || dataResponse.length === 0) {
            console.log("No listing data available for posting.");
            return;
        }

        for (const listing of dataResponse) {
            const listingData = {
                kind: "item",
                owner: listing.owner,
                status: "draft",
                name: listing.name,
                description: listing.description,
                category: "DIGITAL_INGAME",
                platform: "unknown",
                upc: listing.upc,
                price: listing.price,
                accept_currency: listing.accept_currency,
                shipping_within_days: listing.shipping_within_days || 3,
                expire_in_days: listing.expire_in_days || 7,
                shipping_fee: 0,
                shipping_paid_by: "seller",
                shipping_predefined_package: "None",
                cognitoidp_client: listing.cognitoidp_client,
                tags: listing.tags || ["id:bundle", "type:custom"],
                digital: true,
                digital_region: "none",
                digital_deliverable: listing.digital_deliverable || "transfer",
                visibility: "public",
                image_url: listing.image_url,
                additional_images: listing.additional_images,
            };

            try {
                const response: { data: { status: string; listing_id?: string } } = await axios.post(
                    "http://localhost:8000/api/post-listing-with-image",
                    listingData,
                    { headers: { "Content-Type": "application/json" } }
                );

                if (response.data.status === "SUCCESS") {
                    const listingId = response.data.listing_id;
                    results.push({
                        listing: listing.name,
                        status: "Success",
                        data: response.data,
                        listingId,
                    });
                }
            } catch (error) {
                console.error(`Error posting listing ${listing.name}:`, error);

                // Check for listing limit error
                if (
                    error.response?.status === 422 &&
                    error.response?.data?.detail?.includes("listing limit")
                ) {
                    alert(
                        "Listing limit reached. Please remove some listings before adding more."
                    );
                    break; // Stop processing more listings
                }

                results.push({
                    listing: listing.name,
                    status: "Failed",
                    error: error.response?.data?.detail || error.message,
                });
            }
        }

        const successfulListings = results.filter(
            (r) => r.status === "Success"
        ).length;

        if (successfulListings > 0) {
            alert(
                `Successfully created ${successfulListings} out of ${results.length} listings`
            );
        } else {
            throw new Error("Failed to create any listings");
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


  const handleImport = async () => {
  setIsImporting(true);
  try {
    const urls = importUrls.split("\n").filter((url) => url.trim() !== "");
    console.log(`Importing ${urls.length} URLs:`, urls);

    const response = await axios.post("http://localhost:8000/api/import-listings", {
      urls,
      api_key: apiKey as string,
      api_secret: apiSecret as string,
    });

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

  const fetchBulkList = async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.get("http://localhost:8000/api/gameflip/listings", {
        headers: {
          'apiKey': apiKey,
          'apiSecret': apiSecret,
        },
      });
      setUrls((response.data as { urls: string[] }).urls);
    } catch (err) {
      setError("Failed to fetch listings. Please try again.");
    }

    setLoading(false);
  };

  const handleCheckListings = async () => {
    setLoadingNumListing(true);
    setNumListing(null);

    try {
      const response = await fetch(`http://localhost:8000/api/count-listings?apiKey=${encodeURIComponent(apiKey)}&apiSecret=${encodeURIComponent(apiSecret)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }

      const result = await response.json();
      setNumListing(result);      
      setNumListing(result);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingNumListing(false);
    }
  };

  const handleDeleteListings = async () => {
  setIsDeleting(true);
  try {
    const response = await axios.post(
      "http://localhost:8000/api/delete-old-listings",
      { delete_threshold: 1,      
        api_key: apiKey,
        api_secret: apiSecret,
       }, // Pass threshold in body
      {
        headers: {
          "api_key": apiKey,
          "api_secret": apiSecret,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data || response.data.status !== "success") {
      throw new Error("Invalid API response format");
    }

    console.log("Listings deleted successfully:", response.data);

    // fetchListings(userID); // Refresh the listings after deletion
  } catch (error) {
    console.error("Error deleting listings:", error);
  } finally {
    setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setDeleteOption("");
  }
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
              <Button variant="outline" 
              className="w-full"
                onClick={() => setIsBulkModalOpen(true)}
              >
                <Link2 className="mr-2 h-4 w-4" />
                Get Bulk Links
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {setIsNumListingModalOpen(true); handleCheckListings()}}
              >
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

      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="">
          <DialogHeader>
            <DialogTitle>Bulk URLs</DialogTitle>
          </DialogHeader>
          {error && <p className="text-red-500 mt-2">{error}</p>}
          <div className="max-h-1/2 overflow-auto ">
                {urls.length > 0 && (
              <ul className="mt-4">
                {urls.map((url, index) => (
                  <li key={index} className="mt-1 text-sm">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-xs">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsBulkModalOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
            onClick={fetchBulkList}
            disabled={loading}
              className={loading ? "bg-primary/70" : ""}
            >
              {loading ? "Loading..." : "Get Bulk List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNumListingModalOpen} onOpenChange={setIsNumListingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cheack Listings</DialogTitle>
          </DialogHeader>
          <div  className="flex items-center justify-center">
            <p className="text-md">Total Listings Available:  <span> 
            {loadingNumListing ? "Checking..." : (numListing ? numListing.total_listings : 0)}</span></p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsNumListingModalOpen(false)}
              variant="outline"
            >
              Cancel
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
              onClick={handleDeleteListings}
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
