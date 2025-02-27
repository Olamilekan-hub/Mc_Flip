"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import axios from "axios";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, doc, setDoc, getDocs, getDoc, updateDoc } from "firebase/firestore";
import { db, storage } from "../lib/firebase"; 
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import StructuredTagInput from "~/components/ui/StructuredTagInput"; 
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
  CreditCard,
  Settings,
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
import { BiLoaderCircle } from "react-icons/bi";
import { FaAngleDoubleDown } from "react-icons/fa";
import { object } from "zod";

interface Listing {
  id: string;
  kind?: string;
  description?: string;
  owner?: string;
  category?: string;
  platform?: string;
  name: string;
  price?: number | any;
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
  const userID = session?.user?.id ?? "";
  const pathname = usePathname();

  // State for keys
  const [apiKey, setApiKey] = useState<string>("");
  const [apiSecret, setApiSecret] = useState<string>("");

  
  // If your code or UI references these, you may keep them. 
  // Below variables are used in effect to avoid runtime errors:
  const [timeBetweenListings, setTimeBetweenListings] = useState<number>(0);
  const [deleteListingsHours, setDeleteListingsHours] = useState<number>(0);

  // Main listing data stored in Firestore
  const [responseData, setResponseData] = useState<ResponseData | null>(null);

  // Subscription details (includes subscription_key, expires_at, and new subStatus)
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    subscription_key: string;
    expires_at: any;
    subStatus: string;
  } | null>(null);

  // Local state for subscription countdown
  const [timeRemaining, setTimeRemaining] = useState<string>("");

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
  const [alertModal, setAlertModal] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const [alertMessage, setAlertMessage] = useState<string>("");

  // Basic states for tasks and feedback
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isPostingCustom, setIsPostingCustom] = useState<boolean>(false);

  // Additional states
  const [importUrls, setImportUrls] = useState<string>("");
  const [urls, setUrls] = useState<string[]>([]);
  const [customUrl, setCustomUrl] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  // Inside your ListingManager component, add a state for tags
  const [listingTags, setListingTags] = useState<string[]>([]);
  const [tagInputs, setTagInputs] = useState<string[]>([]);
  const [formTags, setFormTags] = useState<string[]>([]);

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

  // --------------------------
  // Fetch subscription details from Firestore
  // --------------------------
  useEffect(() => {
    const fetchSubscription = async () => {
      if (userID) {
        const docRef = doc(db, "users", userID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.subscription_key && data.expires_at) {
            setSubscriptionDetails({
              subscription_key: data.subscription_key,
              expires_at: data.expires_at,
              subStatus: data.subStatus || "Active",
            });
          }
          let updateData: any = {};
          if (!data.subscription_key || !data.expires_at || !data.subStatus) {
            setSubscriptionDetails({
              subscription_key: "",
              expires_at: "2025-01-01T00:00:00.815529",
              subStatus: "Expired",
            });
            updateData = subscriptionDetails;
          }
          if (updateData) {
            await setDoc(docRef, updateData, {merge: true});
          }
        }
      }
    };

    if (status === "authenticated" && userID) {
      fetchSubscription().catch((err) => console.error(err));
    }

    if (selectedItem?.tags) {
      setFormTags(selectedItem.tags);
    }
    console.log("tag", tagInputs);
  }, [status, userID, subscriptionDetails, selectedItem, tagInputs]);

  // --------------------------
  // Countdown timer effect that updates subStatus and saves it to Firestore
  // --------------------------
  useEffect(() => {
    let interval: any;
    if (subscriptionDetails && subscriptionDetails.expires_at) {
      interval = setInterval(() => {
        const expires = new Date(subscriptionDetails.expires_at);
        const now = new Date();
        const diff = expires.getTime() - now.getTime();
        let newStatus = "Active";
        if (diff <= 0) {
          newStatus = "Expired";
          setTimeRemaining("Expired");
          clearInterval(interval);
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / (1000 * 60)) % 60);
          const seconds = Math.floor((diff / 1000) % 60);
          setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }
        // If the status has changed, update Firestore and local state
        if (subscriptionDetails.subStatus !== newStatus) {
          setSubscriptionDetails((prev) => prev && { ...prev, subStatus: newStatus });
          const docRef = doc(db, "users", userID);
          setDoc(docRef, { subStatus: newStatus }, { merge: true });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [subscriptionDetails, userID]);

  // --------------
  // Fetch listings from Firestore for the signed-in user
  // --------------
  const fetchListings = async (userId: string): Promise<void> => {
    try {
      const userCollection = collection(db, "users", userId, "importedListings");
      const querySnapshot = await getDocs(userCollection);

      let savedListings: Listing[] = querySnapshot.docs.map((d) => d.data()) as Listing[];
      // Flatten possible nested arrays
      savedListings = savedListings.flatMap((entry: any) => entry.listings ?? []);

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
                typeof data.timeBetweenListings === "number"
                  ? data.timeBetweenListings
                  : 0
              );
              setDeleteListingsHours(
                typeof data.deleteListingsHours === "number"
                  ? data.deleteListingsHours
                  : 0
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
    };

    fetchData();
  }, [status, userID, isCustomModalOpen]);

  // --------------
  // Filter listings by search
  // --------------
  const dataResponse = responseData?.data ?? [];
  const filteredResponse = dataResponse.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertModal(true);
    setTimeout(() => {
      setAlertModal(false);
      setAlertMessage("");
    }, 60000); // 1 minute
  };

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
        showAlert("No listing data available for posting.");
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
          kind: listing.kind ?? "item",
          owner: listing.owner ?? "",
          status: "draft",
          name: listing.name,
          description: listing.description ?? "",
          category: listing.category ?? "DIGITAL_INGAME",
          platform: listing.platform ?? "unknown",
          upc: listing.upc ?? "",
          price: Number(listing.price) ?? 0,
          accept_currency: listing.accept_currency ?? "USD",
          shipping_within_days: listing.shipping_within_days ?? 3,
          expire_in_days: listing.expire_in_days ?? 7,
          shipping_fee: 0,
          shipping_paid_by: listing.shipping_paid_by ?? "seller",
          shipping_predefined_package: listing.shipping_predefined_package ?? "None",
          cognitoidp_client: listing.cognitoidp_client ?? "",
          tags: Array.isArray(listing.tags) ? listing.tags : ["id:bundle", "type:custom"],
          digital: listing.digital !== undefined ? Boolean(listing.digital) : true,
          digital_region: listing.digital_region ?? "none",
          digital_deliverable: listing.digital_deliverable ?? "transfer",
          visibility: listing.visibility ?? "public",
          image_url:
            listing.image_urls && listing.image_urls.length > 0
              ? listing.image_urls[0]
              : null,
          additional_images: listing.additional_images ?? [],

          // NEW: we send your credentials + timeBetweenListings
          api_key: apiKey,
          api_secret: apiSecret,
          time_between_listings: Number(timeBetweenListings) ?? 60
        };

        // Send to local API
        const response = await axios.post(
          "http://localhost:8000/api/post-listing-with-image?global_stop=false",
          listingData,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.status === "SUCCESS") {
          taskIds.push(response.data.task_id);
          console.log(taskIds, "dmsc")
        } else {
          throw new Error(`Failed posting for listing: ${listing.name}`);
        }
      }

      if (taskIds.length > 0) {
        showAlert(`Successfully started posting process for ${taskIds.length} listings.`);
        setIsPosting(true);
      }
    } catch (error: any) {
      console.error("Error in posting process:", error);
      const errorMessage =
        error.response?.data?.detail ?? error.message ?? "Failed to start listing process";
      showAlert(errorMessage);
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

        // API CREDS
        api_key: apiKey,
        api_secret: apiSecret
      };

      const response = await axios.post(
        "http://localhost:8000/api/post-listing-with-image?global_stop=true",
        dummyListingData,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.status === "SUCCESS") {
        const stoppedTasks = response.data.stopped_tasks ?? [];
        showAlert(`Stopped all posting tasks (${stoppedTasks.length} tasks)`);
        setIsPosting(false);
      } else {
        throw new Error("Failed to stop posting tasks");
      }
    } catch (error: any) {
      console.error("Error stopping posting tasks:", error);
      showAlert(
        "Error stopping the posting process: " +
          (error.response?.data?.detail ?? error.message)
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

      if (!response.data ?? !response.data.data) {
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

  const copyCustomLinks = (): void => {
    if (!customUrl.length) return;
    const allLinks = customUrl.join("\n");
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
        {
          delete_threshold: deleteListingsHours,
          api_key: apiKey,
          api_secret: apiSecret
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      showAlert("Succesfully deleted all listings!")

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
    if (!isCustomModalOpen) {
      setTags([]);
    }
  };

  // --------------
  // Upload a photo for custom listing
  // --------------
  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
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
    if (!isCustomModalOpen) {
      setPhotoFile(null);
      setPhotoPreview("");
    }
  };

  const uploadImage = async () => {
    if (photoFile) {
      await uploadToCloudinary();
    }
  }

  
  const uploadToCloudinary = async (): Promise<void> => {
    if (!photoFile) {
      showAlert("No image file selected!");
      return;
    }
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
        showAlert("Image uploaded successfully!");
      } else {
        console.error("Cloudinary upload error:", data);
        showAlert("Failed to upload image!");
      }
      if (!isCustomModalOpen) {
        setUploadedImageUrl(null);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      showAlert("Upload failed.");
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

  const formData = new FormData(event.currentTarget);
  const newListing: Listing = {
    id: `custom-${Date.now()}`,
    // kind: formData.get("kind") as string,
    description: (formData.get("description") as string) ?? "",
    owner: "custom-owner",
    // category: formData.get("category") as string,
    name: (formData.get("name") as string) ?? "",
    price: parseFloat(formData.get("price") as string),
    accept_currency: "USD",
    upc: "",
    cognitoidp_client: "marketplace",
    // tags,
    // digital:
    //   (formData.get("category")?.toString() ?? "").includes("DIGITAL") ?? false,
    // digital_deliverable: (formData.get("digital_deliverable") as string) ?? "",
    shipping_fee: parseFloat((formData.get("shipping_fee") as string) ?? "0"),
    // shipping_paid_by: (formData.get("shipping_paid_by") as string) ?? "seller",
    // shipping_within_days: parseInt(
    //   formData.get("shipping_within_days") as string,
    //   10
    // ) ?? 3,
    // expire_in_days: parseInt(formData.get("expire_in_days") as string, 10) ?? 7,
    // visibility: "public",
    image_urls: uploadedImageUrl ? [uploadedImageUrl] : [],
    additional_images: uploadedImageUrl ? [uploadedImageUrl] : [],
    cover_photo: uploadedImageUrl ?? "",
    // platform: formData.get("platform") as string,
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
      // kind: "item",
      owner: listing.owner,
      status: "draft",
      name: listing.name,
      description: listing.description,
      category: listing.category ?? "DIGITAL_INGAME",
      platform: listing.platform ?? "unknown",
      upc: listing.upc,
      price: (listing.price ?? 0) * 100,
      accept_currency: listing.accept_currency,
      shipping_within_days: 3,
      expire_in_days: 7,
      shipping_fee: 0,
      // shipping_paid_by: "seller",
      shipping_predefined_package: "None",
      cognitoidp_client: listing.cognitoidp_client,
      // tags: listing.tags ?? ["id:bundle", "type:custom"],
      // digital: true,
      // digital_region: "none",
      // digital_deliverable: listing.digital_deliverable ?? "transfer",
      visibility: "public",
      image_url:
        listing.image_urls && listing.image_urls.length > 0
          ? listing.image_urls[0]
          : null,
      additional_images: listing.additional_images ?? [],
    };

    const response = await axios.post(
      "http://localhost:8000/api/custom-post-listing",
      listingData,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.data.status === "SUCCESS") {
      const listingUrl = response.data.listing_url || `https://gameflip.com/item/${response.data.listing_id}`;
      setCustomUrl([listingUrl]);
      // Here we use an HTML anchor tag so that the link is clickable.
      showAlert(
        `<div className="flex flex-col items-center justify-center w-full "> Successfully created custom listing: ${listing.name}. Check it out here: <br/> <span className="underline text-blue-500/70 text-center"><a href="${listingUrl}" target="_blank" rel="noopener noreferrer">${listingUrl}</a></span></div>`
      );

      setIsCustomModalOpen(false);
      setPhotoPreview(null);
      setPhotoFile(null);
      setUploadedImageUrl(null);
      setTags([]);
    }
  } catch (error: any) {
    console.error(`Error posting custom listing ${listing.name}:`, error);
    const errorMessage =
      error.response?.data?.detail ?? error.message ?? "Failed to create listing";
    showAlert(errorMessage);
  } finally {
    setIsPostingCustom(false);
    setTags([]);
    setPhotoPreview(null);
    setPhotoFile(null);
    setUploadedImageUrl(null);
    setTimeout(() => {
      setCustomUrl([]);
    }, 60000);    
    }
};

  

  // --------------
  // Editing existing Firestore listing
  // --------------

  const handleEditPrice = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    if (!selectedItem) {
      showAlert("No item selected!");
      return;
    }

    const priceInput = (event.currentTarget.elements as any)[
      `price-${selectedItem.id}`
    ]?.value;
    if (!priceInput) {
      showAlert("Price cannot be empty!");
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
        showAlert("The price data is missing. Please refresh the page.");
        return;
      }

      const data = docSnap.data();
      const listings: Listing[] = data.listings ?? [];

      const updatedListings = listings.map((l) =>
        l.id === selectedItem.id ? { ...l, ...updatedListing } : l
      );

      await updateDoc(allListingsRef, { listings: updatedListings });
      showAlert("Price updated successfully!");
      await fetchListings(userID);
    } catch (error: any) {
      console.error("Error updating Price:", error);
      showAlert(error.message);
    }
  };

  const handleEditClick = (item: Listing): void => {
    setSelectedItem(item);
    // Initialize tags from the selected item if available
    if (item.tags && Array.isArray(item.tags)) {
      setListingTags(item.tags);
    } else {
      setListingTags([]);
    }
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setIsUpdating(true);
    if (!selectedItem) return;
  
    const updatedListing: Listing = {
      id: selectedItem.id,
      name: (event.currentTarget.name as any).value,
      price: parseFloat((event.currentTarget.price as any).value ?? "0"),
      shipping_fee: parseFloat((event.currentTarget.shipping_fee as any).value ?? "0"),
      description: (event.currentTarget.description as any).value,
      upc: (event.currentTarget.upc as any).value,
      category: (event.currentTarget.category as any).value,
      digital_deliverable: (event.currentTarget.digital_deliverable as any).value,
      shipping_paid_by: (event.currentTarget.shipping_paid_by as any).value,
      expire_in_days: parseInt((event.currentTarget.expire_in_days as any).value) ?? 0,
      shipping_within_days: parseInt((event.currentTarget.shipping_within_days as any).value) ?? 0,
      visibility: (event.currentTarget.visibility as any).value,
      kind: (event.currentTarget.kind as any).value,
      tags: formTags, // Add the tags from state here
    };
  
    try {
      const allListingsRef = doc(db, "users", userID, "importedListings", "allListings");
      const docSnap = await getDoc(allListingsRef);
  
      if (!docSnap.exists()) {
        console.error("Error: 'allListings' document does not exist.");
        showAlert("The listings data is missing. Please refresh the page.");
        return;
      }
  
      const data = docSnap.data();
      const listings: Listing[] = data.listings ?? [];
  
      const updatedListings = listings.map((l) =>
        l.id === selectedItem.id ? { ...l, ...updatedListing } : l
      );
  
      await updateDoc(allListingsRef, { listings: updatedListings });
      
      showAlert("Listing updated successfully!");
      setIsUpdating(false);
      setIsEditModalOpen(false);
      await fetchListings(userID);
    } catch (error: any) {
      console.error("Error updating listing:", error);
      showAlert(error.message);
    }
  };
  
  
  // Handle input changes
  const handleTagChange = (index, field, value) => {
    const updatedTags = [...tagInputs];
    updatedTags[index] = { ...updatedTags[index], [field]: value };
    setTagInputs(updatedTags);
  };

  // --------------
  // Render
  // --------------
  return (
    <div className="dark min-h-screen bg-background py- text-foreground px-4 md:px-24 lg:px-60">

      {subscriptionDetails && subscriptionDetails.subStatus !== "Active" ? (

        <div className="mx-auto w-full bg-background text-foreground mt-[rem] flex flex-col items-center justify-center gap-5">
          <Card className="mb-4 p-4 w-full">
            <div className="font-bold">
              <div>Subscription Details:</div>
            </div>
            <div className="flex items-center justify-center gap-12">
              <p>Expires: {new Date(subscriptionDetails?.expires_at).toLocaleString()}</p>
              <p>Time Remaining: {timeRemaining}</p>
              <p className="bg-white/90 rounded-md p-2 text-black/70 font-medium">Status: {subscriptionDetails?.subStatus}</p>
            </div>
          </Card>

          <Card className="w-full max-w-[50%] mx-auto">
            <div className="text-3xl font-bold w-full text-center pt-8">
              <h1>Subscription Expired</h1>
            </div>
            <div className="px-4 py-8 text-center ">
              <p className="font-semibold text-lg py-2">Your subscription has expired.</p>
              <p className="font-semibold text-md py-5 flex items-center justify-center gap-3">Visit the page below to activate your subscription. <FaAngleDoubleDown className="mr-2 h-4 w-4" /></p>
              <Link href="/dashboard/subscription" className="">
                <Button 
                    variant="outline" 
                    className={`w-full ${pathname === "/dashboard/subscription" ? "bg-accent text-accent-foreground" : ""}`}
                >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Subscription
                </Button>
            </Link>
            </div>
          </Card>
        </div>

       ) : (

        apiKey === "" || apiSecret === "" ? (
          <div className="w-full flex flex-col justify-center">
          <Card className="mb-4 p-4 w-full">
            <div className="font-bold">
              <div>Subscription Details:</div>
            </div>
            <div className="flex items-center justify-center gap-12">
              <p>Expires: {new Date(subscriptionDetails?.expires_at).toLocaleString()}</p>
              <p>Time Remaining: {timeRemaining}</p>
              <p className="bg-white/90 rounded-md p-2 text-black/70 font-medium">Status: {subscriptionDetails?.subStatus}</p>
            </div>
          </Card>

          <Card className="w-full max-w-[50%] mx-auto">
            <div className="text-3xl font-bold w-full text-center pt-8">
              <h1>Invalid Api Keys</h1>
            </div>
            <div className="px-4 py-8 text-center ">
              <p className="font-semibold text-lg py-2">You haven't provided your Api Keys.</p>
              <p className="font-semibold text-md py-5 flex items-center justify-center gap-3">Visit the settings page to provide your keys. <FaAngleDoubleDown className="mr-2 h-4 w-4" /></p>
              <Link href="/dashboard/settings" className="flex-1">
                <Button 
                    variant="outline" 
                    className={`w-full ${pathname === "/dashboard/settings" ? "bg-accent text-accent-foreground" : ""}`}
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                </Button>
            </Link>
            </div>
          </Card>

          </div>

       ) : (

        <div>
          <h2 className="mb-4 text-xl font-bold text-white">Create New Listing</h2>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4 mx-auto md:mx-1 md:max-w-[70%]">
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
                    disabled={isProcessing ?? isPosting}
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
                    onClick={() => {
                      setIsNumListingModalOpen(true);
                      handleCheckListings();
                    }}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Check Listings
                  </Button>
                </div>
              </Card>
            </div>

            <Card className="border-accent bg-card p-4 w-[100%]">
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
                                  defaultValue={parseFloat(item.price).toFixed(2)}
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
        </div>
      ))}
      
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
              disabled={importUrls.trim() === "" ?? isImporting}
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
                {/* <SelectItem value="expired">Delete expired</SelectItem>
                <SelectItem value="older">Delete older than</SelectItem> */}
                <SelectItem value="all">Delete all</SelectItem>
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
              disabled={!deleteOption ?? isDeleting}
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
              <div className="mb-4" id="image">
                <label className="block font-medium text-white/60">Current Image:</label>
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="mt-2 max-h-48 max-w-full rounded-md shadow"
                  />
                )}
                <div className="mt-2 flex flex-row justify-center items-end gap-3">
                  <div><label htmlFor="custom-photo" className="block font-medium text-white/60">
                    Change Photo:
                  </label>
                  <Input
                    type="file"
                    id="custom-photo"
                    name="photo"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  /></div>
                  <Button variant="default" onClick={() => uploadImage()}>
                    {isUploading ? (
                      <>
                        {/* Spinner icon with animation */}
                        <BiLoaderCircle className="inline-block mr-2 animate-spin" />
                        Uploading Image
                      </>
                    ) : "Upload Image"}
                  </Button>
                </div>
              </div>

              <div className="mb-4" id="name">
                <label htmlFor="custom-name" className="block font-medium text-white/60">
                  Name:
                </label>
                <Input type="text" id="custom-name" name="name" required />
              </div>

              <div className="mb-4" id="price">
                <label htmlFor="custom-price" className="block font-medium text-white/60">
                  Price:
                </label>
                <Input type="number" id="custom-price" name="price" step="0.01" min="10" required />
              </div>

              <div className="mb-4" id="description">
                <label
                  htmlFor="custom-description"
                  className="block font-medium text-white/60"
                >
                  Description:
                </label>
                <Textarea id="custom-description" name="description" required />
              </div>

              {/* <div id="shipping & expire">

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
                      min="1"
                      required
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
                      min="3"
                      required
                    />
                  </div>
                </div>

              </div>

              <div className="mb-4" id="category">
                <label htmlFor="custom-category" className="block font-medium text-white/60">
                  Category:
                </label>
                <Select id="custom-category" name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIGITAL_INGAME">Digital In-Game</SelectItem>
                    <SelectItem value="BLOCKCHAIN_NFT">Blockchain NFT</SelectItem>
                    <SelectItem value="ACCOUNT">Account</SelectItem>
                    <SelectItem value="TOYS_AND_GAMES">Toy and Games</SelectItem>
                    <SelectItem value="VIDEO_GAME_ACCESSORIES">Video Game Accessories</SelectItem>
                    <SelectItem value="VIDEO_GAME_HARDWARE">Video Game Hardware</SelectItem>
                    <SelectItem value="CONSOLE_VIDEO_GAMES">Console Video Games</SelectItem>
                    <SelectItem value="GIFTCARD">Gift Card</SelectItem>
                    <SelectItem value="CREATIVE">Creative</SelectItem>
                    <SelectItem value="KNOWLEDGE">Knowledge</SelectItem>
                    <SelectItem value="BOOSTING">Boosting</SelectItem>
                    <SelectItem value="FUN">Fun</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4" id="digital method">
                <label htmlFor="Digital Method" className="block font-medium text-white/60">
                  Digital Method:
                </label>
                <Select id="Digital Method" name="digital_deliverable"  required>
                  <SelectTrigger>
                    <SelectValue placeholder="Digital Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">Digital Code</SelectItem>
                    <SelectItem value="transfer">Coordinated Transfer</SelectItem>
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
              </div> */}

              <ModalFooter>
                <Button onClick={() => setIsCustomModalOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={isUploading || isPostingCustom || uploadedImageUrl === null}
                  className={isPostingCustom ? "bg-destructive/70" : ""}
                >
                  {isUploading ? (
                    <>
                      {/* Spinner icon with animation */}
                      <BiLoaderCircle className="inline-block mr-2 animate-spin" />
                      Uploading Image
                    </>
                  ) : isPostingCustom ? (
                    "Posting..."
                  ) : (
                    "Post Custom Listing"
                  )}
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
                {selectedItem?.photo && selectedItem.cover_photo !== undefined && (
                  <img  
                    src={selectedItem.photo[selectedItem.cover_photo].view_url}
                    alt="Preview"
                    className="mt-2 max-h-48 max-w-full rounded-md shadow" 
                  />
                )}
                {/* <div className="mt-2">
                  <label htmlFor="custom-photo" className="block font-medium text-white/60">
                    Change Photo:
                  </label>
                  <Input type="file" id="custom-photo" name="photo" accept="image/*" />
                </div> */}
              </div>

              <div className="mb-4">
                <label htmlFor="name" className="block font-medium text-white/60">
                  Name:
                </label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={selectedItem?.name}
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="price" className="block font-medium text-white/60">
                  Price:
                </label>
                <Input
                  type="number"
                  id="price"
                  name="price"
                  // defaultValue={selectedItem?.price}
                  defaultValue={parseFloat(selectedItem?.price).toFixed(2)}
                  step="0.01"
                  min="10"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="shipping_fee" className="block font-medium text-white/60">
                  Shipping Fee:
                </label>
                <Input
                  type="number"
                  id="shipping_fee"
                  name="shipping_fee"
                  defaultValue={selectedItem?.shipping_fee}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="upc" className="block font-medium text-white/60">
                  UPC:
                </label>
                <Input
                  type="text"
                  id="upc"
                  name="upc"
                  defaultValue={selectedItem?.upc}
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="description"
                  className="block font-medium text-white/60"
                >
                  Description:
                </label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={selectedItem?.description}
                  required
                />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="shipping-within-days"
                    className="block font-medium text-white/60"
                  >
                    Shipping in days:
                  </label>
                  <Input
                    type="number"
                    id="shipping-within-days"
                    name="shipping_within_days"
                    defaultValue={selectedItem?.shipping_within_days}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="expire-in-days"
                    className="block font-medium text-white/60"
                  >
                    Expire in days:
                  </label>
                  <Input
                    type="number"
                    id="expire-in-days"
                    name="expire_in_days"
                    defaultValue={selectedItem?.expire_in_days}
                    min="3"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="shipping_paid_by"
                  className="block font-medium text-white/60"
                >
                  Shipping Paid by:
                </label>
                <Select id="shipping_paid_by" name="shipping_paid_by" defaultValue={selectedItem?.shipping_paid_by} required>
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
                <label htmlFor="visibility" className="block font-medium text-white/60">
                  Visibility:
                </label>
                <Select id="visibility" name="visibility" defaultValue={selectedItem?.visibility} required>
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
                <label htmlFor="category" className="block font-medium text-white/60">
                  Category:
                </label>
                <Select
                  id="category"
                  name="category"
                  defaultValue={selectedItem?.category}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIGITAL_INGAME">Digital In-Game</SelectItem>
                    <SelectItem value="BLOCKCHAIN_NFT">Blockchain NFT</SelectItem>
                    <SelectItem value="ACCOUNT">Account</SelectItem>
                    <SelectItem value="TOYS_AND_GAMES">Toy and Games</SelectItem>
                    <SelectItem value="VIDEO_GAME_ACCESSORIES">Video Game Accessories</SelectItem>
                    <SelectItem value="VIDEO_GAME_HARDWARE">Video Game Hardware</SelectItem>
                    <SelectItem value="CONSOLE_VIDEO_GAMES">Console Video Games</SelectItem>
                    <SelectItem value="GIFTCARD">Gift Card</SelectItem>
                    <SelectItem value="CREATIVE">Creative</SelectItem>
                    <SelectItem value="KNOWLEDGE">Knowledge</SelectItem>
                    <SelectItem value="BOOSTING">Boosting</SelectItem>
                    <SelectItem value="FUN">Fun</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <label htmlFor="Digital Method" className="block font-medium text-white/60">
                  Digital Method:
                </label>
                <Select id="Digital Method" name="digital_deliverable" defaultValue={selectedItem?.digital_deliverable} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Digital Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">Digital Code</SelectItem>
                    <SelectItem value="transfer">Coordinated Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <label htmlFor="custom-kind" className="block font-medium text-gray-700">
                  Kind:
                </label>
                <Select id="kind" name="kind" defaultValue={selectedItem?.kind} required>
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
{/* 
              <div className="mb-4 flex flex-col items-center gap-4">
                <label
                    htmlFor="shipping-within-days"
                  className="block font-medium text-white/60 text-left"
                >
                  Tag 1:
                </label>
                <div className="flex items-center justify-center gap-2">
                  <Input
                    type="number"
                    id="id"
                    name="shipping_within_days"
                    defaultValue={selectedItem?.tag[0].id}
                    min="1"
                    required
                  />
                  <Input
                    type="number"
                    id="id-value"
                    name="expire_in_days"
                    defaultValue={selectedItem?.tag[0].other}
                    min="3"
                    required
                  />
                </div>
              </div> */}

              <div className="mb-4">
                <StructuredTagInput 
                  selectedItem={selectedItem} 
                  onTagsChange={handleTagChange} 
                />
              </div>

              <ModalFooter>
                <Button onClick={() => setIsEditModalOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button type="submit" variant="secondary" disabled={isUpdating}>
                  {!isUpdating ? "Save Changes" : "Updating Changes" }
                </Button>
              </ModalFooter>
            </form>
          </div>
        </ModalContent>
      </Modal>

      {/* Alert Modal updated to use alertMessage */}
      <Dialog open={alertModal} onOpenChange={setAlertModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ALERT!</DialogTitle>
          </DialogHeader>
          <div
            className="flex items-center justify-center text-md text-md underline flex-col mx-auto w-full"
            dangerouslySetInnerHTML={{ __html: alertMessage }}
          />
          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
          <div className="flex gap-2">
            {customUrl.length > 0 && (
                  <Button
                    onClick={copyCustomLinks}
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
            <Button onClick={() => setAlertModal(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
