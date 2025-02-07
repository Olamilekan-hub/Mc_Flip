"use client"

import { useState } from "react"
import axios from 'axios';
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { Switch } from "~/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog"
import { Textarea } from "~/components/ui/textarea"
import { Package, Settings, Boxes, CreditCard, Import, Link2, ClipboardList, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"

export function ListingManager() {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteOption, setDeleteOption] = useState<string>("")
  const [daysToDelete, setDaysToDelete] = useState<number>(30)
  const [importUrls, setImportUrls] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  interface ResponseData {
    data?: { id: string; name: string; image_urls: string[]; price?: number }[];
  }

  const [responseData, setResponseData] = useState<ResponseData | null>(null);

  const listings = [
    { id: '1', name: '20k floor launchers', icon: '📦' },
    { id: '2', name: 'MSK MATERIAL BUNDLE', icon: '🎁' },
    { id: '3', name: 'RUSTY MECHANICAL PARTS', icon: '⚙️' },
    { id: '4', name: 'msk and pre-quest carry', icon: '🎮' },
    { id: '5', name: '20k zap-o-max', icon: '⚡' },
    { id: '6', name: 'VENTURE XP 50k', icon: '📈' },
    { id: '7', name: 'STURDY TWINE', icon: '🧵' },
  ]

  const filteredListings = listings.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedItems(listings.map(item => item.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleItemSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id])
    } else {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id))
    }
  }

  let dataResponse = responseData;

  const handlePostListing = async () => {
    setIsProcessing(true);
    try {
      // Example: Posting first selected listing
      if (dataResponse.length === 0) {
        console.log("No listings selected for posting.");
        return;
      }
      console.log(dataResponse)
  
      const selectedListing = listings.find(item => item.id === dataResponse.id);

      // const selectedListing = dataResponse
      console.log(selectedListing);
  
      if (!selectedListing) {
        console.error("Selected listing not found.");
        return;
      }
  
      const listingData = {
        listing: {
          name: selectedListing.name,
          description: "Example description",
          price: 109900,  // Set a dynamic price if needed
          // Add more fields as required by your API
        }
      };
  
      console.log("Posting listing:", listingData);
  
      const response = await axios.post("http://localhost:8000/api/post-listing", dataResponse?.data);
  
      console.log("Listing posted successfully:", response.data);
      alert("Listing created successfully!");
    } catch (error) {
      console.error("Error posting listing:", error);
      alert("Failed to create listing.");
    } finally {
      setIsProcessing(false);
    }
  };
  
 

    const handleImport = async () => {
      setIsImporting(true)
      try {
        const urls = importUrls.split('\n').filter(url => url.trim() !== '')
        console.log(`Importing ${urls.length} URLs:`, urls)

        const response = await axios.post("http://localhost:8000/api/import-listings", { urls });

      // Handle response: Show data and JSON file location
      console.log("Import successful:", response.data);
      // dataResponse = response.data
      setResponseData(response.data);
      console.log(setResponseData)
      console.log(responseData.data[0])


      } catch (error) {
        console.error('Error importing URLs:', error)


      } finally {
        setIsImporting(false)
        setIsImportModalOpen(false)
        setImportUrls("")
      }
    }  

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      switch (deleteOption) {
        case "expired":
          console.log("Deleting expired listings")
          break
        case "older":
          console.log(`Deleting listings older than ${daysToDelete} days`)
          break
        case "all":
          console.log("Deleting all listings")
          break
      }
      await new Promise(resolve => setTimeout(resolve, 1500))
    } catch (error) {
      console.error('Error deleting listings:', error)
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
      setDeleteOption("")
    }
  }

  const handlePostingToggle = async () => {
    setIsProcessing(true)
    try {
      if (!isPosting) {
        // Start posting action
        await startPosting()
        setIsPosting(true)
      } else {
        // Stop posting action
        await stopPosting()
        setIsPosting(false)
      }
    } catch (error) {
      console.error('Error toggling posting:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const startPosting = async () => {
    // Simulate API call or actual posting logic
    await new Promise(resolve => setTimeout(resolve, 1500))
    console.log('Started posting listings')
  }

  const stopPosting = async () => {
    // Simulate API call or actual stopping logic
    await new Promise(resolve => setTimeout(resolve, 1500))
    console.log('Stopped posting listings')
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 dark">
      <h2 className="text-xl font-bold text-white mb-4">Create New Listing</h2>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card className="p-4 bg-card border-accent">
            <div className="space-y-2">
              <Button 
                className={`w-full ${
                  isProcessing 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : isPosting 
                      ? 'bg-destructive hover:bg-destructive/90' 
                      : 'bg-accent hover:bg-accent/90'
                } text-accent-foreground`}
                // onClick={handlePostingToggle}
                onClick={handlePostListing} 
                disabled={isProcessing}
              >
                {isProcessing 
                  ? 'Processing...' 
                  : isPosting 
                    ? 'Stop Posting' 
                    : 'Post Listings'
                }
              </Button>
              <Button className="w-full bg-[#9333EA] hover:bg-[#9333EA]/90 text-white">
                CUSTOM ORDER
              </Button>
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Listings
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-card border-accent">
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => setIsImportModalOpen(true)}>
                <Import className="w-4 h-4 mr-2" />
                Import URL
              </Button>
              <Button variant="outline" className="w-full">
                <Link2 className="w-4 h-4 mr-2" />
                Get Bulk Links
              </Button>
              <Button variant="outline" className="w-full">
                <ClipboardList className="w-4 h-4 mr-2" />
                Check Listings
              </Button>
            </div>
          </Card>
        </div>

        <Card className="p-4 bg-card border-accent">
          <h3 className="text-lg font-semibold text-white mb-4">Available Listings to Post</h3>
          <div className="flex items-center justify-between mb-4">
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
              <label htmlFor="select-all" className="text-sm text-white">Select All</label>
            </div>
          </div>


          <div className="space-y-2">
          {responseData?.data && (
              <div className="space-y-2">
                {responseData.data.map((item: { id: string; name: string; image_urls: string[]; price?: number }) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-2 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-white text-xl"
                  >
                    <Switch
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={(checked) => handleItemSelect(item.id, checked)}
                />
                    <img
                      src={`http://localhost:8000/static/${item.image_urls[0]}`}
                      alt={item.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <span className="text-xl">{item.name}</span>
                    <span>{item.price ? `$${item.price}` : "Price not available"}</span>
                  </div>
                ))}
              </div>
            )}
            
            {filteredListings.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-3 p-2 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-white"
              >
                <Switch
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={(checked) => handleItemSelect(item.id, checked)}
                />
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </div>
            ))}

      
          </div>
        </Card>
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="link" className="text-muted-foreground">
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
            <Button onClick={() => setIsImportModalOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={importUrls.trim() === "" || isImporting}
              className={isImporting ? 'bg-primary/70' : ''}
            >
              {isImporting ? 'Importing...' : `Import (${importUrls.split('\n').filter(url => url.trim() !== '').length})`}
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
                <label htmlFor="days" className="text-sm text-muted-foreground">Days</label>
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
              onClick={handleDelete} 
              variant="destructive"
              disabled={!deleteOption || isDeleting}
              className={isDeleting ? 'bg-destructive/70' : ''}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}