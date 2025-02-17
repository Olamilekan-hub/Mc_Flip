"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import axios from "axios";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, doc, setDoc, getDocs, getDoc, updateDoc } from "firebase/firestore";
import { db, storage } from "../lib/firebase"; 
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
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
  Import,
  Link2,
  ClipboardList,
  Trash2,
  Copy,
  Check,
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

interface Listing {
  id: string;
  kind?: string;
  description?: string;
  owner?: string;
  category?: string;
  platform?: string;
  name: string;
  price?: number;
  accept_currency?: string;
  upc?: string;
  cognitoidp_client?: string;
  tags?: string[];
  digital?: boolean;
  digital_deliverable?: string;
  photo?: any; // Depending on how your photo data is structured
  shipping_fee?: number;
  shipping_paid_by?: string;
  shipping_within_days?: number;
  expire_in_days?: number;
  visibility?: string;
  cover_photo?: string;
  image_urls?: string[];
  additional_images?: string[];
  shipping_predefined_package?: string;
  digital_region?: string;
  status?: string;
}

interface ResponseData {
  data?: Listing[];
}

type ListingCount = {
  total_listings: number;
};

export function ListingManager() {
  // Session and user info
  const { data: session, status } = useSession();
  const userID = session?.user?.id || "";

  // State for keys
  const [apiKey, setApiKey] = useState<string>("");
  const [apiSecret, setApiSecret] = useState<string>("");

  // Main listing data stored in Firestore
  const [responseData, setResponseData] = useState<ResponseData | null>(null);

  // Searching and selecting listings
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Listing[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [isNumListingModalOpen, setIsNumListingModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Basic states for tasks and feedback
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isPostingCustom, setIsPostingCustom] = useState<boolean>(false);

  // Additional states
  const [importUrls, setImportUrls] = useState<string>("");
  const [urls, setUrls] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // For listing count
  const [loadingNumListing, setLoadingNumListing] = useState<boolean>(false);
  const [numListing, setNumListing] = useState<ListingCount | null>(null);

  // Delete options
  const [deleteOption, setDeleteOption] = useState<string>("");
  const [daysToDelete, setDaysToDelete] = useState<number>(30);

  // For new images
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // For custom listing tags
  const [tags, setTags] = useState<string[]>([]);

  // For editing a single listing
  const [selectedItem, setSelectedItem] = useState<Listing | null>(null);

  // If your code or UI references these, you may keep them. 
  // Below variables are used in effect to avoid runtime errors:
  const [timeBetweenListings, setTimeBetweenListings] = useState<string>("");
  const [deleteListingsHours, setDeleteListingsHours] = useState<string>("");

  // For tracking tasks if needed
  const [taskID, setTaskID] = useState<string[]>([]);

  // --------------
  // Fetch listings from Firestore for the signed-in user
  // --------------
  const fetchListings = async (userId: string): Promise<void> => {
    try {
      const userCollection = collection(db, "users", userId, "importedListings");
      const querySnapshot = await getDocs(userCollection);

      let savedListings: Listing[] = querySnapshot.docs.map((d) => d.data()) as Listing[];
      // Flatten possible nested arrays
      savedListings = savedListings.flatMap((entry: any) => entry.listings || []);

      setResponseData({ data: savedListings });
      // console.log("Fetched listings from Firestore:", savedListings);
    } catch (err) {
      console.error("Error fetching listings:", err);
    }
  };

  // --------------
  // On mount / on user status change, fetch data & user API keys
  // --------------
  useEffect(() => {
    const fetchData = async () => {
      if (status === "authenticated" && userID) {
        await fetchListings(userID);

      const fetchApiKeys = async () => {
        try {
          const docRef = doc(db, "users", userID);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setApiKey(typeof data.apiKey === "string" ? data.apiKey : "");
            setApiSecret(typeof data.apiSecret === "string" ? data.apiSecret : "");
            setTimeBetweenListings(
              typeof data.timeBetweenListings === "string"
                ? data.timeBetweenListings
                : ""
            );
            setDeleteListingsHours(
              typeof data.deleteListingsHours === "string"
                ? data.deleteListingsHours
                : ""
            );
          }
        } catch (error) {
          console.error("Error fetching API keys:", error);
        }
      };

      fetchApiKeys().catch((error) => {
        console.error("Error fetching API keys:", error);
      });

      // Reset tags and preview if the custom modal was closed
      if (!isCustomModalOpen) {
        setTags([]);
        setPhotoPreview(null);
      }
    }
  }, [status, userID, isCustomModalOpen]);

  // --------------
  // Filter listings by search
  // --------------
  const dataResponse = responseData?.data || [];
  const filteredResponse = dataResponse.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --------------
  // Handle select-all logic
  // --------------
  const allSelected =
    filteredResponse.length > 0 &&
    filteredResponse.every((item) =>
      selectedItems.some((selected) => selected.id === item.id)
    );

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(filteredResponse);
    } else {
      setSelectedItems([]);
    }
  };

  const handleItemSelect = (item: Listing, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, item]);
    } else {
      setSelectedItems((prev) => prev.filter((sel) => sel.id !== item.id));
    }
  };

  // --------------
  // Format data for posting
  // --------------
  const formattedData = {
    listings: selectedItems.map((listing) => {
      // If listing.photo is an object and listing.cover_photo is a string key, try to pick the main URL
      let mainUrl = "";
      if (
        listing.photo &&
        typeof listing.cover_photo === "string" &&
        listing.photo[listing.cover_photo] &&
        "view_url" in listing.photo[listing.cover_photo]
      ) {
        mainUrl = listing.photo[listing.cover_photo].view_url;
      }

      const additional = listing.photo
        ? Object.values(listing.photo)
            .map((photoObj: any) =>
              photoObj && photoObj.view_url ? photoObj.view_url : ""
            )
            .filter((url: string) => url.trim() !== "")
        : [];

      return {
        ...listing,
        image_urls: mainUrl ? [mainUrl] : [],
        additional_images: additional,
      };
    }),
  };

  // --------------
  // Verify that an image URL is accessible (basic check)
  // --------------
  const verifyImage = async (url: string): Promise<boolean> => {
    if (!url) return false;
    try {
      const resp = await fetch(url);
      return resp.ok;
    } catch {
      return false;
    }
  };

  // --------------
  // Post selected listings using the existing endpoint logic
  // --------------
  const handlePostListing = async (): Promise<void> => {
    setIsProcessing(true);
    try {
      const listingsToPost = formattedData.listings;
      if (!listingsToPost || listingsToPost.length === 0) {
        alert("No listing data available for posting.");
        setIsProcessing(false);
        return;
      }

      const taskIds: string[] = [];

      for (const listing of listingsToPost) {
        // Verify images
        if (listing.image_urls && listing.image_urls.length > 0) {
          const mainValid = await verifyImage(listing.image_urls[0]);
          if (!mainValid) {
            throw new Error(`Main image URL is not accessible: ${listing.image_urls[0]}`);
          }
        }

        if (listing.additional_images && listing.additional_images.length > 0) {
          for (const imgUrl of listing.additional_images) {
            const addValid = await verifyImage(imgUrl);
            if (!addValid) {
              throw new Error(`Additional image URL is not accessible: ${imgUrl}`);
            }
          }
        }

        // Prepare listing data
        const listingData = {
          kind: listing.kind || "item",
          owner: listing.owner || "",
          status: "draft",
          name: listing.name,
          description: listing.description || "",
          category: listing.category || "DIGITAL_INGAME",
          platform: listing.platform || "unknown",
          upc: listing.upc || "",
          price: Number(listing.price) || 0,
          accept_currency: listing.accept_currency || "USD",
          shipping_within_days: listing.shipping_within_days ?? 3,
          expire_in_days: listing.expire_in_days ?? 7,
          shipping_fee: 0,
          shipping_paid_by: listing.shipping_paid_by || "seller",
          shipping_predefined_package: listing.shipping_predefined_package || "None",
          cognitoidp_client: listing.cognitoidp_client || "",
          tags: Array.isArray(listing.tags) ? listing.tags : ["id:bundle", "type:custom"],
          digital: listing.digital !== undefined ? Boolean(listing.digital) : true,
          digital_region: listing.digital_region || "none",
          digital_deliverable: listing.digital_deliverable || "transfer",
          visibility: listing.visibility || "public",
          image_url:
            listing.image_urls && listing.image_urls.length > 0
              ? listing.image_urls[0]
              : null,
          additional_images: listing.additional_images || [],
        };

        // Send to local API
        const response = await axios.post(
          "http://localhost:8000/api/post-listing-with-image",
          listingData,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.status === "SUCCESS") {
          taskIds.push(response.data.task_id);
        } else {
          throw new Error(`Failed posting for listing: ${listing.name}`);
        }
      }

      if (taskIds.length > 0) {
        setTaskID(taskIds);
        alert(`Successfully started posting process for ${taskIds.length} listings.`);
        setIsPosting(true);
      }
    } catch (error: any) {
      console.error("Error in posting process:", error);
      const errorMessage =
        error.response?.data?.detail || error.message || "Failed to start listing process";
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------
  // Stop all posting tasks
  // --------------
  const handleStopPosting = async (): Promise<void> => {
    setIsProcessing(true);
    try {
      const dummyListingData = {
        kind: "item",
        owner: "dummy_owner",
        name: "Stopping all tasks",
        description: "This is a dummy listing to stop all tasks",
        category: "DIGITAL_INGAME",
        platform: "unknown",
        upc: "000000000000",
        price: 0,
        accept_currency: "USD",
        shipping_within_days: 1,
        expire_in_days: 1,
        shipping_paid_by: "seller",
        shipping_predefined_package: "None",
        cognitoidp_client: "dummy",
        tags: [],
        digital: true,
        digital_region: "none",
        digital_deliverable: "transfer",
        visibility: "private",
      };

      const response = await axios.post(
        "http://localhost:8000/api/post-listing-with-image?global_stop=true",
        dummyListingData,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.status === "SUCCESS") {
        const stoppedTasks = response.data.stopped_tasks || [];
        alert(`Stopped all posting tasks (${stoppedTasks.length} tasks)`);
        setTaskID([]);
        setIsPosting(false);
      } else {
        throw new Error("Failed to stop posting tasks");
      }
    } catch (error: any) {
      console.error("Error stopping posting tasks:", error);
      alert(
        "Error stopping the posting process: " +
          (error.response?.data?.detail || error.message)
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------
  // Import listings from URLs
  // --------------
  const handleImport = async (): Promise<void> => {
    setIsImporting(true);
    try {
      const urlArray = importUrls.split("\n").filter((url) => url.trim() !== "");
      if (!urlArray.length) {
        setIsImporting(false);
        setIsImportModalOpen(false);
        return;
      }

      const response = await axios.post("http://localhost:8000/api/import-listings", {
        urls: urlArray,
        api_key: apiKey,
        api_secret: apiSecret,
      });

      if (!response.data || !response.data.data) {
        throw new Error("Invalid API response format");
      }

      let newListings: Listing[] = response.data.data;
      if (!Array.isArray(newListings)) newListings = [];

      const userDocRef = doc(db, "users", userID, "importedListings", "allListings");
      const docSnap = await getDoc(userDocRef);

      let existingListings: Listing[] = [];
      if (docSnap.exists() && docSnap.data()?.listings) {
        existingListings = docSnap.data().listings;
      }
      if (!Array.isArray(existingListings)) existingListings = [];

      const mergedListings = [...existingListings, ...newListings];

      await setDoc(userDocRef, { listings: mergedListings }, { merge: true });
      await fetchListings(userID);

    } catch (error) {
      console.error("Error importing URLs:", error);
    } finally {
      setIsImporting(false);
      setIsImportModalOpen(false);
      setImportUrls("");
    }
  };

  // --------------
  // Bulk fetch links
  // --------------
  const fetchBulkList = async (): Promise<void> => {
    setError("");
    try {
      const response = await axios.get("http://localhost:8000/api/gameflip/listings", {
        headers: {
          apiKey,
          apiSecret,
        },
      });
      setUrls(response.data.urls);
    } catch {
      setError("Failed to fetch listings. Please try again.");
    }
  };

  const copyAllLinks = (): void => {
    if (!urls.length) return;
    const allLinks = urls.join("\n");
    navigator.clipboard.writeText(allLinks).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        setError("Failed to copy links. Please try again.");
      }
    );
  };

  // --------------
  // Check total listings
  // --------------
  const handleCheckListings = async (): Promise<void> => {
    setLoadingNumListing(true);
    setNumListing(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/count-listings?apiKey=${encodeURIComponent(
          apiKey
        )}&apiSecret=${encodeURIComponent(apiSecret)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }
      const result: ListingCount = await response.json();
      setNumListing(result);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoadingNumListing(false);
    }
  };

  // --------------
  // Delete listings
  // --------------
  const handleDeleteListings = async (): Promise<void> => {
    setIsDeleting(true);
    try {
      // As an example, always sending threshold=180 in code
      await axios.post(
        "http://localhost:8000/api/delete-old-listings",
        { delete_threshold: 180, api_key: apiKey, api_secret: apiSecret },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Potentially refresh your local listings if needed
      // await fetchListings(userID);
    } catch (error) {
      console.error("Error deleting listings:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setDeleteOption("");
    }
  };

  // --------------
  // Add a custom tag
  // --------------
  const addTag = (): void => {
    const tagInput = document.getElementById("custom-new-tag-input") as HTMLInputElement;
    const newTag = tagInput.value.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      tagInput.value = "";
    }
  };

  // --------------
  // Upload a photo for custom listing
  // --------------
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);

      // Create a local preview
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setPhotoPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToCloudinary = async (): Promise<void> => {
    // if (!photoFile) {
    //   alert("No image file selected!");
    //   return;
    // }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("upload_preset", "mcflipnew");

      const cloudName = "dary9svzu";
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      const response = await fetch(cloudinaryUrl, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.secure_url) {
        setUploadedImageUrl(data.secure_url);
        alert("Image uploaded successfully to Cloudinary!");
      } else {
        console.error("Cloudinary upload error:", data);
        alert("Failed to upload image to Cloudinary!");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Upload failed. Check the console for details.");
    } finally {
      setIsUploading(false);
    }
  };

  // --------------
  // Prepare and post a single custom listing
  // --------------
  const handleCustomListingSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setIsPostingCustom(true);

    // If user wants to upload to Cloudinary right away:
    if (photoFile) {
      await uploadToCloudinary();
    }

    const formData = new FormData(event.currentTarget);
    const newListing: Listing = {
      id: `custom-${Date.now()}`,
      kind: formData.get("kind") as string,
      description: (formData.get("description") as string) || "",
      owner: "custom-owner",
      category: formData.get("category") as string,
      name: (formData.get("name") as string) || "",
      price: parseFloat(formData.get("price") as string),
      accept_currency: "USD",
      upc: "",
      cognitoidp_client: "marketplace",
      tags,
      digital:
        (formData.get("category")?.toString() || "").includes("DIGITAL") || false,
      digital_deliverable: (formData.get("category") as string)?.includes("DIGITAL")
        ? "true"
        : "false",
      shipping_fee: parseFloat((formData.get("shipping_fee") as string) || "0"),
      shipping_paid_by: (formData.get("shipping_paid_by") as string) || "seller",
      shipping_within_days: parseInt(
        formData.get("shipping_within_days") as string,
        10
      ) || 3,
      expire_in_days: parseInt(formData.get("expire_in_days") as string, 10) || 7,
      visibility: (formData.get("visibility") as string) || "public",
      image_urls: uploadedImageUrl ? [uploadedImageUrl] : [],
      additional_images: uploadedImageUrl ? [uploadedImageUrl] : [],
      cover_photo: uploadedImageUrl || "",
      platform: formData.get("platform") as string,
    };

    // Attempt posting
    await handleCustomPostListing(newListing);
    setIsCustomModalOpen(false);
  };

  const handleCustomPostListing = async (listing: Listing): Promise<void> => {
    try {
      // Verify images
      if (listing.image_urls && listing.image_urls.length > 0) {
        const mainValid = await verifyImage(listing.image_urls[0]);
        if (!mainValid) {
          throw new Error(`Main image URL is not accessible: ${listing.image_urls[0]}`);
        }
      }

      if (listing.additional_images && listing.additional_images.length > 0) {
        for (const imgUrl of listing.additional_images) {
          const addValid = await verifyImage(imgUrl);
          if (!addValid) {
            throw new Error(`Additional image URL is not accessible: ${imgUrl}`);
          }
        }
      }

      // Prepare final data
      const listingData = {
        kind: "item",
        owner: listing.owner,
        status: "draft",
        name: listing.name,
        description: listing.description,
        category: listing.category || "DIGITAL_INGAME",
        platform: listing.platform || "unknown",
        upc: listing.upc,
        price: listing.price || 0,
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
        image_url:
          listing.image_urls && listing.image_urls.length > 0
            ? listing.image_urls[0]
            : null,
        additional_images: listing.additional_images || [],
      };

      const response = await axios.post(
        "http://localhost:8000/api/custom-post-listing",
        listingData,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.status === "SUCCESS") {
        alert(`Successfully created custom listing: ${listing.name}`);
      }
    } catch (error: any) {
      console.error(`Error posting custom listing ${listing.name}:`, error);
      const errorMessage =
        error.response?.data?.detail || error.message || "Failed to create listing";
      alert(errorMessage);
    } finally {
      setIsPostingCustom(false);
      setTags([]);
      setPhotoPreview(null);
      setPhotoFile(null);
      setUploadedImageUrl(null);
    }
  };

  // --------------
  // Editing existing Firestore listing
  // --------------
  const handleEditClick = (item: Listing): void => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleEditPrice = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    if (!selectedItem) {
      alert("No item selected!");
      return;
    }

    const priceInput = (event.currentTarget.elements as any)[
      `price-${selectedItem.id}`
    ]?.value;
    if (!priceInput) {
      alert("Price cannot be empty!");
      return;
    }

    const updatedListing = {
      id: selectedItem.id,
      price: parseFloat(priceInput),
    };

    try {
      const allListingsRef = doc(db, "users", userID, "importedListings", "allListings");
      const docSnap = await getDoc(allListingsRef);

      if (!docSnap.exists()) {
        console.error("Error: 'allListings' document does not exist.");
        alert("The price data is missing. Please refresh the page.");
        return;
      }

      const data = docSnap.data();
      const listings: Listing[] = data.listings || [];

      const updatedListings = listings.map((l) =>
        l.id === selectedItem.id ? { ...l, ...updatedListing } : l
      );

      await updateDoc(allListingsRef, { listings: updatedListings });
      alert("Price updated successfully!");
      await fetchListings(userID);
    } catch (error: any) {
      console.error("Error updating Price:", error);
      alert(error.message);
    }
  };

  const handleEditSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    if (!selectedItem) return;

    const updatedListing: Listing = {
      id: selectedItem.id,
      name: (event.currentTarget.name as any).value,
      price: parseFloat((event.currentTarget.price as any).value || "0"),
      description: (event.currentTarget.description as any).value,
      category: (event.currentTarget.category as any).value,
    };

    try {
      const allListingsRef = doc(db, "users", userID, "importedListings", "allListings");
      const docSnap = await getDoc(allListingsRef);

      if (!docSnap.exists()) {
        console.error("Error: 'allListings' document does not exist.");
        alert("The listings data is missing. Please refresh the page.");
        return;
      }

      const data = docSnap.data();
      const listings: Listing[] = data.listings || [];

      const updatedListings = listings.map((l) =>
        l.id === selectedItem.id ? { ...l, ...updatedListing } : l
      );

      await updateDoc(allListingsRef, { listings: updatedListings });

      setIsEditModalOpen(false);
      alert("Listing updated successfully!");
      await fetchListings(userID);
    } catch (error: any) {
      console.error("Error updating listing:", error);
      alert(error.message);
    }
  };

  // --------------
  // Render
  // --------------
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
                    ? "cursor-not-allowed bg-gray-500"
                    : "bg-accent hover:bg-accent/90"
                } text-accent-foreground`}
                onClick={handlePostListing}
                disabled={isProcessing || isPosting}
              >
                {isProcessing
                  ? "Starting Posting..."
                  : isPosting
                  ? "Posting Active..."
                  : "Start Posting"}
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleStopPosting}
                disabled={!isPosting}
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
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsBulkModalOpen(true)}
              >
                <Link2 className="mr-2 h-4 w-4" />
                Get Bulk Links
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  setIsNumListingModalOpen(true);
                  await handleCheckListings();
                }}
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
                    className="flex w-full items-center justify-between space-x-3 rounded-lg border border-border p-2 text-xl text-white hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={selectedItems.some((sel) => sel.id === item.id)}
                        onCheckedChange={(checked) => handleItemSelect(item, checked)}
                      />
                      {item.image_urls && item.image_urls[0] && (
                        <img
                          src={`http://localhost:8000/static/${item.image_urls[0]}`}
                          alt={item.name}
                          className="h-10 w-10 rounded-full"
                        />
                      )}
                      <span className="text-xl">{item.name}</span>
                    </div>

                    <div className="flex items-center justify-center space-x-2">
                      <form onSubmit={handleEditPrice}>
                        <div className="flex items-center space-x-1 rounded-md border border-input bg-background p-1 text-sm">
                          <span>$</span>
                          <input
                            type="number"
                            id={`price-${item.id}`}
                            name="price"
                            defaultValue={item.price}
                            step="0.01"
                            className="h-6 w-16 bg-background focus-visible:outline-none"
                          />
                          <button
                            className="flex items-center space-x-2 rounded-sm bg-primary p-1 text-primary-foreground hover:bg-primary/90"
                            type="submit"
                            onClick={() => setSelectedItem(item)}
                          >
                            <BiSave className="mr-2 h-4 w-4" />
                            Save
                          </button>
                        </div>
                      </form>

                      <Button variant="outlineInverse" onClick={() => handleEditClick(item)}>
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
        <Button variant="link" className="text-muted-foreground" onClick={() => signOut()}>
          Logout
        </Button>
      </div>

      {/* Import Modal */}
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
            <Button onClick={() => setIsImportModalOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importUrls.trim() === "" || isImporting}
              className={isImporting ? "bg-primary/70" : ""}
            >
              {isImporting
                ? "Importing..."
                : `Import (${
                    importUrls.split("\n").filter((url) => url.trim() !== "").length
                  })`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk URLs</DialogTitle>
          </DialogHeader>

          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

          <div className="max-h-64 overflow-auto">
            {urls.length > 0 && (
              <ul className="mt-4 space-y-1">
                {urls.map((url, index) => (
                  <li key={index} className="break-all text-xs">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-500"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button
                onClick={() => setIsBulkModalOpen(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>

              {urls.length > 0 && (
                <Button
                  onClick={copyAllLinks}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-1"
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy All
                    </>
                  )}
                </Button>
              )}
            </div>

            <Button
              onClick={fetchBulkList}
              disabled={false}
              size="sm"
              className=""
            >
              Get Links
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check Listing Modal */}
      <Dialog open={isNumListingModalOpen} onOpenChange={setIsNumListingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Listings</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            <p className="text-md">
              Total Listings Available:{" "}
              <span>
                {loadingNumListing
                  ? "Checking..."
                  : numListing
                  ? numListing.total_listings
                  : 0}
              </span>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsNumListingModalOpen(false)} variant="outline">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Listings Modal */}
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
            <Button onClick={() => setIsDeleteModalOpen(false)} variant="outline">
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

      {/* Custom Listing Modal */}
      <Modal open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Custom Listings</ModalTitle>
          </ModalHeader>
          <div className="space-y-4 overflow-auto">
            <form
              id="custom-order-form"
              onSubmit={handleCustomListingSubmit}
              className="overflow-auto"
            >
              <div className="mb-4">
                <label className="block font-medium text-white/60">Current Image:</label>
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="mt-2 max-h-48 max-w-full rounded-md shadow"
                  />
                )}
                <div className="mt-2">
                  <label htmlFor="custom-photo" className="block font-medium text-white/60">
                    Change Photo:
                  </label>
                  <Input
                    type="file"
                    id="custom-photo"
                    name="photo"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="custom-name" className="block font-medium text-white/60">
                  Name:
                </label>
                <Input type="text" id="custom-name" name="name" required />
              </div>

              <div className="mb-4">
                <label htmlFor="custom-price" className="block font-medium text-white/60">
                  Price:
                </label>
                <Input type="number" id="custom-price" name="price" step="0.01" required />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="custom-delivery-price"
                  className="block font-medium text-white/60"
                >
                  Shipping fee:
                </label>
                <Input
                  type="number"
                  id="custom-delivery-price"
                  name="shipping_fee"
                  step="0.01"
                  defaultValue="0"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="custom-description"
                  className="block font-medium text-white/60"
                >
                  Description:
                </label>
                <Textarea id="custom-description" name="description" required />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="custom-shipping-within-days"
                    className="block font-medium text-white/60"
                  >
                    Shipping in days:
                  </label>
                  <Input
                    type="number"
                    id="custom-shipping-within-days"
                    name="shipping_within_days"
                    defaultValue="3"
                  />
                </div>
                <div>
                  <label
                    htmlFor="custom-expire-in-days"
                    className="block font-medium text-white/60"
                  >
                    Expire in days:
                  </label>
                  <Input
                    type="number"
                    id="custom-expire-in-days"
                    name="expire_in_days"
                    defaultValue="7"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="custom_shipping_paid_by"
                  className="block font-medium text-white/60"
                >
                  Shipping Paid by:
                </label>
                <Select id="custom_shipping_paid_by" name="shipping_paid_by" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Shipping Paid by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <label htmlFor="custom_visibility" className="block font-medium text-white/60">
                  Visibility:
                </label>
                <Select id="custom_visibility" name="visibility" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <label htmlFor="custom-category" className="block font-medium text-white/60">
                  Category:
                </label>
                <Select id="custom-category" name="category" required>
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

              <div className="mb-4">
                <label htmlFor="custom-platform" className="block font-medium text-white/60">
                  Platform:
                </label>
                <Select id="custom-platform" name="platform" required>
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
                <label htmlFor="custom-kind" className="block font-medium text-gray-700">
                  Kind:
                </label>
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

              <div className="mb-4">
                <label className="block font-medium text-gray-700">Tags:</label>
                <div className="flex min-h-[40px] flex-wrap gap-2 rounded-md p-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="rounded bg-white/80 px-2 py-1 text-sm font-medium text-black"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex space-x-2">
                  <Input type="text" id="custom-new-tag-input" placeholder="New tag" />
                  <Button type="button" onClick={addTag}>
                    Add Tag
                  </Button>
                </div>
              </div>

              <ModalFooter>
                <Button onClick={() => setIsCustomModalOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  className={isPostingCustom ? "bg-destructive/70" : ""}
                >
                  {isPostingCustom ? "Posting..." : "Post Custom Listing"}
                </Button>
              </ModalFooter>
            </form>
          </div>
        </ModalContent>
      </Modal>

      {/* Edit Listing Modal */}
      <Modal open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Edit Listing</ModalTitle>
          </ModalHeader>
          <div className="space-y-4 overflow-auto">
            <form onSubmit={handleEditSubmit} className="overflow-auto">
              <div className="mb-4">
                <label className="block font-medium text-white/60">Current Image:</label>
                {selectedItem?.image_urls && selectedItem.image_urls[0] && (
                  <img
                    src={`http://localhost:8000/static/${selectedItem.image_urls[0]}`}
                    alt="Preview"
                    className="mt-2 max-h-48 max-w-full rounded-md shadow"
                  />
                )}
                <div className="mt-2">
                  <label htmlFor="custom-photo" className="block font-medium text-white/60">
                    Change Photo:
                  </label>
                  <Input type="file" id="custom-photo" name="photo" accept="image/*" />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="custom-name" className="block font-medium text-white/60">
                  Name:
                </label>
                <Input
                  type="text"
                  id="custom-name"
                  name="name"
                  defaultValue={selectedItem?.name}
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="custom-price" className="block font-medium text-white/60">
                  Price:
                </label>
                <Input
                  type="number"
                  id="custom-price"
                  name="price"
                  defaultValue={selectedItem?.price}
                  step="0.01"
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="custom-description"
                  className="block font-medium text-white/60"
                >
                  Description:
                </label>
                <Textarea
                  id="custom-description"
                  name="description"
                  defaultValue={selectedItem?.description}
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="custom-category" className="block font-medium text-white/60">
                  Category:
                </label>
                <Select
                  id="custom-category"
                  name="category"
                  defaultValue={selectedItem?.category}
                  required
                >
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

              <ModalFooter>
                <Button onClick={() => setIsEditModalOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button type="submit" variant="secondary">
                  Save Changes
                </Button>
              </ModalFooter>
            </form>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
