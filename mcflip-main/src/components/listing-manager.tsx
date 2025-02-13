"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { collection, doc, setDoc, getDocs, getDoc, updateDoc, DocumentData, DocumentReference } from "firebase/firestore";
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
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from "~/components/ui/modal";
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
import { CiEdit } from "react-icons/ci";
import { BiSave } from "react-icons/bi";

export function ListingManager() {
  const [selectedItems, setSelectedItems] = useState<Listing[]>([]);
  const [selectedItem, setSelectedItem] = useState<Listing[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isNumListingModalOpen, setIsNumListingModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
  const [taskID, setTaskID] = useState("");
  const [fetchedList, setFetchedList] = useState<Listing[]>([]);
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPostingCustom, setIsPostingCustom] = useState(false);


  interface ResponseData {
    data?: { id: string; name: string; image_urls: string[]; price?: number }[];
  }


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
  
if (!isCustomModalOpen) {
    setTags([]);
    setPhotoPreview(null);
  }
}}, [status]);


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

  const dataResponse = responseData?.data;
  console.log("AA",dataResponse)

  const filteredResponse = dataResponse?.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  console.log("fil", filteredResponse)

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(filteredResponse);
    console.log("Sel", selectedItems)
    } else {
      setSelectedItems([]); // Clear all selections
      console.log("Sel", selectedItems)
    }
  };
  

  const handleItemSelect = (item: { id: string; name: string; image_urls: string[]; price?: number }, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev: ResponseData["data"] = []) => [...prev, item]); // Add full item details
    console.log("Sel", selectedItems)
    } else {
      setSelectedItems((prev: ResponseData["data"] = []) => prev.filter((selected) => selected?.id !== item.id)); // Remove item
      console.log("Sel", selectedItems)
    }
  };


// Check if all filtered items are selected
const allSelected = (filteredResponse?.length ?? 0) > 0 && filteredResponse?.every((item) =>
  selectedItems.some((selected) => selected.id === item.id),
console.log("Sel", selectedItems)
);

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
    image_urls: string;
    shipping_fee: number;
    shipping_paid_by: string;
    shipping_within_days: number;
    expire_in_days: number;
    visibility: string;
    cover_photo: string;
    additional_images: string[],
  }
  
  const formattedData: { listings: Listing[] } = {
    listings: selectedItems.map((listing: Listing) => ({
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
      shipping_fee: listing.shipping_fee,
      shipping_paid_by: listing.shipping_paid_by,
      shipping_within_days: listing.shipping_within_days,
      expire_in_days: listing.expire_in_days,
      visibility: listing.visibility, // Added missing property
      image_urls: typeof listing.photo === 'object' && typeof listing.cover_photo === 'string' && listing.photo[listing.cover_photo] && 'view_url' in listing.photo[listing.cover_photo] ? (listing.photo[listing.cover_photo] as { view_url: string }).view_url : '',
      additional_images: Object.values(listing.photo)
        .map((photo: { view_url?: string }) => (typeof photo === 'object' && 'view_url' in photo ? photo.view_url : ''))
        .filter(url => typeof url === "string" && url.trim() !== ""),
      cover_photo: listing.cover_photo? listing.cover_photo : "",
    })),
  };
  console.log("fd",formattedData)

  const handlePostListing = async () => {
    setIsProcessing(true);
    const results = [];
  
    try {
      const listingsToPost = formattedData.listings;
  
      if (!listingsToPost || listingsToPost.length === 0) {
        console.log("No listing data available for posting.");
        return;
      }
  
      for (const listing of listingsToPost) {
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
          image_url: listing.image_urls,
          additional_images: listing.additional_images || []
        };
  
        try {
          // First, verify that the image URLs are accessible
          const verifyImage = async (url) => {
            try {
              const response = await fetch(url);
              return response.ok;
            } catch (error) {
              console.error(`Failed to verify image URL: ${url}`);setIsProcessing(false);
              return false;
            }
          };
  
          // Verify main image
          const mainImageValid = await verifyImage(listing.image_urls);
          if (!mainImageValid) {
            throw new Error(`Main image URL is not accessible: ${listing.image_urls}`);
            setIsProcessing(false);
          }
  
          // Verify additional images
          if (listing.additional_images) {
            for (const imgUrl of listing.additional_images) {
              const additionalImageValid = await verifyImage(imgUrl);
              if (!additionalImageValid) {
                throw new Error(`Additional image URL is not accessible: ${imgUrl}`);
                setIsProcessing(false);
              }
            }
          }
  
          const response = await axios.post(
            "http://localhost:8000/api/post-listing-with-image",
            listingData,
            { 
              headers: { 
                "Content-Type": "application/json"
              } 
            }
          );
  
          if (response.data.status === "SUCCESS") {
            console.log(`Successfully posted listing: ${listing.name}`);
            setTaskID(response.data.task_id)
            console.log("Task ID", response.data.task_id)
            console.log('Response data:', response.data);
            
            results.push({
              listing: listing.name,
              status: "Success",
              data: response.data,
              listingId: response.data.listing_id,
              imageUrls: response.data.image_urls
            });
          }
        } catch (error) {
          console.error(`Error posting listing ${listing.name}:`, error);
          setIsProcessing(false);
  
          if (
            error.response?.status === 422 &&
            error.response?.data?.detail?.includes("listing limit")
          ) {
            alert("Listing limit reached. Please remove some listings before adding more.");
            break;
          }
  
          results.push({
            listing: listing.name,
            status: "Failed",
            error: error.response?.data?.detail || error.message
          });
        }
      }
  
      const successfulListings = results.filter(r => r.status === "Success").length;
  
      if (successfulListings > 0) {
        alert(`Successfully created ${successfulListings} out of ${results.length} listings`);
      } else {
        throw new Error("Failed to create any listings");
        setIsProcessing(false);
      }
  
    } catch (error) {
      console.error("Error posting listings:", error);
      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          "Failed to create listings";
                          setIsProcessing(false);
      alert(errorMessage);
    } finally {
      // setIsProcessing(false);
    }
  };
  
  const handleStopPosting = async () => {
    if (!taskID) {
      alert("No active posting task found.");
      return;
    }
  
    try {
      const response = await axios.post(
        `http://localhost:8000/api/post-listing-with-image?task_id=${taskID}&stop=true`,
        // { stop: true, task_id: taskID },
        { headers: { "Content-Type": "application/json" } }
      );
  
      if (response.data.status === "SUCCESS") {
        alert(`Stopped posting task ${taskID}`);
        console.log("Task stopped:", response.data);
      } else {
        alert("Failed to stop posting.");
      }
    } catch (error) {
      console.error("Error stopping posting:", error);
      alert("Error stopping the listing process.");
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
      console.log(urls)
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
      { delete_threshold: 180,      
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

// Handle tag addition
  const addTag = () => {
    const tagInput = document.getElementById("custom-new-tag-input") as HTMLInputElement;
    const newTag = tagInput.value.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      tagInput.value = "";
    }
    if (!isCustomModalOpen) {
      setTags([]);
    }
  };

  // Handle image preview
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (!isCustomModalOpen) {
      setPhotoPreview(null);
    }
  };

  const formattedCustomData: { listings: Listing[] } = {
    listings: [],
  };

  const handleCustomListingSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPostingCustom(true);

    console.log("Submitting Custom Listing..."); 
  
    const formData = new FormData(event.currentTarget);
  
    const newListing: Listing = {
      id: `custom-${Date.now()}`, // Unique ID for the custom listing
      kind: formData.get("kind") as string,
      description: formData.get("description") as string,
      owner: "custom-owner", // You can set a default or retrieve it dynamically
      category: formData.get("category") as string,
      name: formData.get("name") as string,
      price: parseFloat(formData.get("price") as string),
      accept_currency: "USD", // Set a default or retrieve it dynamically
      upc: "", // If not available, leave it empty
      cognitoidp_client: "", // If not available, leave it empty
      tags: tags, // Assuming 'tags' is a state variable holding tag values
      digital: formData.get("category")?.toString().includes("DIGITAL") ?? false,
      digital_deliverable: formData.get("category")?.toString().includes("DIGITAL") ? "true" : "false",
      photo: photoPreview ? { view_url: photoPreview } : {}, // Use uploaded photo preview
      shipping_fee: 0, // Set default value or allow user to input
      shipping_paid_by: "buyer", // Default or user input
      shipping_within_days: parseInt(formData.get("shipping_within_days") as string, 10) || 3,
      expire_in_days: parseInt(formData.get("expire_in_days") as string, 10) || 7,
      visibility: "public", // Default value
      image_urls: photoPreview || "", // Use uploaded photo preview
      additional_images: photoPreview ? [photoPreview] : [],
      cover_photo: photoPreview || "",
    };
  
    console.log("New Listing Data:", newListing); // Debugging log

    // Add new listing to formattedData
    formattedCustomData.listings.push(newListing);
    console.log("Updated Listings:", formattedCustomData.listings); // Debugging log

    handleCustomPostListing()
  };
  
  const handleCustomPostListing = async () => {
    const results = [];
  
    try {
      const listingsToPost = formattedCustomData.listings;
  
      if (!listingsToPost || listingsToPost.length === 0) {
        console.log("No listing data available for posting.");
        return;
      }
  
      for (const listing of listingsToPost) {
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
          image_url: listing.image_urls,
          additional_images: listing.additional_images || []
        };
  
        try {
          // First, verify that the image URLs are accessible
          const verifyImage = async (url) => {
            try {
              const response = await fetch(url);
              return response.ok;
            } catch (error) {
              console.error(`Failed to verify image URL: ${url}`);
              return false;
            }
          };
  
          // Verify main image
          const mainImageValid = await verifyImage(listing.image_urls);
          if (!mainImageValid) {
            throw new Error(`Main image URL is not accessible: ${listing.image_urls}`);
          }
  
          // Verify additional images
          if (listing.additional_images) {
            for (const imgUrl of listing.additional_images) {
              const additionalImageValid = await verifyImage(imgUrl);
              if (!additionalImageValid) {
                throw new Error(`Additional image URL is not accessible: ${imgUrl}`);
              }
            }
          }
  
          const response = await axios.post(
            "http://localhost:8000/api/custom-post-listing",
            listingData,
            { 
              headers: { 
                "Content-Type": "application/json"
              } 
            }
          );
  
          if (response.data.status === "SUCCESS") {
            console.log(`Successfully posted listing: ${listing.name}`);
            setTaskID(response.data.task_id)
            console.log("Task ID", response.data.task_id)
            console.log('Response data:', response.data);
            
            results.push({
              listing: listing.name,
              status: "Success",
              data: response.data,
              listingId: response.data.listing_id,
              imageUrls: response.data.image_urls
            });
          }
        } catch (error) {
          console.error(`Error posting listing ${listing.name}:`, error);
  
          if (
            error.response?.status === 422 &&
            error.response?.data?.detail?.includes("listing limit")
          ) {
            alert("Listing limit reached. Please remove some listings before adding more.");
            break;
          }
  
          results.push({
            listing: listing.name,
            status: "Failed",
            error: error.response?.data?.detail || error.message
          });
        }
      }
  
      const successfulListings = results.filter(r => r.status === "Success").length;
  
      if (successfulListings > 0) {
        alert(`Successfully created ${successfulListings} out of ${results.length} listings`);
      } else {
        throw new Error("Failed to create any listings");
      }
  
    } catch (error) {
      console.error("Error posting listings:", error);
      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          "Failed to create listings";
      alert(errorMessage);
    } finally {
      setIsPostingCustom(false);
      setIsCustomModalOpen(false);
      setTags([]);
      setPhotoPreview(null);
    }
  };

  const handleEditClick = (item: Listing) => {
    setSelectedItem(item);
    console.log("Item", item)
    setIsEditModalOpen(true);
  };

  const handleEditPrice = async (event) => {
    event.preventDefault();
  
    // Ensure selectedItem is not null
    if (!selectedItem) {
      alert("No item selected!");
      return;
    }
  
    // Get the price input value
    const priceInput = event.target.elements[`price-${selectedItem.id}`]?.value;
    if (!priceInput) {
      alert("Price cannot be empty!");
      return;
    }
  
    const updatedListing = {
      id: selectedItem.id,
      price: parseFloat(priceInput),
    };
    console.log("hygtfvcdu", pdatedListing)
  
    try {
      const allListingsRef = doc(db, "users", userID, "importedListings", "allListings");
  
      const docSnap = await getDoc(allListingsRef);
  
      if (!docSnap.exists()) {
        console.error("Error: 'allListings' document does not exist.");
        alert("The price data is missing. Please refresh the page.");
        return;
      }
  
      // Get the listings array
      const data = docSnap.data();
      const listings = data.listings || [];
  
      // Find and update the specific listing inside the array
      const updatedListings = listings.map((listing) =>
        listing.id === selectedItem.id ? { ...listing, ...updatedListing } : listing
      );
  
      // Update Firestore document
      await updateDoc(allListingsRef, { listings: updatedListings });
  
      console.log("Price updated successfully");
      alert("Price updated successfully!");
    

    } catch (error) {
      console.error("Error updating Price:", error);
      alert(error.message);
    } finally {
      fetchListings(userID); // Refresh listings
    }
  };
  

  const handleEditSubmit = async (event) => {
    event.preventDefault();
  
    const updatedListing = {
      id: selectedItem.id, // Ensure ID remains the same
      name: event.target.name.value,
      price: event.target.price.value,
      description: event.target.description.value,
      category: event.target.category.value,
      // Add other fields if needed
    };
  
    try {
      const allListingsRef = doc(db, "users", userID, "importedListings", "allListings");
  
      const docSnap = await getDoc(allListingsRef);
  
      if (!docSnap.exists()) {
        console.error("Error: 'allListings' document does not exist.");
        alert("The listings data is missing. Please refresh the page.");
        return;
      }
  
      // Get the listings array
      const data = docSnap.data();
      const listings = data.listings || [];
  
      // Find and update the specific listing inside the array
      const updatedListings: Listing[] = listings.map((listing: Listing) =>
        listing.id === selectedItem.id ? { ...listing, ...updatedListing } : listing
      );
  
      // Update Firestore with the new listings array
      await updateDoc(allListingsRef, { listings: updatedListings });
  
      // Update local state to reflect changes immediately
      // setResponseData(updatedListings.data);
  
      setIsEditModalOpen(false);
      console.log("Listing updated successfully");
      alert("Listing updated successfully!");
    } catch (error) {
      console.error("Error updating listing:", error);
      alert(error.message);
    } finally {
      fetchListings(userID)
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
                  ? "Processing Active..."
                  : isPosting
                    ? "Stop Posting"
                    : "Post Listings"}
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleStopPosting}
                disabled={!isProcessing}
              >
                Stop Posting
              </Button>
              <Button
              className="w-full bg-[#9333EA] text-white hover:bg-[#9333EA]/90"
                onClick={() => setIsCustomModalOpen(true)}
              >
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
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm text-white">
                Select All
              </label>
            </div>
            </div>

            <div className="space-y-2">
              {filteredResponse && (
                <div className="space-y-2">
                  {filteredResponse.map((item) => (
                    <div
                    key={item.id}
                    id={item.id}
                      className="flex items-center space-x-3 rounded-lg border border-border p-2 text-xl text-white hover:bg-accent hover:text-accent-foreground w-full justify-between"
                    >
                    <div className="space-x-2 flex items-center">
                      <Switch
                        checked={selectedItems.some((selected) => selected.id === item.id)}
                        onCheckedChange={(checked) => handleItemSelect(item, checked)}
                      />
                      <img
                        src={`http://localhost:8000/static/${item.image_urls?.[0]}`}
                        alt={item.name}
                        className="h-10 w-10 rounded-full"
                      />
                      <span className="text-xl">{item.name}</span>
                      </div>

                    <div className="space-x-2 flex items-center justify-center">

                    <form onSubmit={handleEditPrice}>
                      <div className="flex items-center space-x-1 rounded-md border border-input bg-background p-1 text-sm">
                        <span>$</span>
                        <input 
                          type="number" 
                          id={`price-${item.id}`} 
                          name="price" 
                          defaultValue={item.price} 
                          step="0.01" 
                          className="w-16 h-6 flex bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                        />
                        <button
                          className="flex justify-center items-center space-x-2 p-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm"
                          type="submit"
                          onClick={() => setSelectedItem(item)}
                        >
                          <BiSave className="mr-2 h-4 w-4" />
                          Save
                        </button>
                      </div>
                    </form>


                      <Button
                        variant="outlineInverse"
                        onClick={(e) => handleEditClick(item)}
                      >
                        <CiEdit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      </div>
                    </div>
                  ))}
            </div>
          )}
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

      <Modal open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Custom Listings</ModalTitle>
          </ModalHeader>
          <div className="space-y-4 overflow-auto">
          <form
          id="custom-order-form"
          onSubmit={handleCustomListingSubmit}
          className="overflow-auto">

              {/* Image Upload Section */}
              <div className="mb-4">
                <label className="block font-medium text-white/60">Current Image:</label>
              {photoPreview && (
                <img src={photoPreview} alt="Preview" className="max-w-full max-h-48 mt-2 rounded-md shadow" />
              )}
              <div className="mt-2">
                <label htmlFor="custom-photo" className="block font-medium text-white/60">Change Photo:</label>
                <Input
                  type="file"
                  id="custom-photo"
                  name="photo"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
              </div>
              </div>

              {/* Form Fields */}
            <div className="mb-4">
              <label htmlFor="custom-name" className="block font-medium text-white/60">Name:</label>
              <Input type="text" id="custom-name" name="name" required  />
            </div>

            <div className="mb-4">
              <label htmlFor="custom-price" className="block font-medium text-white/60">Price:</label>
              <Input type="number" id="custom-price" name="price" step="0.01" required  />
            </div>

            <div className="mb-4">
              <label htmlFor="custom-description" className="block font-medium text-white/60">Description:</label>
              <Textarea id="custom-description" name="description" required></Textarea>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="custom-shipping-within-days" className="block font-medium text-white/60">Shipping in days:</label>
                <Input type="number" id="custom-shipping-within-days" name="shipping_within_days" defaultValue="3" className="w-full mt-1 p-2 border rounded-md focus:ring focus:ring-indigo-200" />
              </div>
              <div>
                <label htmlFor="custom-expire-in-days" className="block font-medium text-white/60">Expire in days:</label>
                <Input type="number" id="custom-expire-in-days" name="expire_in_days" defaultValue="7"/>
              </div>
            </div>

            {/* Dropdowns */}
            <div className="mb-4">
              <label htmlFor="custom-category" className="block font-medium text-white/60">Category:</label>
              <Select id="custom-category" name="category" required >
                <SelectTrigger>
                <SelectValue placeholder="Select a Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DIGITAL_INGAME">Digital In-Game</SelectItem>
                <SelectItem  value="DIGITAL_CARD">Digital Card</SelectItem>
                <SelectItem value="DIGITAL_ITEM">Digital Item</SelectItem>
                <SelectItem value="PHYSICAL_CARD">Physical Card</SelectItem>
                <SelectItem value="PHYSICAL_ITEM">Physical Item</SelectItem>
              </SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <label htmlFor="custom-platform" className="block font-medium text-white/60">Platform:</label>
              <Select id="custom-platform" name="platform" required >
                <SelectTrigger>
                <SelectValue placeholder="Select a Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Unknown</SelectItem>
                <SelectItem value="pc">PC</SelectItem>
                <SelectItem value="ps4">PS4</SelectItem>
                <SelectItem value="ps5">PS5</SelectItem>
                <SelectItem value="xboxone">Xbox One</SelectItem>
                <SelectItem value="switch">Switch</SelectItem>
              </SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <label htmlFor="custom-kind" className="block font-medium text-gray-700">Kind:</label>
              <Select id="custom-kind" name="kind" required>
              <SelectTrigger>
                <SelectValue placeholder="Select a Kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="item">Item</SelectItem>
                <SelectItem value="gig">Gig</SelectItem>
                <SelectItem value="drop">Drop</SelectItem>
              </SelectContent>
              </Select>
            </div>

            {/* Tags Section */}
            <div className="mb-4">
              <label className="block font-medium text-gray-700">Tags:</label>
              <div className="p-2 rounded-md min-h-[40px] flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-white/80 text-black text-sm rounded font-medium">{tag}</span>
                ))}
              </div>
              <div className="flex mt-2 space-x-2">
                <Input type="text" id="custom-new-tag-input" placeholder="New tag"/>
                <Button type="button" onClick={addTag}>
                  Add Tag
                </Button>
              </div>
            </div>

          
          <ModalFooter>
            <Button
              onClick={() => setIsCustomModalOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button type="submit" variant="secondary" className={isPostingCustom ? "bg-destructive/70" : ""}>
                {isPostingCustom ? "Posting..." : "Post Custom Listing"}
            </Button>
          </ModalFooter>
          </form></div>
        </ModalContent>
      </Modal>

      <Modal open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Edit Listing</ModalTitle>
          </ModalHeader>
          <div className="space-y-4 overflow-auto">
            <form onSubmit={handleEditSubmit} className="overflow-auto">
              
              {/* Image Upload */}
              <div className="mb-4">
                <label className="block font-medium text-white/60">Current Image:</label>
                {selectedItem?.image_urls && (
                  <img src={`http://localhost:8000/static/${selectedItem.image_urls[0]}`} alt="Preview" className="max-w-full max-h-48 mt-2 rounded-md shadow" />
                )}
                <div className="mt-2">
                  <label htmlFor="custom-photo" className="block font-medium text-white/60">Change Photo:</label>
                  <Input type="file" id="custom-photo" name="photo" accept="image/*" />
                </div>
              </div>

              {/* Form Fields */}
              <div className="mb-4">
                <label htmlFor="custom-name" className="block font-medium text-white/60">Name:</label>
                <Input type="text" id="custom-name" name="name" defaultValue={selectedItem?.name} required />
              </div>

              <div className="mb-4">
                <label htmlFor="custom-price" className="block font-medium text-white/60">Price:</label>
                <Input type="number" id="custom-price" name="price" defaultValue={selectedItem?.price} step="0.01" required />
              </div>

              <div className="mb-4">
                <label htmlFor="custom-description" className="block font-medium text-white/60">Description:</label>
                <Textarea id="custom-description" name="description" defaultValue={selectedItem?.description} required />
              </div>

              {/* Dropdowns */}
              <div className="mb-4">
                <label htmlFor="custom-category" className="block font-medium text-white/60">Category:</label>
                <Select id="custom-category" name="category" defaultValue={selectedItem?.category} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIGITAL_INGAME">Digital In-Game</SelectItem>
                    <SelectItem value="DIGITAL_CARD">Digital Card</SelectItem>
                    <SelectItem value="DIGITAL_ITEM">Digital Item</SelectItem>
                    <SelectItem value="PHYSICAL_CARD">Physical Card</SelectItem>
                    <SelectItem value="PHYSICAL_ITEM">Physical Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit and Cancel Buttons */}
              <ModalFooter>
                <Button onClick={() => setIsEditModalOpen(false)} variant="outline">Cancel</Button>
                <Button type="submit" variant="secondary">Save Changes</Button>
              </ModalFooter>
            </form>
          </div>
        </ModalContent>
      </Modal>

    </div>
  );
}